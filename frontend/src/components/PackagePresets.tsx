import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Preset, PackagePresetsResponse, Package, Tag } from '../types';
import PresetCard from './PresetCard';
import TagManager from './TagManager';
import { useAuth } from '@clerk/clerk-react';
import { HomeLink } from './assets/HomeLink';
import { Loading } from './assets/Loading';
import ExternalLink from './ui/ExternalLink';

function PackagePresets() {
	const { packageName } = useParams<{ packageName: string }>();
	const [presets, setPresets] = useState<Preset[]>([]);
	const [packageInfo, setPackageInfo] = useState<Package | null>(null);
	const [relatedPackages, setRelatedPackages] = useState<Package[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');
	const [showTagManager, setShowTagManager] = useState(false);
	const { isSignedIn, getToken } = useAuth();

	useEffect(() => {
		if (packageName) {
			fetchPackagePresets();
			fetchPackageInfo();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [packageName]);

	useEffect(() => {
		if (packageInfo?.tags && packageInfo.tags.length > 0) {
			fetchRelatedPackages();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [packageInfo]);

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

	const fetchRelatedPackages = async () => {
		if (!packageInfo?.tags?.length) return;

		try {
			const tagIds = packageInfo.tags.map((tag) => tag.id);
			const res = await fetch(
				`/api/packages/by-tags?tagIds=${tagIds.join(
					','
				)}&exclude=${encodeURIComponent(packageName!)}`
			);
			if (res.ok) {
				const data = await res.json();
				setRelatedPackages(data.packages || []);
			}
		} catch (err) {
			console.error('Failed to fetch related packages:', err);
		}
	};

	const generateTrendUrl = (packages: string[]) => {
		const packageParams = packages
			.map((pkg) => encodeURIComponent(pkg))
			.join(',');
		return `https://npmtrends.com/${packageParams}`;
	};

	const handleTagsUpdated = (newTags: Tag[]) => {
		if (packageInfo) {
			setPackageInfo({
				...packageInfo,
				tags: newTags,
			});
		}
		// 関連パッケージも再取得
		if (newTags.length > 0) {
			fetchRelatedPackages();
		} else {
			setRelatedPackages([]);
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
		return <Loading />;
	}

	if (error) {
		return <HomeLink />;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<HomeLink />

					<h1 className="text-3xl font-bold mb-4 text-gray-900">
						{packageName} を使用しているプリセット
					</h1>

					{packageInfo && (
						<div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
							<div className="flex justify-between items-start mb-2">
								<h2 className="text-xl font-semibold text-gray-900">
									{packageInfo.name}
								</h2>
								{isSignedIn && (
									<button
										onClick={() => setShowTagManager(true)}
										className="text-blue-600 hover:text-blue-800 text-sm underline flex-shrink-0 ml-2"
									>
										タグを編集
									</button>
								)}
							</div>
							{packageInfo.description && (
								<p className="text-gray-600 mb-3">
									{packageInfo.description}
								</p>
							)}

							<div className="mb-3">
								<div className="flex flex-wrap gap-2 items-center">
									{packageInfo.tags &&
									packageInfo.tags.length > 0 ? (
										packageInfo.tags.map((tag) => (
											<Link
												key={tag.id}
												to={`/tags/${tag.id}`}
												className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity"
												style={{
													backgroundColor: tag.color,
												}}
												title={tag.description}
											>
												{tag.name}
											</Link>
										))
									) : (
										<span className="text-sm text-gray-500 italic">
											タグが設定されていません
										</span>
									)}
								</div>
							</div>

							<div className="flex flex-wrap gap-4 text-sm text-gray-500">
								<span>
									週間ダウンロード数:
									{packageInfo.weekly_downloads?.toLocaleString() ||
										'不明'}
								</span>
								{packageInfo.homepage && (
									<ExternalLink href={packageInfo.homepage}>
										ホームページ
									</ExternalLink>
								)}
								{packageInfo.repository && (
									<ExternalLink href={packageInfo.repository}>
										リポジトリ
									</ExternalLink>
								)}
							</div>
						</div>
					)}
				</div>

				{relatedPackages.length > 0 && (
					<div className="mb-8">
						<h2 className="text-2xl font-bold mb-4 text-gray-900">
							同じタグのパッケージトレンド
						</h2>
						<div className="bg-white rounded-lg p-4 shadow-sm border">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{relatedPackages.slice(0, 9).map((pkg) => (
									<div
										key={pkg.id}
										className="border rounded-lg p-3 hover:shadow-md transition-shadow"
									>
										<div className="flex justify-between items-start mb-2">
											<h3 className="font-semibold text-gray-900 truncate">
												{pkg.name}
											</h3>
											<ExternalLink 
												href={generateTrendUrl([
													packageName!,
													pkg.name,
												])}
												className="text-blue-600 hover:text-blue-800 text-sm underline flex-shrink-0 ml-2"
											>
												比較
											</ExternalLink>
										</div>
										{pkg.description && (
											<p className="text-sm text-gray-600 mb-2 line-clamp-2">
												{pkg.description}
											</p>
										)}
										{pkg.tags && pkg.tags.length > 0 && (
											<div className="flex flex-wrap gap-1 mb-2">
												{pkg.tags
													.slice(0, 3)
													.map((tag) => (
														<Link
															key={tag.id}
															to={`/tags/${tag.id}`}
															className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white hover:opacity-80 transition-opacity"
															style={{
																backgroundColor:
																	tag.color,
															}}
														>
															{tag.name}
														</Link>
													))}
												{pkg.tags.length > 3 && (
													<span className="text-xs text-gray-400">
														+{pkg.tags.length - 3}
													</span>
												)}
											</div>
										)}
										<div className="text-xs text-gray-500">
											週間DL:{' '}
											{pkg.weekly_downloads?.toLocaleString() ||
												'不明'}
										</div>
									</div>
								))}
							</div>
							{relatedPackages.length > 9 && (
								<div className="mt-4 text-center">
									<ExternalLink
										href={generateTrendUrl([
											packageName!,
											...relatedPackages
												.slice(9, 20)
												.map((p) => p.name),
										])}
									>
										さらに多くのパッケージと比較
									</ExternalLink>
								</div>
							)}
						</div>
					</div>
				)}

				{presets.length === 0 ? (
					<div className="text-center text-gray-600">
						<p className="text-lg mb-4">
							{packageName}
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

				{/* タグ管理モーダル */}
				{showTagManager && packageInfo && (
					<TagManager
						packageName={packageName!}
						currentTags={packageInfo.tags || []}
						onTagsUpdated={handleTagsUpdated}
						onClose={() => setShowTagManager(false)}
					/>
				)}
			</div>
		</div>
	);
}

export default PackagePresets;
