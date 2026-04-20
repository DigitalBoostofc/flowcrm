import { useQuery } from '@tanstack/react-query';
import { getMyFeatures, type MeFeatures } from '@/api/workspace';

export function useFeatures() {
  const query = useQuery<MeFeatures>({
    queryKey: ['me-features'],
    queryFn: getMyFeatures,
    staleTime: 30_000,
  });

  const data = query.data;
  const features = data?.features ?? [];
  const allUnlocked = data?.allUnlocked ?? false;

  const has = (key: string): boolean => {
    if (!data) return true; // default permissivo enquanto carrega; guard de backend ainda protege
    return allUnlocked || features.includes(key);
  };

  return {
    isLoading: query.isLoading,
    planSlug: data?.planSlug ?? null,
    subscriptionStatus: data?.subscriptionStatus,
    features,
    allUnlocked,
    has,
  };
}
