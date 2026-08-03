import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Feature, LimitType, PlanFeature, PlanLimit } from './permissions';
import { fetchUserFeaturesAndLimits } from './featureService';

interface FeatureContextType {
    features: PlanFeature[];
    limits: PlanLimit[];
    loading: boolean;
    hasFeature: (feature: Feature | string) => boolean;
    getLimit: (limitType: LimitType | string) => number;
    refreshFeatures: () => Promise<void>;
    showUpgradeModal: boolean;
    setShowUpgradeModal: (show: boolean) => void;
}

const FeatureContext = createContext<FeatureContextType>({
    features: [],
    limits: [],
    loading: true,
    hasFeature: () => false,
    getLimit: () => 0,
    refreshFeatures: async () => { },
    showUpgradeModal: false,
    setShowUpgradeModal: () => { }
});

export function FeatureProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [features, setFeatures] = useState<PlanFeature[]>([]);
    const [limits, setLimits] = useState<PlanLimit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const loadFeatures = async () => {
        if (!user) {
            setFeatures([]);
            setLimits([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const data = await fetchUserFeaturesAndLimits(user.uid);
        setFeatures(data.features);
        setLimits(data.limits);
        setLoading(false);
    };

    useEffect(() => {
        loadFeatures();
    }, [user]);

    const hasFeature = (feature: Feature | string) => {
        // Admins have everything basically, but let's stick to true FF principles:
        // If we want admin to bypass, we check here. For now, we trust the DB mapping.
        if (user?.role === 'admin') return true;
        return features.some(f => f.feature === feature && f.enabled);
    };

    const getLimit = (limitType: LimitType | string) => {
        if (user?.role === 'admin') return -1; // unlimited for admin
        const limitObj = limits.find(l => l.feature === limitType);
        return limitObj ? limitObj.max_limit : 0;
    };

    return (
        <FeatureContext.Provider value={{
            features,
            limits,
            loading,
            hasFeature,
            getLimit,
            refreshFeatures: loadFeatures,
            showUpgradeModal,
            setShowUpgradeModal
        }}>
            {children}
        </FeatureContext.Provider>
    );
}

export const useFeatureContext = () => useContext(FeatureContext);
