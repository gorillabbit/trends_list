import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Typography, Grid } from '@mui/material';
import { Tag as TagType } from '../types';
import { Loading } from './ui/Loading';
import Tag from './ui/Tag';
import Card from './ui/Card';
import { theme } from '../styles/theme';
import { createApiClient } from '../services/api';
import { useApi } from '../hooks/useApi';

function TagList() {
	const [tags, setTags] = useState<TagType[]>([]);
	const [error, setError] = useState<string>('');
	const apiClient = createApiClient();
	const { execute, loading } = useApi();

	const fetchTags = async () => {
		const result = await execute(
			() => apiClient.get<{ tags: TagType[] }>('/tags'),
			{
				showAlert: false,
				onError: (error) => setError(error)
			}
		);
		if (result) {
			setTags(result.tags || []);
		}
	};

	useEffect(() => {
		fetchTags();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
