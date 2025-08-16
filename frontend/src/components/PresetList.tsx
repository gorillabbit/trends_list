import { Preset } from '../types';
import { Box, Typography } from '@mui/material';
import PresetCard from './PresetCard';

interface PresetListProps {
	presets: Preset[];
	onLike: (presetId: string) => void;
}

export default function PresetList({ presets, onLike }: PresetListProps) {
	if (presets.length === 0) {
		return (
			<Box sx={{ textAlign: 'center', py: 6 }}>
				<Typography variant="h5" component="h3" sx={{ mb: 1 }}>
					まだプリセットがありません
				</Typography>
				<Typography variant="body1" color="text.secondary">
					最初のプリセットを作成してみませんか？
				</Typography>
			</Box>
		);
	}

	return (
		<Box>
			<Typography variant="h4">人気のプリセット</Typography>
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: {
						xs: '1fr',
						sm: 'repeat(2, 1fr)',
						md: 'repeat(3, 1fr)',
						lg: 'repeat(4, 1fr)',
					},
					gap: 1,
				}}
			>
				{presets.map((preset) => (
					<PresetCard
						key={preset.id}
						preset={preset}
						onLike={onLike}
					/>
				))}
			</Box>
		</Box>
	);
}
