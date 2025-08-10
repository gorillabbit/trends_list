import { useState, useEffect } from 'react'
import Header from './components/Header'
import PresetList from './components/PresetList'
import CreatePresetForm from './components/CreatePresetForm'
import { User, Preset } from './types'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [presets, setPresets] = useState<Preset[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)

  // ユーザー情報取得
  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user)
        }
      })
      .catch(err => console.error('Failed to fetch user:', err))
      .finally(() => setLoading(false))
  }, [])

  // プリセット一覧取得
  useEffect(() => {
    fetchPresets()
  }, [])

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets?sort=likes')
      const data = await res.json()
      setPresets(data.presets || [])
    } catch (err) {
      console.error('Failed to fetch presets:', err)
    }
  }

  const handlePresetCreated = (newPreset: Preset) => {
    setPresets(prev => [newPreset, ...prev])
    setShowCreateForm(false)
  }

  const handleLike = async (presetId: string) => {
    if (!user) {
      alert('いいねするにはログインが必要です')
      return
    }

    try {
      const res = await fetch(`/api/presets/${presetId}/like`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        // プリセット一覧を更新
        setPresets(prev => prev.map(preset => 
          preset.id === presetId 
            ? { ...preset, likes_count: data.likes_count, liked: data.liked }
            : preset
        ))
      } else {
        alert(data.error || 'いいねに失敗しました')
      }
    } catch (err) {
      console.error('Failed to like preset:', err)
      alert('いいねに失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header 
        user={user} 
        onCreateClick={() => setShowCreateForm(!showCreateForm)}
      />
      
      <main className="container">
        <div className="hero">
          <h1>NPM Trends Presets</h1>
          <p>お気に入りのNPMパッケージの組み合わせを保存・共有しよう</p>
        </div>

        {showCreateForm && user && (
          <CreatePresetForm 
            onPresetCreated={handlePresetCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        <PresetList 
          presets={presets}
          user={user}
          onLike={handleLike}
        />
      </main>
    </div>
  )
}

export default App