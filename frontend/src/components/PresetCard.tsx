import { Preset } from '../types';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Button } from '@mui/material';
import { Favorite } from '@mui/icons-material';
import Tag from './ui/Tag';
import Card from './ui/Card';

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
			<Box sx={{ mb: 2 }}>
				<Typography variant="h6" component="h3" sx={{ mb: 1 }}>
					{preset.title}
				</Typography>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					{preset.owner_avatar && (
						<Avatar
							src={preset.owner_avatar}
							alt={preset.owner_name}
							sx={{ width: 20, height: 20 }}
						/>
					)}
					<Typography variant="body2" color="text.secondary">
						{preset.owner_name}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						・
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{formatDate(preset.created_at)}
					</Typography>
				</Box>
			</Box>

			<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
				{packages.map((pkg: string, index: number) => (
					<Tag
						key={index}
						sx={{ cursor: 'pointer' }}
						onClick={(e) => handlePackageClick(e, pkg)}
						title={`${pkg} を使用しているプリセットを見る`}
					>
						{pkg}
					</Tag>
				))}
			</Box>

			<Box>
				<Button
					variant="outlined"
					size="small"
					onClick={handleLike}
					startIcon={<Favorite />}
				>
					{preset.likes_count}
				</Button>
			</Box>
		</Card>
	);
}
