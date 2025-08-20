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

		// 楽観的更新：APIレスポンス前にUIを更新
		setPresets(prev => prev.map(preset => {
			if (preset.id === presetId) {
				const isCurrentlyLiked = preset.liked || false;
				return {
					...preset,
					liked: !isCurrentlyLiked,
					likes_count: isCurrentlyLiked 
						? (preset.likes_count || 0) - 1 
						: (preset.likes_count || 0) + 1
				};
			}
			return preset;
		}));

		try {
			const result = await execute(
				() => apiClient.post<{ liked: boolean; likes_count: number }>(`/presets/${presetId}/like`, undefined, true),
				{ showAlert: false }
			);
			
			// API結果で最終的に修正
			if (result) {
				setPresets(prev => prev.map(preset => 
					preset.id === presetId 
						? { ...preset, likes_count: result.likes_count, liked: result.liked }
						: preset
				));
			}
		} catch (error) {
			// エラー時は全体を再取得して元に戻す
			console.error('いいね処理でエラーが発生しました:', error);
			fetchPresets();
		}
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
