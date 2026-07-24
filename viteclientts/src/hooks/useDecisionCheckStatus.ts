import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const DECISION_CHECK_QUERY_KEY = ['decisionCheck'] as const;
const DECISION_CHECK_REFETCH_MS = 60 * 1000;

type DecisionCheckResponse = {
  skip: boolean;
};

function joinApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl || baseUrl === '/') return normalizedPath;
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

export function useDecisionCheckStatus() {
  const queryClient = useQueryClient();
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const endpoint = joinApiUrl(apiUrl, '/decisionCheck');

  const query = useQuery<DecisionCheckResponse>({
    queryKey: DECISION_CHECK_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('decision_check');
      return response.json();
    },
    staleTime: DECISION_CHECK_REFETCH_MS,
    refetchInterval: DECISION_CHECK_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    placeholderData: (previous) => previous,
  });

  const mutation = useMutation<DecisionCheckResponse, Error, boolean>({
    mutationFn: async (skip) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip }),
      });
      if (!response.ok) throw new Error('decision_check');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(DECISION_CHECK_QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: ['schedule', 'next'] });
      void queryClient.invalidateQueries({ queryKey: DECISION_CHECK_QUERY_KEY });
    },
  });

  return {
    query,
    skipDecision: typeof query.data?.skip === 'boolean' ? query.data.skip : null,
    setSkipDecision: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
