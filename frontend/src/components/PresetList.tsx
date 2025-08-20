import { Preset } from '../types';
import { Box, Grid, Typography } from '@mui/material';
import PresetCard from './PresetCard';
import { theme } from '../styles/theme';

interface PresetListProps {
	presets: Preset[];
	onLike: (presetId: string) => void;
}

export default function PresetList({ presets, onLike }: PresetListProps) {
	if (presets.length === 0) {
		return (
			<Box sx={{ textAlign: 'center', py: 6 }}>
				<Typography
					variant="h5"
					color={theme.colors.text.primary}
					sx={{ mb: 1 }}
				>
					まだプリセットがありません
				</Typography>
				<Typography variant="body1" color={theme.colors.text.secondary}>
					最初のプリセットを作成してみませんか？
				</Typography>
			</Box>
		);
	}

	return (
		<Box>
			<Typography
				variant="h4"
				color={theme.colors.text.primary}
				fontWeight="bold"
				sx={{ mb: 3 }}
			>
				人気のプリセット
			</Typography>
			<Grid container spacing={1}>
				{presets.map((preset) => (
					<PresetCard
						key={preset.id}
						preset={preset}
						onLike={onLike}
					/>
				))}
			</Grid>
		</Box>
	);
}
