import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tag, Package } from '../types';
import { Loading } from './assets/Loading';
import { HomeLink } from './assets/HomeLink';
import ExternalLink from './ui/ExternalLink';

function TagDetail() {
	const { tagId } = useParams<{ tagId: string }>();
	const [tag, setTag] = useState<Tag | null>(null);
	const [packages, setPackages] = useState<Package[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		if (tagId) {
			fetchTagDetail();
			fetchTagPackages();
		}
	}, [tagId]);

	const fetchTagDetail = async () => {
		try {
			const res = await fetch(`/api/tags/${encodeURIComponent(tagId!)}`);
			if (res.ok) {
				const data: Tag = await res.json();
				setTag(data);
			} else {
				setError('タグが見つかりません');
			}
		} catch (err) {
			console.error('Failed to fetch tag detail:', err);
			setError('タグの取得に失敗しました');
		}
	};

	const fetchTagPackages = async () => {
		try {
			setLoading(true);
			const res = await fetch(
				`/api/packages/by-tags?tagIds=${encodeURIComponent(
					tagId!
				)}&limit=50`
			);
			if (res.ok) {
				const data = await res.json();
				setPackages(data.packages || []);
			} else {
				setError('パッケージの取得に失敗しました');
			}
		} catch (err) {
			console.error('Failed to fetch tag packages:', err);
			setError('パッケージの取得に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	const generateTrendUrl = (packageNames: string[]) => {
		if (packageNames.length === 0) return '';
		const packageParams = packageNames
			.map((pkg) => encodeURIComponent(pkg))
			.join(',');
		return `https://npmtrends.com/${packageParams}`;
	};

	const generateComparisonGroups = (packages: Package[]) => {
		const groups = [];
		const maxPerGroup = 10; // npmtrendsの制限に合わせて調整

		for (let i = 0; i < packages.length; i += maxPerGroup) {
			const group = packages.slice(i, i + maxPerGroup);
			groups.push(group);
		}

		return groups;
	};

	if (loading) {
		return <Loading />;
	}

	if (error) {
		return <HomeLink />;
	}

	if (!tag) {
		return (
			<div className="min-h-screen bg-gray-50">
				タグが見つかりません
				<HomeLink />
			</div>
		);
	}

	const comparisonGroups = generateComparisonGroups(packages);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<HomeLink />

					<div className="flex items-center gap-4 mb-6">
						<span
							className="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium text-white"
							style={{ backgroundColor: tag.color }}
						>
							{tag.name}
						</span>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								{tag.name} タグのパッケージ
							</h1>
							{tag.description && (
								<p className="text-gray-600 mt-2">
									{tag.description}
								</p>
							)}
						</div>
					</div>

					{packages.length > 0 && (
						<div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
							<h2 className="text-xl font-semibold mb-4 text-gray-900">
								NPM Trendsで比較
							</h2>
							<div className="space-y-3">
								{comparisonGroups.map((group, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
									>
										<div>
											<div className="font-medium text-gray-900">
												グループ {index + 1}
												{comparisonGroups.length > 1 &&
													` (${group.length}パッケージ)`}
											</div>
											<div className="text-sm text-gray-600">
												{group
													.map((pkg) => pkg.name)
													.join(', ')}
											</div>
										</div>
										<ExternalLink
											href={generateTrendUrl(
												group.map((pkg) => pkg.name)
											)}
											className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
										>
											比較する
										</ExternalLink>
									</div>
								))}
								{packages.length > 10 && (
									<div className="text-center pt-2">
										<ExternalLink
											href={generateTrendUrl(
												packages
													.slice(0, 10)
													.map((pkg) => pkg.name)
											)}
										>
											人気上位10パッケージを比較
										</ExternalLink>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{packages.length === 0 ? (
					<div className="text-center text-gray-600">
						<p className="text-lg mb-4">
							このタグが付いたパッケージが見つかりませんでした。
						</p>
						<Link
							to="/"
							className="text-blue-600 hover:text-blue-800 underline"
						>
							他のタグを見る
						</Link>
					</div>
				) : (
					<div>
						<h2 className="text-2xl font-bold mb-4 text-gray-900">
							パッケージ一覧 ({packages.length}件)
						</h2>
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{packages.map((pkg) => (
								<div
									key={pkg.id}
									className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow"
								>
									<div className="flex justify-between items-start mb-2">
										<Link
											to={`/packages/${pkg.name}`}
											className="font-semibold text-gray-900 hover:text-blue-600 truncate"
										>
											{pkg.name}
										</Link>
										<ExternalLink
											href={`https://npmtrends.com/${encodeURIComponent(
												pkg.name
											)}`}
											className="text-blue-600 hover:text-blue-800 text-sm underline flex-shrink-0 ml-2"
										>
											トレンド
										</ExternalLink>
									</div>

									{pkg.description && (
										<p className="text-sm text-gray-600 mb-3 line-clamp-2">
											{pkg.description}
										</p>
									)}

									{pkg.tags && pkg.tags.length > 0 && (
										<div className="flex flex-wrap gap-1 mb-2">
											{pkg.tags.slice(0, 3).map((tag) => (
												<Link
													key={tag.id}
													to={`/tags/${tag.id}`}
													className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white hover:opacity-80"
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

									<div className="flex justify-between items-center text-xs text-gray-500">
										<span>
											週間DL:
											{pkg.weekly_downloads?.toLocaleString() ||
												'不明'}
										</span>
										{pkg.homepage && (
											<ExternalLink href={pkg.homepage}>
												HP
											</ExternalLink>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default TagDetail;
