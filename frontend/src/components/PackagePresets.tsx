import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid } from '@mui/material';
import {
	Preset,
	PackagePresetsResponse,
	Package,
	Tag as TagType,
} from '../types';
import PresetCard from './PresetCard';
import TagManager from './TagManager';
import { useAuth } from '@clerk/clerk-react';
import { Loading } from './ui/Loading';
import ExternalLink from './ui/ExternalLink';
import Tag from './ui/Tag';
import Card from './ui/Card';
import { theme } from '../styles/theme';
import { createApiClient } from '../services/api';
import { useApi } from '../hooks/useApi';

function PackagePresets() {
	const { packageName } = useParams<{ packageName: string }>();
	const [presets, setPresets] = useState<Preset[]>([]);
	const [packageInfo, setPackageInfo] = useState<Package | null>(null);
	const [relatedPackages, setRelatedPackages] = useState<Package[]>([]);
	const [initialLoading, setInitialLoading] = useState(true);
	const [error, setError] = useState<string>('');
	const [showTagManager, setShowTagManager] = useState(false);
	const { isSignedIn, getToken } = useAuth();
	const apiClient = createApiClient(getToken);
	const { execute } = useApi();

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
		setInitialLoading(true);
		const result = await execute(
			() => apiClient.get<PackagePresetsResponse>(`/packages/${encodeURIComponent(packageName!)}/presets`),
			{
				showAlert: false,
				onError: (error) => setError(error)
			}
		);
		if (result) {
			setPresets(result.presets || []);
		}
		setInitialLoading(false);
	};

	const fetchPackageInfo = async () => {
		const result = await execute(
			() => apiClient.get<Package>(`/packages/${encodeURIComponent(packageName!)}`),
			{ showAlert: false }
		);
		if (result) {
			setPackageInfo(result);
		}
	};

	const fetchRelatedPackages = async () => {
		if (!packageInfo?.tags?.length) return;

		const tagIds = packageInfo.tags.map((tag) => tag.id);
		const result = await execute(
			() => apiClient.get<{ packages: Package[] }>(`/packages/by-tags?tagIds=${tagIds.join(',')}&exclude=${encodeURIComponent(packageName!)}`),
			{ showAlert: false }
		);
		if (result) {
			setRelatedPackages(result.packages || []);
		}
	};

	const generateTrendUrl = (packages: string[]) => {
		const packageParams = packages
			.map((pkg) => encodeURIComponent(pkg))
			.join(',');
		return `https://npmtrends.com/${packageParams}`;
	};

	const handleTagsUpdated = (newTags: TagType[]) => {
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

		await execute(
			() => apiClient.post(`/presets/${presetId}/like`, undefined, true),
			{ onSuccess: fetchPackagePresets }
		);
	};

	if (initialLoading) {
		return <Loading />;
	}

	if (error) {
		return;
	}

	return (
		<Container sx={{ py: 4 }}>
			<Box sx={{ mb: 4 }}>
				<Typography
					variant="h3"
					color={theme.colors.text.primary}
					fontWeight="bold"
					sx={{ mb: 3 }}
				>
					{packageName} を使用しているプリセット
				</Typography>

				{packageInfo && (
					<Card sx={{ gap: 1 }}>
						<Box
							sx={{
								display: 'flex',
								justifyContent: 'space-between',
							}}
						>
							<Typography
								variant="h5"
								color={theme.colors.text.primary}
							>
								{packageInfo.name}
							</Typography>
							{isSignedIn && (
								<Button
									onClick={() => setShowTagManager(true)}
									variant="contained"
								>
									タグを編集
								</Button>
							)}
						</Box>

						<Typography
							variant="body1"
							color={theme.colors.text.secondary}
							sx={{ mb: 2 }}
						>
							{packageInfo.description}
						</Typography>

						<Box sx={{ mb: 2 }}>
							<Box
								sx={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 1,
								}}
							>
								{packageInfo.tags &&
								packageInfo.tags.length > 0 ? (
									packageInfo.tags.map((tag) => (
										<Link
											key={tag.id}
											to={`/tags/${tag.id}`}
										>
											<Tag
												color={tag.color}
												title={tag.description}
											>
												{tag.name}
											</Tag>
										</Link>
									))
								) : (
									<Typography
										variant="body2"
										color={theme.colors.text.muted}
									>
										タグが設定されていません
									</Typography>
								)}
							</Box>
						</Box>

						<Box
							sx={{
								display: 'flex',
								flexWrap: 'wrap',
								gap: 2,
								color: theme.colors.text.secondary,
							}}
						>
							<Typography variant="body2">
								週間ダウンロード数:
								{packageInfo.weekly_downloads?.toLocaleString() ||
									'不明'}
							</Typography>
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
						</Box>
					</Card>
				)}
			</Box>

			{relatedPackages.length > 0 && (
				<Box sx={{ mb: 4 }}>
					<Typography
						variant="h4"
						color={theme.colors.text.primary}
						fontWeight="bold"
						sx={{ mb: 3 }}
					>
						同じタグのパッケージトレンド
					</Typography>
					<Card>
						<Grid container spacing={2}>
							{relatedPackages.slice(0, 9).map((pkg) => (
								<Card
									key={pkg.id}
									variant="hover"
									sx={{ height: '100%' }}
								>
									<Box
										sx={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'start',
											mb: 2,
										}}
									>
										<Typography
											variant="h6"
											color={theme.colors.text.primary}
										>
											{pkg.name}
										</Typography>
										<ExternalLink
											href={generateTrendUrl([
												packageName!,
												pkg.name,
											])}
										>
											比較
										</ExternalLink>
									</Box>

									<Typography
										variant="body2"
										color={theme.colors.text.secondary}
										sx={{ mb: 2 }}
									>
										{pkg.description}
									</Typography>

									{pkg.tags && pkg.tags.length > 0 && (
										<Box
											sx={{
												display: 'flex',
												flexWrap: 'wrap',
												gap: 0.5,
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
													variant="caption"
													color={
														theme.colors.text.muted
													}
												>
													+{pkg.tags.length - 3}
												</Typography>
											)}
										</Box>
									)}

									<Typography
										variant="caption"
										color={theme.colors.text.secondary}
									>
										週間DL:
										{pkg.weekly_downloads?.toLocaleString() ||
											'不明'}
									</Typography>
								</Card>
							))}
						</Grid>

						{relatedPackages.length > 9 && (
							<Box sx={{ mt: 3, textAlign: 'center' }}>
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
							</Box>
						)}
					</Card>
				</Box>
			)}

			{presets.length === 0 ? (
				<Box sx={{ textAlign: 'center', py: 4 }}>
					<Typography
						variant="h5"
						color={theme.colors.text.secondary}
						sx={{ mb: 2 }}
					>
						{packageName}
						を使用しているプリセットが見つかりませんでした。
					</Typography>
					<Link
						to="/"
						style={{
							color: theme.colors.accent.primary,
						}}
					>
						他のプリセットを見る
					</Link>
				</Box>
			) : (
				<Grid container spacing={2}>
					{presets.map((preset) => (
						<PresetCard
							key={preset.id}
							preset={preset}
							onLike={handleLike}
						/>
					))}
				</Grid>
			)}

			{showTagManager && packageInfo && (
				<TagManager
					packageName={packageName!}
					currentTags={packageInfo.tags || []}
					onTagsUpdated={handleTagsUpdated}
					onClose={() => setShowTagManager(false)}
				/>
			)}
		</Container>
	);
}

export default PackagePresets;
