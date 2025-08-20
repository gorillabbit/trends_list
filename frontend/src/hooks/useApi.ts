import { useState, useCallback } from 'react';

export interface UseApiOptions {
	onSuccess?: () => void;
	onError?: (error: string) => void;
	showAlert?: boolean;
}

export const useApi = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>('');

	const execute = useCallback(
		async <T>(
			apiCall: () => Promise<T>,
			options: UseApiOptions = {}
		): Promise<T | null> => {
			const { onSuccess, onError, showAlert = true } = options;
			
			try {
				setLoading(true);
				setError('');
				const result = await apiCall();
				onSuccess?.();
				return result;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
				setError(errorMessage);
				
				if (showAlert) {
					alert(errorMessage);
				}
				
				onError?.(errorMessage);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	return { execute, loading, error };
};