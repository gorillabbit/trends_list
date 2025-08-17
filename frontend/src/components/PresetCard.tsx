import { Preset } from '../types';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { Favorite } from '@mui/icons-material';
import Tag from './ui/Tag';
import Card from './ui/Card';
import { theme } from '../styles/theme';

interface PresetCardProps {
	preset: Preset;
	onLike: (presetId: string) => void;
}

export default function PresetCard({ preset, onLike }: PresetCardProps) {
	const navigate = useNavigate();

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('ja-JP');
	};

	const handleLike = (e: React.MouseEvent) => {
		e.stopPropagation();
		onLike(preset.id);
	};

	const handleCardClick = () => {
		window.open(preset.npmtrends_url, '_blank');
	};

	const handlePackageClick = (e: React.MouseEvent, packageName: string) => {
		e.stopPropagation();
		navigate(`/packages/${encodeURIComponent(packageName)}`);
	};

	// パッケージが文字列の場合はJSONとしてパースする
	const packages =
		typeof preset.packages === 'string'
			? JSON.parse(preset.packages)
			: preset.packages || [];

	return (
		<Card variant="clickable" onClick={handleCardClick}>
			<Typography variant="h6" color={theme.colors.text.primary}>
				{preset.title}
			</Typography>
			<Typography variant="body2" color={theme.colors.text.secondary}>
				{formatDate(preset.created_at)}
			</Typography>

			<Box gap={1} mb={2} sx={{ display: 'flex', flexWrap: 'wrap' }}>
				{packages.map((pkg: string, index: number) => (
					<Tag
						key={index}
						onClick={(e) => handlePackageClick(e, pkg)}
						title={`${pkg} を使用しているプリセットを見る`}
					>
						{pkg}
					</Tag>
				))}
			</Box>

			<Button
				variant="outlined"
				size="small"
				color="info"
				onClick={handleLike}
				startIcon={<Favorite />}
			>
				{preset.likes_count}
			</Button>
		</Card>
	);
}
