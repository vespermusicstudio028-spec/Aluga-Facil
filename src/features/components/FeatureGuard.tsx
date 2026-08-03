import React, { ReactNode } from 'react';
import { useFeatureContext } from '../featureContext';
import { Feature } from '../permissions';

interface FeatureGuardProps {
    feature: Feature | string;
    children: ReactNode;
    fallback?: ReactNode; // If provided, shows this instead of the modal interception
    hideOnDeny?: boolean; // If true, rendering returns null when denied instead of wrapping or falling back
}

/**
 * Ensures the wrapped component is only active if the user has the specified feature.
 * If fallback is not provided and hideOnDeny is false, the children will render visibly 
 * but clicks will be intercepted to trigger the Upgrade Modal.
 */
export function FeatureGuard({ feature, children, fallback, hideOnDeny = false }: FeatureGuardProps) {
    const { hasFeature, loading, setShowUpgradeModal } = useFeatureContext();

    if (loading) return null; // or a skeleton

    const allowed = hasFeature(feature);

    if (allowed) {
        return <>{children}</>;
    }

    if (hideOnDeny) {
        return null;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    // Intercepting Wrapper: Visibly transparent but blocking interactions.
    // Best suited for buttons where you want them visible but they open the upgrade modal.
    return (
        <div
            className="relative cursor-pointer group"
            onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowUpgradeModal(true);
            }}
        >
            <div className="pointer-events-none opacity-50 transition-opacity">
                {children}
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none z-10 flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Recurso Premium
            </div>
        </div>
    );
}
