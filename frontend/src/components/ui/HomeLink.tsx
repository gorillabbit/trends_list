import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import { Home } from '@mui/icons-material';
import { theme } from '../../styles/theme';

export const HomeLink = () => {
	return (
		<Link
			to="/"
			style={{
				textDecoration: 'none',
			}}
		>
			<Button
				startIcon={<Home />}
				sx={{
					color: theme.colors.text.secondary,
					'&:hover': {
						color: theme.colors.accent.primary,
						backgroundColor: 'transparent',
					},
				}}
			>
				ホームに戻る
			</Button>
		</Link>
	);
};
