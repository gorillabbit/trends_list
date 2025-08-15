import { Preset } from '../types';
import PresetCard from './PresetCard';
import './PresetList.css';

interface PresetListProps {
	presets: Preset[];
	onLike: (presetId: string) => void;
}

export default function PresetList({ presets, onLike }: PresetListProps) {
	if (presets.length === 0) {
		return (
			<div className="preset-list">
				<div className="empty-state">
					<h3>まだプリセットがありません</h3>
					<p>最初のプリセットを作成してみませんか？</p>
				</div>
			</div>
		);
	}

	return (
		<div className="preset-list">
			<h2 className="section-title">人気のプリセット</h2>
			<div className="preset-grid">
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
