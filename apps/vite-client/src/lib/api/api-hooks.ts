import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from './api-client';

// Query hook
export function useApiQuery<T>(
  key: (string | number | object)[],
  endpoint: string,
  params?: Record<string, string | number | boolean>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => apiClient.get<T>(endpoint, params),
    ...options,
  });
}

// Mutation hook
export function useApiMutation<TData, TVariables = unknown>(
  endpoint: string,
  method: 'post' | 'put' | 'delete',
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => apiClient[method]<TData>(endpoint, variables),
    ...options,
  });
}