import { useState, useEffect } from 'react';
import { Package } from '../types';
import { createApiClient } from '../services/api';
import { useApi } from './useApi';

export function usePackages() {
	const [packages, setPackages] = useState<Package[]>([]);
	const [error, setError] = useState<string>('');
	const apiClient = createApiClient();
	const { execute, loading } = useApi();

	const fetchPackages = async () => {
		const result = await execute(
			() => apiClient.get<{ packages: Package[] }>('/packages'),
			{
				showAlert: false,
				onError: (error) => setError(error)
			}
		);
		if (result) {
			setPackages(result.packages || []);
		}
	};

	useEffect(() => {
		fetchPackages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// パッケージ名でフィルタリング
	const filterPackages = (query: string): string[] => {
		if (!query.trim()) return [];
		
		const lowerQuery = query.toLowerCase();
		return packages
			.filter(pkg => pkg.name.toLowerCase().includes(lowerQuery))
			.map(pkg => pkg.name)
			.slice(0, 10); // 上位10件まで
	};

	return {
		packages,
		loading,
		error,
		filterPackages
	};
}