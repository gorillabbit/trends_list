import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import PresetList from './PresetList';
import { Preset } from '../types';
import { useAuth } from '@clerk/clerk-react';
import { theme } from '../styles/theme';
import { createApiClient } from '../services/api';
import { useApi } from '../hooks/useApi';

function Home() {
	const [presets, setPresets] = useState<Preset[]>([]);
	const { isSignedIn, getToken } = useAuth();
	const apiClient = createApiClient(getToken);
	const { execute } = useApi();

	const fetchPresets = async () => {
		const result = await execute(
			() => apiClient.get<{ presets: Preset[] }>('/presets?sort=likes'),
			{ showAlert: false }
		);
		if (result) {
			setPresets(result.presets || []);
		}
	};

	useEffect(() => {
		fetchPresets();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleLike = async (presetId: string) => {
		if (!isSignedIn) {
			alert('いいねするにはログインが必要です');
			return;
		}

		await execute(
			() => apiClient.post(`/presets/${presetId}/like`, undefined, true),
			{ onSuccess: fetchPresets }
		);
	};

	return (
		<Container sx={{ py: 4 }}>
			<Box sx={{ textAlign: 'center', mb: 6 }}>
				<Typography variant="h2" fontWeight="bold">
					NPM Trends Presets
				</Typography>
				<Typography variant="h6" color={theme.colors.text.secondary}>
					お気に入りのNPMパッケージの組み合わせを保存・共有しよう
				</Typography>
			</Box>

			<PresetList presets={presets} onLike={handleLike} />
		</Container>
	);
}

export default Home;
