import {
	SignInButton,
	SignedIn,
	SignedOut,
	UserButton,
} from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
	onCreateClick: () => void;
}

export default function Header({ onCreateClick }: HeaderProps) {
	return (
		<header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
			<div className="container mx-auto px-4 py-4 flex items-center justify-between">
				<h2 className="text-xl font-bold">📈 NPM Trends</h2>

				<div className="flex items-center gap-4">
					<Link 
						to="/tags" 
						className="text-gray-300 hover:text-white transition-colors"
					>
						タグ一覧
					</Link>
					<SignedIn>
						<button
							className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
							onClick={onCreateClick}
						>
							プリセット作成
						</button>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
					<SignedOut>
						<SignInButton mode="redirect">
							<button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors">
								ログイン
							</button>
						</SignInButton>
					</SignedOut>
				</div>
			</div>
		</header>
	);
}
