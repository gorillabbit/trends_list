import { User, Preset } from '../types'
import PresetCard from './PresetCard'
import './PresetList.css'

interface PresetListProps {
  presets: Preset[]
  user: User | null
  onLike: (presetId: string) => void
}

export default function PresetList({ presets, user, onLike }: PresetListProps) {
  if (presets.length === 0) {
    return (
      <div className="preset-list">
        <div className="empty-state">
          <h3>まだプリセットがありません</h3>
          <p>最初のプリセットを作成してみませんか？</p>
        </div>
      </div>
    )
  }

  return (
    <div className="preset-list">
      <h2 className="section-title">人気のプリセット</h2>
      <div className="preset-grid">
        {presets.map(preset => (
          <PresetCard
            key={preset.id}
            preset={preset}
            user={user}
            onLike={onLike}
          />
        ))}
      </div>
    </div>
  )
}