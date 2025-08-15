import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface CreatePresetFormProps {
	onPresetCreated: () => void;
	onCancel: () => void;
}

export default function CreatePresetForm({
	onPresetCreated,
	onCancel,
}: CreatePresetFormProps) {
	const [title, setTitle] = useState('');
	const [packageInput, setPackageInput] = useState('');
	const [packages, setPackages] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const { getToken } = useAuth();

	const addPackage = () => {
		const input = packageInput.trim();
		if (!input) return;

		// カンマ区切りで分割
		const newPackages = input
			.split(',')
			.map(pkg => pkg.trim())
			.filter(pkg => pkg && !packages.includes(pkg));

		if (newPackages.length > 0) {
			setPackages([...packages, ...newPackages]);
			setPackageInput('');
		}
	};

	const removePackage = (pkg: string) => {
		setPackages(packages.filter((p) => p !== pkg));
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addPackage();
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim() || packages.length < 2) {
			alert('タイトルと2つ以上のパッケージが必要です');
			return;
		}

		setLoading(true);

		try {
			const token = await getToken();
			const res = await fetch('/api/presets', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					title: title.trim(),
					packages: packages,
				}),
			});

			const data = await res.json();

			if (res.ok) {
				onPresetCreated();
			} else {
				alert(data.error || 'プリセットの作成に失敗しました');
			}
		} catch (err) {
			console.error('Failed to create preset:', err);
			alert('プリセットの作成に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-xl font-semibold">
					新しいプリセットを作成
				</h3>
				<button
					className="text-gray-400 hover:text-white transition-colors"
					onClick={onCancel}
					type="button"
				>
					✕
				</button>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-medium mb-2"
					>
						プリセット名
					</label>
					<input
						id="title"
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="React vs Vue vs Angular"
						maxLength={100}
						required
						className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				<div>
					<label
						htmlFor="package-input"
						className="block text-sm font-medium mb-2"
					>
						パッケージ名
					</label>
					<div className="flex gap-2">
						<input
							id="package-input"
							type="text"
							value={packageInput}
							onChange={(e) => setPackageInput(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="react, vue, angular (カンマ区切りで複数入力可能)"
							className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<button
							type="button"
							onClick={addPackage}
							disabled={!packageInput.trim()}
							className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
						>
							追加
						</button>
					</div>
				</div>

				{packages.length > 0 && (
					<div>
						<label className="block text-sm font-medium mb-2">
							選択されたパッケージ ({packages.length}/10)
						</label>
						<div className="flex flex-wrap gap-2">
							{packages.map((pkg) => (
								<span
									key={pkg}
									className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2"
								>
									{pkg}
									<button
										type="button"
										onClick={() => removePackage(pkg)}
										className="hover:text-red-300 transition-colors"
									>
										✕
									</button>
								</span>
							))}
						</div>
					</div>
				)}

				<div className="flex gap-3 pt-4">
					<button
						type="button"
						onClick={onCancel}
						className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						disabled={
							loading || !title.trim() || packages.length < 2
						}
						className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors flex-1"
					>
						{loading ? '作成中...' : 'プリセット作成'}
					</button>
				</div>
			</form>
		</div>
	);
}
