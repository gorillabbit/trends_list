import { Preset } from '../types';
import { useNavigate } from 'react-router-dom';

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
		<div
			className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
			onClick={handleCardClick}
		>
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
					<button
						key={index}
						className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-md text-sm transition-colors cursor-pointer"
						onClick={(e) => handlePackageClick(e, pkg)}
						title={`${pkg} を使用しているプリセットを見る`}
					>
						{pkg}
					</button>
				))}
			</div>

			<div className="flex gap-3">
				<button
					className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
					onClick={handleLike}
				>
					❤️ {preset.likes_count}
				</button>
			</div>
		</div>
	);
}
