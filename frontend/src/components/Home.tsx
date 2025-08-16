import { useState, useEffect } from 'react';
import Header from './Header';
import PresetList from './PresetList';
import CreatePresetForm from './CreatePresetForm';
import { Preset } from '../types';
import { useAuth } from '@clerk/clerk-react';

function Home() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets?sort=likes');
      const data = await res.json();
      setPresets(data.presets || []);
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    }
  };

  const handlePresetCreated = () => {
    setShowCreateForm(false);
    fetchPresets();
  };

  const handleLike = async (presetId: string) => {
    if (!isSignedIn) {
      alert('いいねするにはログインが必要です');
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`/api/presets/${presetId}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchPresets();
      } else {
        const data = await res.json();
        alert(data.error || 'いいねに失敗しました');
      }
    } catch (err) {
      console.error('Failed to like preset:', err);
      alert('いいねに失敗しました');
    }
  };

  return (
    <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg max-w-6xl mx-auto my-8">
      <Header onCreateClick={() => setShowCreateForm(true)} />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            NPM Trends Presets
          </h1>
          <p className="text-gray-400 text-lg">
            お気に入りのNPMパッケージの組み合わせを保存・共有しよう
          </p>
        </div>

        {isSignedIn && showCreateForm && (
          <CreatePresetForm
            onPresetCreated={handlePresetCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        <PresetList presets={presets} onLike={handleLike} />
      </main>
    </div>
  );
}

export default Home;