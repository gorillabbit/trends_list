import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Typography, Grid } from '@mui/material';
import { Package } from '../types';
import { Loading } from './ui/Loading';
import Card from './ui/Card';
import Tag from './ui/Tag';
import { theme } from '../styles/theme';

function PackageList() {
	const [packages, setPackages] = useState<Package[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		fetchPackages();
	}, []);

	const fetchPackages = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/packages');
			if (res.ok) {
				const data = await res.json();
				setPackages(data.packages || []);
			} else {
				setError('パッケージの取得に失敗しました');
			}
		} catch (err) {
			console.error('Failed to fetch packages:', err);
			setError('パッケージの取得に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
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
					fontWeight="bold"
					color={theme.colors.text.primary}
				>
					パッケージ一覧
				</Typography>
				<Typography variant="h6" color={theme.colors.text.secondary}>
					すべてのNPMパッケージを閲覧して、詳細情報やトレンドを確認できます。
				</Typography>
			</Box>

			{packages.length === 0 ? (
				<Box sx={{ textAlign: 'center', py: 4 }}>
					<Typography
						variant="h6"
						color={theme.colors.text.secondary}
					>
						パッケージが見つかりませんでした。
					</Typography>
				</Box>
			) : (
				<>
					<Typography
						variant="h5"
						color={theme.colors.text.primary}
						sx={{ mb: 1 }}
					>
						すべてのパッケージ ({packages.length}件)
					</Typography>

					<Grid container spacing={1}>
						{packages.map((pkg) => (
							<Link
								to={`/packages/${pkg.name}`}
								style={{ textDecoration: 'none' }}
								key={pkg.id}
							>
								<Card
									variant="hover"
									sx={{
										height: '100%',
										display: 'flex',
										flexDirection: 'column',
									}}
								>
									<Typography
										variant="h6"
										fontWeight="bold"
										color={theme.colors.text.primary}
										sx={{ mb: 1 }}
									>
										{pkg.name}
									</Typography>
									{pkg.description && (
										<Typography
											variant="body2"
											color={theme.colors.text.secondary}
											sx={{ mb: 2, flexGrow: 1 }}
										>
											{pkg.description}
										</Typography>
									)}
									{pkg.tags && pkg.tags.length > 0 && (
										<Box
											sx={{
												display: 'flex',
												gap: 0.5,
												flexWrap: 'wrap',
											}}
										>
											{pkg.tags.map((tag) => (
												<Tag
													key={tag.id}
													color={tag.color}
													sx={{ fontSize: '0.75rem' }}
												>
													{tag.name}
												</Tag>
											))}
										</Box>
									)}
								</Card>
							</Link>
						))}
					</Grid>
				</>
			)}
		</Container>
	);
}

export default PackageList;
