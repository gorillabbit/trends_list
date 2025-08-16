import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Preset, PackagePresetsResponse, Package } from '../types';
import PresetCard from './PresetCard';
import { useAuth } from '@clerk/clerk-react';

function PackagePresets() {
	const { packageName } = useParams<{ packageName: string }>();
	const [presets, setPresets] = useState<Preset[]>([]);
	const [packageInfo, setPackageInfo] = useState<Package | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');
	const { isSignedIn, getToken } = useAuth();

	useEffect(() => {
		if (packageName) {
			fetchPackagePresets();
			fetchPackageInfo();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [packageName]);

	const fetchPackagePresets = async () => {
		try {
			setLoading(true);
			const res = await fetch(
				`/api/packages/${encodeURIComponent(packageName!)}/presets`
			);
			const data: PackagePresetsResponse = await res.json();

			if (res.ok) {
				setPresets(data.presets || []);
			} else {
				setError(data.error || 'プリセットの取得に失敗しました');
			}
		} catch (err) {
			console.error('Failed to fetch package presets:', err);
			setError('プリセットの取得に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	const fetchPackageInfo = async () => {
		try {
			const res = await fetch(
				`/api/packages/${encodeURIComponent(packageName!)}`
			);
			if (res.ok) {
				const data: Package = await res.json();
				setPackageInfo(data);
			}
		} catch (err) {
			console.error('Failed to fetch package info:', err);
		}
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
				fetchPackagePresets();
			} else {
				const data = await res.json();
				alert(data.error || 'いいねに失敗しました');
			}
		} catch (err) {
			console.error('Failed to like preset:', err);
			alert('いいねに失敗しました');
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="container mx-auto px-4 py-8">
					<div className="text-center">
						<div className="text-lg text-gray-600">
							読み込み中...
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="container mx-auto px-4 py-8">
					<div className="text-center">
						<div className="text-red-600 text-lg mb-4">{error}</div>
						<Link
							to="/"
							className="text-blue-600 hover:text-blue-800 underline"
						>
							ホームに戻る
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<Link
						to="/"
						className="text-blue-600 hover:text-blue-800 underline mb-4 inline-block"
					>
						← ホームに戻る
					</Link>

					<h1 className="text-3xl font-bold mb-4 text-gray-900">
						{packageName} を使用しているプリセット
					</h1>

					{packageInfo && (
						<div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
							<h2 className="text-xl font-semibold mb-2 text-gray-900">
								{packageInfo.name}
							</h2>
							{packageInfo.description && (
								<p className="text-gray-600 mb-2">
									{packageInfo.description}
								</p>
							)}
							<div className="flex flex-wrap gap-4 text-sm text-gray-500">
								<span>
									週間ダウンロード数:{' '}
									{packageInfo.weekly_downloads?.toLocaleString() ||
										'不明'}
								</span>
								{packageInfo.homepage && (
									<a
										href={packageInfo.homepage}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:text-blue-800 underline"
									>
										ホームページ
									</a>
								)}
								{packageInfo.repository && (
									<a
										href={packageInfo.repository}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:text-blue-800 underline"
									>
										リポジトリ
									</a>
								)}
							</div>
						</div>
					)}
				</div>

				{presets.length === 0 ? (
					<div className="text-center text-gray-600">
						<p className="text-lg mb-4">
							{packageName}{' '}
							を使用しているプリセットが見つかりませんでした。
						</p>
						<Link
							to="/"
							className="text-blue-600 hover:text-blue-800 underline"
						>
							他のプリセットを見る
						</Link>
					</div>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{presets.map((preset) => (
							<PresetCard
								key={preset.id}
								preset={preset}
								onLike={handleLike}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export default PackagePresets;
