import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import Header from './Header';
import PresetList from './PresetList';
import CreatePresetForm from './CreatePresetForm';
import { Preset } from '../types';
import { useAuth } from '@clerk/clerk-react';

function Home() {
	const [presets, setPresets] = useState<Preset[]>([]);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const { isSignedIn, getToken } = useAuth();

	useEffect(() => {
		fetchPresets();
	}, []);

	const fetchPresets = async () => {
		try {
			const res = await fetch('/api/presets?sort=likes');
			const data = await res.json();
			setPresets(data.presets || []);
		} catch (err) {
			console.error('Failed to fetch presets:', err);
		}
	};

	const handlePresetCreated = () => {
		setShowCreateForm(false);
		fetchPresets();
	};

	const handleLike = async (presetId: string) => {
		if (!isSignedIn) {
			alert('いいねするにはログインが必要です');
			return;
		}

		try {
			const token = await getToken();
			const res = await fetch(`/api/presets/${presetId}/like`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (res.ok) {
				fetchPresets();
			} else {
				const data = await res.json();
				alert(data.error || 'いいねに失敗しました');
			}
		} catch (err) {
			console.error('Failed to like preset:', err);
			alert('いいねに失敗しました');
		}
	};

	return (
		<Box>
			<Header onCreateClick={() => setShowCreateForm(true)} />

			<Container maxWidth="lg" sx={{ py: 4 }}>
				<Box sx={{ textAlign: 'center', mb: 6 }}>
					<Typography variant="h2" component="h1" sx={{ mb: 2 }}>
						NPM Trends Presets
					</Typography>
					<Typography variant="h6" color="text.secondary">
						お気に入りのNPMパッケージの組み合わせを保存・共有しよう
					</Typography>
				</Box>

				{isSignedIn && showCreateForm && (
					<CreatePresetForm
						onPresetCreated={handlePresetCreated}
						onCancel={() => setShowCreateForm(false)}
					/>
				)}

				<PresetList presets={presets} onLike={handleLike} />
			</Container>
		</Box>
	);
}

export default Home;
