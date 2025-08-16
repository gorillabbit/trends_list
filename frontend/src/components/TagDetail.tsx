import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tag, Package } from '../types';
import { Loading } from './assets/Loading';
import { HomeLink } from './assets/HomeLink';
import ExternalLink from './ui/ExternalLink';
import { Button, Box, Typography } from '@mui/material';

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
			<Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 2 }}>
				<Typography>タグが見つかりません</Typography>
				<HomeLink />
			</Box>
		);
	}

	const comparisonGroups = generateComparisonGroups(packages);

	return (
		<Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
			<Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
				<Box sx={{ mb: 4 }}>
					<HomeLink />

					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 2,
							mb: 3,
						}}
					>
						<Box
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								px: 2,
								py: 1,
								borderRadius: '50px',
								color: 'white',
								fontSize: '1.1rem',
								fontWeight: 500,
								backgroundColor: tag.color,
							}}
						>
							{tag.name}
						</Box>
						<Box>
							<Typography
								variant="h3"
								component="h1"
								sx={{ fontWeight: 'bold' }}
							>
								{tag.name} タグのパッケージ
							</Typography>
							{tag.description && (
								<Typography
									variant="body1"
									color="text.secondary"
									sx={{ mt: 1 }}
								>
									{tag.description}
								</Typography>
							)}
						</Box>
					</Box>

					{packages.length > 0 && (
						<Box
							sx={{
								bgcolor: 'white',
								borderRadius: 2,
								p: 2,
								mb: 3,
								boxShadow: 1,
							}}
						>
							<Typography
								variant="h5"
								component="h2"
								sx={{ mb: 2, fontWeight: 600 }}
							>
								NPM Trendsで比較
							</Typography>
							<Box
								sx={{
									display: 'flex',
									flexDirection: 'column',
									gap: 1.5,
								}}
							>
								{comparisonGroups.map((group, index) => (
									<Box
										key={index}
										sx={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											p: 1.5,
											bgcolor: 'grey.50',
											borderRadius: 1,
										}}
									>
										<Box>
											<Typography
												variant="body1"
												sx={{ fontWeight: 500 }}
											>
												グループ {index + 1}
												{comparisonGroups.length > 1 &&
													` (${group.length}パッケージ)`}
											</Typography>
											<Typography
												variant="body2"
												color="text.secondary"
											>
												{group
													.map((pkg) => pkg.name)
													.join(', ')}
											</Typography>
										</Box>
										<Button
											variant="contained"
											component="a"
											href={generateTrendUrl(
												group.map((pkg) => pkg.name)
											)}
											target="_blank"
											rel="noopener noreferrer"
											sx={{ textDecoration: 'none' }}
										>
											比較する
										</Button>
									</Box>
								))}
								{packages.length > 10 && (
									<Box sx={{ textAlign: 'center', pt: 1 }}>
										<ExternalLink
											href={generateTrendUrl(
												packages
													.slice(0, 10)
													.map((pkg) => pkg.name)
											)}
										>
											人気上位10パッケージを比較
										</ExternalLink>
									</Box>
								)}
							</Box>
						</Box>
					)}
				</Box>

				{packages.length === 0 ? (
					<Box sx={{ textAlign: 'center', py: 4 }}>
						<Typography variant="h6" sx={{ mb: 2 }}>
							このタグが付いたパッケージが見つかりませんでした。
						</Typography>
						<Link
							to="/"
							style={{
								color: '#2563eb',
								textDecoration: 'underline',
							}}
						>
							他のタグを見る
						</Link>
					</Box>
				) : (
					<Box>
						<Typography
							variant="h4"
							component="h2"
							sx={{ mb: 2, fontWeight: 'bold' }}
						>
							パッケージ一覧 ({packages.length}件)
						</Typography>
						<Box
							sx={{
								display: 'grid',
								gap: 2,
								gridTemplateColumns: {
									xs: '1fr',
									md: 'repeat(2, 1fr)',
									lg: 'repeat(3, 1fr)',
								},
							}}
						>
							{packages.map((pkg) => (
								<div key={pkg.id} className="package-card">
									<div className="package-header">
										<Link
											to={`/packages/${pkg.name}`}
											className="package-name"
										>
											{pkg.name}
										</Link>
										<ExternalLink
											href={`https://npmtrends.com/${encodeURIComponent(
												pkg.name
											)}`}
											className="trend-link"
										>
											トレンド
										</ExternalLink>
									</div>

									{pkg.description && (
										<p className="package-description">
											{pkg.description}
										</p>
									)}

									{pkg.tags && pkg.tags.length > 0 && (
										<div>
											{pkg.tags.slice(0, 3).map((tag) => (
												<Link
													key={tag.id}
													to={`/tags/${tag.id}`}
													style={{
														backgroundColor:
															tag.color,
													}}
												>
													{tag.name}
												</Link>
											))}
											{pkg.tags.length > 3 && (
												<span className="more-tags">
													+{pkg.tags.length - 3}
												</span>
											)}
										</div>
									)}

									<div className="package-stats">
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
						</Box>
					</Box>
				)}
			</Box>
		</Box>
	);
}

export default TagDetail;
