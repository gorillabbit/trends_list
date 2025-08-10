import { useState } from 'react'
import { Preset } from '../types'
import './CreatePresetForm.css'

interface CreatePresetFormProps {
  onPresetCreated: (preset: Preset) => void
  onCancel: () => void
}

export default function CreatePresetForm({ onPresetCreated, onCancel }: CreatePresetFormProps) {
  const [title, setTitle] = useState('')
  const [packageInput, setPackageInput] = useState('')
  const [packages, setPackages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  // const [turnstileToken, setTurnstileToken] = useState<string>('')

  const addPackage = () => {
    const pkg = packageInput.trim()
    if (pkg && !packages.includes(pkg)) {
      setPackages([...packages, pkg])
      setPackageInput('')
    }
  }

  const removePackage = (pkg: string) => {
    setPackages(packages.filter(p => p !== pkg))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPackage()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || packages.length < 2) {
      alert('タイトルと2つ以上のパッケージが必要です')
      return
    }

    setLoading(true)

    try {
      // Turnstile検証（本番環境では有効化）
      // if (turnstileToken) {
      //   const turnstileRes = await fetch('/api/verify-turnstile', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ token: turnstileToken }),
      //   })
      //   if (!turnstileRes.ok) {
      //     alert('スパム防止チェックに失敗しました')
      //     return
      //   }
      // }

      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          packages: packages,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        // 成功時にプリセット情報を整形
        const newPreset: Preset = {
          id: data.id,
          title: data.title,
          packages: data.packages,
          npmtrends_url: data.npmtrends_url,
          owner_id: '',
          likes_count: 0,
          created_at: new Date().toISOString(),
          liked: false,
        }
        onPresetCreated(newPreset)
        
        // フォームリセット
        setTitle('')
        setPackages([])
        setPackageInput('')
      } else {
        alert(data.error || 'プリセットの作成に失敗しました')
      }
    } catch (err) {
      console.error('Failed to create preset:', err)
      alert('プリセットの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-form">
      <div className="form-header">
        <h3>新しいプリセットを作成</h3>
        <button className="cancel-button" onClick={onCancel} type="button">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">プリセット名</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="React vs Vue vs Angular"
            maxLength={100}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="package-input">パッケージ名</label>
          <div className="package-input-container">
            <input
              id="package-input"
              type="text"
              value={packageInput}
              onChange={(e) => setPackageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="react, vue, angular..."
            />
            <button type="button" onClick={addPackage} disabled={!packageInput.trim()}>
              追加
            </button>
          </div>
        </div>

        {packages.length > 0 && (
          <div className="packages-preview">
            <label>選択されたパッケージ ({packages.length}/10)</label>
            <div className="packages-list">
              {packages.map(pkg => (
                <span key={pkg} className="package-tag">
                  {pkg}
                  <button type="button" onClick={() => removePackage(pkg)}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Turnstileウィジェット（本番環境では有効化）
        <div className="form-group">
          <div 
            className="cf-turnstile" 
            data-sitekey="your-site-key"
            data-callback="onTurnstileCallback"
          ></div>
        </div>
        */}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            キャンセル
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading || !title.trim() || packages.length < 2}
          >
            {loading ? '作成中...' : 'プリセット作成'}
          </button>
        </div>
      </form>
    </div>
  )
}