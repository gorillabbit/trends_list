import { useState, useEffect } from 'react';
import Header from './components/Header';
import PresetList from './components/PresetList';
import CreatePresetForm from './components/CreatePresetForm';
import { Preset } from './types';
import { useAuth } from '@clerk/clerk-react';

function App() {
	const [presets, setPresets] = useState<Preset[]>([]);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const { isSignedIn, getToken } = useAuth();

	// プリセット一覧取得
	useEffect(() => {
		fetchPresets();
	}, []);

	const fetchPresets = async () => {
		try {
			// このAPIは公開されているのでトークンは不要
			const res = await fetch('/api/presets?sort=likes');
			const data = await res.json();
			setPresets(data.presets || []);
		} catch (err) {
			console.error('Failed to fetch presets:', err);
		}
	};

	const handlePresetCreated = () => {
		setShowCreateForm(false);
		fetchPresets(); // 作成後にリストを再取得して更新
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
					// バックエンドAPIに認証トークンを渡す
					Authorization: `Bearer ${token}`,
				},
			});

			if (res.ok) {
				fetchPresets(); // いいね成功後にリストを再取得してUIを更新
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
		<div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg">
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

export default App;
