import { Preset } from '../types';
import './PresetCard.css';

interface PresetCardProps {
	preset: Preset;
	onLike: (presetId: string) => void;
}

export default function PresetCard({ preset, onLike }: PresetCardProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('ja-JP');
	};

	const handleLike = () => {
		onLike(preset.id);
	};

	const handleViewTrends = () => {
		window.open(preset.npmtrends_url, '_blank');
	};

	// パッケージが文字列の場合はJSONとしてパースする
	const packages =
		typeof preset.packages === 'string'
			? JSON.parse(preset.packages)
			: preset.packages || [];

	return (
		<div className="preset-card">
			<div className="preset-header">
				<h3 className="preset-title">{preset.title}</h3>
				<div className="preset-meta">
					{preset.owner_avatar && (
						<img
							src={preset.owner_avatar}
							alt={preset.owner_name}
							className="owner-avatar"
						/>
					)}
					<span className="owner-name">{preset.owner_name}</span>
					<span className="created-date">
						{formatDate(preset.created_at)}
					</span>
				</div>
			</div>

			<div className="packages">
				{packages.map((pkg: string, index: number) => (
					<span key={index} className="package-tag">
						{pkg}
					</span>
				))}
			</div>

			<div className="preset-actions">
				<button className="like-button" onClick={handleLike}>
					❤️ {preset.likes_count}
				</button>

				<button className="view-button" onClick={handleViewTrends}>
					📈 トレンドを見る
				</button>
			</div>
		</div>
	);
}
