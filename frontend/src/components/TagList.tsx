import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Typography, Grid } from '@mui/material';
import { Tag as TagType } from '../types';
import { Loading } from './ui/Loading';
import { HomeLink } from './ui/HomeLink';
import Tag from './ui/Tag';
import Card from './ui/Card';
import { theme } from '../styles/theme';

function TagList() {
	const [tags, setTags] = useState<TagType[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		fetchTags();
	}, []);

	const fetchTags = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/tags');
			if (res.ok) {
				const data = await res.json();
				setTags(data.tags || []);
			} else {
				setError('タグの取得に失敗しました');
			}
		} catch (err) {
			console.error('Failed to fetch tags:', err);
			setError('タグの取得に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <Loading />;
	}

	if (error) {
		return <HomeLink />;
	}

	return (
		<Container sx={{ py: 4 }}>
			<Box sx={{ mb: 4 }}>
				<HomeLink />
				<Typography
					variant="h3"
					fontWeight="bold"
					color={theme.colors.text.primary}
				>
					タグ一覧
				</Typography>
				<Typography variant="h6" color={theme.colors.text.secondary}>
					パッケージのカテゴリやタグを探して、関連するパッケージのトレンドを確認できます。
				</Typography>
			</Box>

			{tags.length === 0 ? (
				<Box sx={{ textAlign: 'center', py: 4 }}>
					<Typography
						variant="h6"
						color={theme.colors.text.secondary}
					>
						タグが見つかりませんでした。
					</Typography>
					<HomeLink />
				</Box>
			) : (
				<>
					<Typography
						variant="h5"
						color={theme.colors.text.primary}
						sx={{ mb: 1 }}
					>
						すべてのタグ ({tags.length}件)
					</Typography>

					<Grid container spacing={1}>
						{tags.map((tag) => (
							<Link
								to={`/tags/${tag.id}`}
								style={{ textDecoration: 'none' }}
								key={tag.id}
							>
								<Card
									variant="hover"
									sx={{
										height: '100%',
									}}
								>
									<Tag color={tag.color} sx={{ mb: 1 }}>
										{tag.name}
									</Tag>
									<Typography
										variant="body2"
										color={theme.colors.text.secondary}
										sx={{ ml: 1 }}
									>
										{tag.description}
									</Typography>
								</Card>
							</Link>
						))}
					</Grid>
				</>
			)}
		</Container>
	);
}

export default TagList;
