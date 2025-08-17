import {
	SignInButton,
	SignedIn,
	SignedOut,
	UserButton,
} from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { theme } from '../styles/theme';
import { useState } from 'react';

interface HeaderProps {
	onCreateClick: () => void;
}

export default function Header({ onCreateClick }: HeaderProps) {
	const [isTagsHovered, setIsTagsHovered] = useState(false);

	return (
		<AppBar position="sticky">
			<Toolbar sx={{ gap: 2 }}>
				<Typography fontWeight="bold" flexGrow={1}>
					📈 NPM Trends
				</Typography>

				<Link
					to="/tags"
					style={{
						color: isTagsHovered
							? theme.colors.accent.hover
							: theme.colors.text.secondary,
						textDecoration: 'none',
						transition: theme.transition,
					}}
					onMouseEnter={() => setIsTagsHovered(true)}
					onMouseLeave={() => setIsTagsHovered(false)}
				>
					タグ一覧
				</Link>
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
