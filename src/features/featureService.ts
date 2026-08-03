import { supabase } from '../lib/supabase';
import { Feature, LimitType, PlanFeature, PlanLimit } from './permissions';

/**
 * Fetches the currently enabled features and limits for the user's active subscription.
 */
export async function fetchUserFeaturesAndLimits(userId: string) {
    try {
        // 1. Get the current active subscription's plan_id
        const { data: subData, error: subError } = await supabase
            .from('saas_subscriptions')
            .select('plan_id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (subError || !subData) {
            if (subError && subError.code !== 'PGRST116') {
                console.error('Error fetching subscription:', subError);
            }
            return { features: [], limits: [] };
        }

        const originalPlanId = subData.plan_id;
        let targetFeaturePlanId = originalPlanId;

        const { data: planDoc } = await supabase.from('saas_plans').select('name').eq('id', originalPlanId).single();
        const isTrial = planDoc?.name === 'trial';

        if (isTrial) {
            const { data: premiumPlan } = await supabase.from('saas_plans').select('id').eq('name', 'premium').single();
            if (premiumPlan) {
                targetFeaturePlanId = premiumPlan.id; // Steal features from premium
            }
        }

        // 2. Get features
        const { data: featureData, error: featError } = await supabase
            .from('saas_plan_features')
            .select('feature, enabled')
            .eq('plan_id', targetFeaturePlanId)
            .eq('enabled', true);

        if (featError) console.error('Error fetching features:', featError);

        // 3. Get limits
        let limitsArray: PlanLimit[] = [];

        if (isTrial) {
            // Apply defensive hard limits on trial exactly as requested
            limitsArray = [
                { feature: LimitType.PROPERTY_LIMIT, max_limit: 3 },
                { feature: LimitType.TENANT_LIMIT, max_limit: 3 },
                { feature: LimitType.CONTRACT_LIMIT, max_limit: 3 },
                { feature: LimitType.DOCUMENT_LIMIT, max_limit: 1 }
            ];
        } else {
            const { data: limitData, error: limitError } = await supabase
                .from('saas_plan_limits')
                .select('feature, max_limit')
                .eq('plan_id', originalPlanId);

            if (limitError) console.error('Error fetching limits:', limitError);
            if (limitData) limitsArray = limitData as PlanLimit[];
        }

        return {
            features: (featureData || []) as PlanFeature[],
            limits: limitsArray
        };
    } catch (error) {
        console.error('Unexpected error fetching features:', error);
        return { features: [], limits: [] };
    }
}

/**
 * Direct check on the database (useful for server-side verification if needed).
 */
export async function hasFeatureDirectly(userId: string, feature: Feature): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_feature', { uid: userId, feat: feature });
    if (error) {
        console.error('Error checking feature directly:', error);
        return false;
    }
    return !!data;
}

/**
 * Consumes a limit or validates if there is enough space.
 * For example: if you have 3 properties and the limit is 2, it returns false.
 * You can pass currentUsage which you count through standard Supabase count queries beforehand.
 */
export function validateLimitUsage(limitType: LimitType, maxLimit: number, currentUsage: number): boolean {
    if (maxLimit === -1) return true; // Unlimited
    return currentUsage < maxLimit;
}
