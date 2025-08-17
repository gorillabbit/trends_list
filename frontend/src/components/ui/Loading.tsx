import { Box, Typography, CircularProgress } from '@mui/material';
import { theme } from '../../styles/theme';

export const Loading = () => {
	return (
		<Box
			bgcolor={theme.colors.background.primary}
			sx={{
				minHeight: '100vh',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 2,
			}}
		>
			<CircularProgress sx={{ color: theme.colors.accent.primary }} />
			<Typography color={theme.colors.text.secondary}>
				読み込み中...
			</Typography>
		</Box>
	);
};
