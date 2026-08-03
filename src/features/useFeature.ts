import { useFeatureContext } from './featureContext';

export function useFeature() {
    const { hasFeature, getLimit, loading, refreshFeatures, setShowUpgradeModal } = useFeatureContext();

    const requireFeature = (feature: string) => {
        if (!loading && !hasFeature(feature)) {
            setShowUpgradeModal(true);
            return false;
        }
        return true;
    };

    return {
        hasFeature,
        getLimit,
        requireFeature,
        loading,
        refreshFeatures
    };
}
