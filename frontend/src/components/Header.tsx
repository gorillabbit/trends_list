import {
	SignInButton,
	SignedIn,
	SignedOut,
	UserButton,
} from '@clerk/clerk-react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { theme } from '../styles/theme';

interface HeaderProps {
	onCreateClick: () => void;
}

export default function Header({ onCreateClick }: HeaderProps) {
	const location = useLocation();

	const getButtonStyle = (path: string) => {
		const isActive = location.pathname === path || 
			(path !== '/' && location.pathname.startsWith(path));
		
		return {
			color: isActive ? theme.colors.accent.primary : theme.colors.text.secondary,
			backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
			fontWeight: isActive ? 'bold' : 'normal',
			'&:hover': {
				backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
			}
		};
	};

	return (
		<AppBar position="sticky">
			<Toolbar sx={{ gap: 2 }}>
				<Typography fontWeight="bold" flexGrow={1}>
					📈 NPM Trends
				</Typography>

				<Button
					component={Link}
					to="/"
					sx={getButtonStyle('/')}
				>
					プリセット一覧
				</Button>

				<Button
					component={Link}
					to="/packages"
					sx={getButtonStyle('/packages')}
				>
					パッケージ一覧
				</Button>

				<Button
					component={Link}
					to="/tags"
					sx={getButtonStyle('/tags')}
				>
					タグ一覧
				</Button>
				<SignedIn>
					<Button onClick={onCreateClick} variant="contained">
						プリセット作成
					</Button>
					<UserButton />
				</SignedIn>
				<SignedOut>
					<SignInButton mode="redirect">
						<Button variant="contained">ログイン</Button>
					</SignInButton>
				</SignedOut>
			</Toolbar>
		</AppBar>
	);
}
