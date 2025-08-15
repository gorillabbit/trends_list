import { Preset } from '../types';

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
		<div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
			<div className="mb-4">
				<h3 className="text-lg font-semibold mb-2">{preset.title}</h3>
				<div className="flex items-center gap-2 text-sm text-gray-400">
					{preset.owner_avatar && (
						<img
							src={preset.owner_avatar}
							alt={preset.owner_name}
							className="w-5 h-5 rounded-full"
						/>
					)}
					<span>{preset.owner_name}</span>
					<span>・</span>
					<span>{formatDate(preset.created_at)}</span>
				</div>
			</div>

			<div className="flex flex-wrap gap-2 mb-4">
				{packages.map((pkg: string, index: number) => (
					<span 
						key={index} 
						className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
					>
						{pkg}
					</span>
				))}
			</div>

			<div className="flex gap-3">
				<button 
					className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
					onClick={handleLike}
				>
					❤️ {preset.likes_count}
				</button>

				<button 
					className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm transition-colors flex-1 text-center"
					onClick={handleViewTrends}
				>
					📈 トレンドを見る
				</button>
			</div>
		</div>
	);
}
