import {
	SignInButton,
	SignedIn,
	SignedOut,
	UserButton,
} from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';

interface HeaderProps {
	onCreateClick: () => void;
}

export default function Header({ onCreateClick }: HeaderProps) {
	return (
		<AppBar
			position="sticky"
			sx={{
				bgcolor: 'background.paper',
				borderBottom: 1,
				borderColor: 'divider',
			}}
		>
			<Toolbar>
				<Typography
					variant="h6"
					component="h2"
					sx={{ flexGrow: 1, fontWeight: 'bold' }}
				>
					📈 NPM Trends
				</Typography>

				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<Link
						to="/tags"
						style={{
							color: 'inherit',
							textDecoration: 'none',
							transition: 'opacity 0.2s',
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.opacity = '1')
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.opacity = '0.7')
						}
					>
						タグ一覧
					</Link>
					<SignedIn>
						<Button onClick={onCreateClick}>プリセット作成</Button>
						<UserButton />
					</SignedIn>
					<SignedOut>
						<SignInButton mode="redirect">
							<Button>ログイン</Button>
						</SignInButton>
					</SignedOut>
				</Box>
			</Toolbar>
		</AppBar>
	);
}
