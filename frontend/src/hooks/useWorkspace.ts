import { useQuery } from '@tanstack/react-query';
import { getMyWorkspace, type WorkspaceMe } from '@/api/workspace';
import { useAuthStore } from '@/store/auth.store';

export function useWorkspace() {
  const token = useAuthStore((s) => s.token);
  return useQuery<WorkspaceMe>({
    queryKey: ['workspace-me'],
    queryFn: getMyWorkspace,
    enabled: !!token,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}
