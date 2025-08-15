import { Preset } from '../types';
import PresetCard from './PresetCard';

interface PresetListProps {
	presets: Preset[];
	onLike: (presetId: string) => void;
}

export default function PresetList({ presets, onLike }: PresetListProps) {
	if (presets.length === 0) {
		return (
			<div className="text-center py-12">
				<h3 className="text-xl font-semibold mb-2">
					まだプリセットがありません
				</h3>
				<p className="text-gray-400">
					最初のプリセットを作成してみませんか？
				</p>
			</div>
		);
	}

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">人気のプリセット</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{presets.map((preset) => (
					<PresetCard
						key={preset.id}
						preset={preset}
						onLike={onLike}
					/>
				))}
			</div>
		</div>
	);
}
