import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid } from '@mui/material';
import { Tag as TagType, Package } from '../types';
import { Loading } from './ui/Loading';
import ExternalLink from './ui/ExternalLink';
import Tag from './ui/Tag';
import Card from './ui/Card';
import { theme } from '../styles/theme';

function TagDetail() {
	const { tagId } = useParams<{ tagId: string }>();
	const [tag, setTag] = useState<TagType | null>(null);
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
				const data: TagType = await res.json();
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
		if (packageNames.length === 1) {
			return `https://npmtrends.com/${encodeURIComponent(
				packageNames[0]
			)}`;
		}
		const packageParams = packageNames
			.map((pkg) => encodeURIComponent(pkg))
			.join('-vs-');
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

	if (error || !tag) {
		return;
	}

	const comparisonGroups = generateComparisonGroups(packages);

	return (
		<Container sx={{ py: 4 }}>
			<Box display="flex" flexDirection="column" gap={0.5} sx={{ mb: 4 }}>
				<Typography variant="h3" fontWeight="bold">
					<Tag color={tag.color}>{tag.name}</Tag>
					のパッケージ
				</Typography>
				<Typography variant="body1" color={theme.colors.text.secondary}>
					{tag.description}
				</Typography>

				{packages.length > 0 && (
					<Card sx={{ mb: 4 }}>
						<Typography variant="h5" sx={{ mb: 3 }}>
							NPM Trendsで比較
						</Typography>
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								gap: 2,
							}}
						>
							{comparisonGroups.map((group, index) => (
								<Box
									key={index}
									sx={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										p: 2,
										backgroundColor:
											theme.colors.background.secondary,
										borderRadius: theme.borderRadius.md,
									}}
								>
									<Typography variant="body1">
										グループ {index + 1}
										{comparisonGroups.length > 1 &&
											` (${group.length}パッケージ)`}
									</Typography>
									<Typography
										variant="body2"
										color={theme.colors.text.secondary}
									>
										{group
											.map((pkg) => pkg.name)
											.join(', ')}
									</Typography>
									<Button
										variant="contained"
										href={generateTrendUrl(
											group.map((pkg) => pkg.name)
										)}
									>
										比較する
									</Button>
								</Box>
							))}
							{packages.length > 10 && (
								<Box sx={{ textAlign: 'center', pt: 2 }}>
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
					</Card>
				)}
			</Box>

			{packages.length === 0 ? (
				<Box sx={{ textAlign: 'center' }}>
					<Typography
						variant="h5"
						color={theme.colors.text.secondary}
						sx={{ mb: 2 }}
					>
						このタグが付いたパッケージが見つかりませんでした。
					</Typography>
					<Link
						to="/tags"
						style={{
							color: theme.colors.accent.primary,
							textDecoration: 'underline',
						}}
					>
						他のタグを見る
					</Link>
				</Box>
			) : (
				<>
					<Typography
						variant="h4"
						color={theme.colors.text.primary}
						sx={{ mb: 3 }}
					>
						パッケージ一覧 ({packages.length}件)
					</Typography>
					<Grid container spacing={1}>
						{packages.map((pkg) => (
							<Card
								variant="hover"
								sx={{ height: '100%' }}
								key={pkg.id}
							>
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'start',
									}}
								>
									<Link
										to={`/packages/${pkg.name}`}
										style={{
											color: theme.colors.text.primary,
											textDecoration: 'none',
											fontWeight: '600',
											fontSize: '1.125rem',
										}}
									>
										{pkg.name}
									</Link>
									<ExternalLink
										href={`https://npmtrends.com/${encodeURIComponent(
											pkg.name
										)}`}
									>
										トレンド
									</ExternalLink>
								</Box>

								<Typography
									variant="body2"
									color={theme.colors.text.secondary}
								>
									{pkg.description}
								</Typography>

								{pkg.tags && pkg.tags.length > 0 && (
									<Box
										sx={{
											display: 'flex',
											flexWrap: 'wrap',
											gap: 0.5,
											mb: 1,
										}}
									>
										{pkg.tags.slice(0, 3).map((tag) => (
											<Link
												key={tag.id}
												to={`/tags/${tag.id}`}
											>
												<Tag color={tag.color}>
													{tag.name}
												</Tag>
											</Link>
										))}
										{pkg.tags.length > 3 && (
											<Typography
												color={theme.colors.text.muted}
											>
												+{pkg.tags.length - 3}
											</Typography>
										)}
									</Box>
								)}

								<Box
									sx={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<Typography
										variant="caption"
										color={theme.colors.text.secondary}
									>
										週間DL:
										{pkg.weekly_downloads?.toLocaleString() ||
											'不明'}
									</Typography>
									{pkg.homepage && (
										<ExternalLink href={pkg.homepage}>
											HP
										</ExternalLink>
									)}
								</Box>
							</Card>
						))}
					</Grid>
				</>
			)}
		</Container>
	);
}

export default TagDetail;
