import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import './Header.css';

interface HeaderProps {
  onCreateClick: () => void;
}

export default function Header({ onCreateClick }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h2 className="logo">📈 NPM Trends</h2>
        </div>
        
        <div className="header-right">
          <SignedIn>
            <div className="user-menu">
              <button 
                className="create-button"
                onClick={onCreateClick}
              >
                ✨ プリセット作成
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="redirect">
              <button className="login-button">
                ログイン / 新規登録
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
