import { User } from '../types'
import './Header.css'

interface HeaderProps {
  user: User | null
  onCreateClick: () => void
}

export default function Header({ user, onCreateClick }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h2 className="logo">📈 NPM Trends</h2>
        </div>
        
        <div className="header-right">
          {user ? (
            <div className="user-menu">
              <button 
                className="create-button"
                onClick={onCreateClick}
              >
                ✨ プリセット作成
              </button>
              
              <div className="user-info">
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="user-avatar"
                />
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <div className="user-stats">
                    <span>{user.stats.presets_count} プリセット</span>
                    <span>{user.stats.total_likes} いいね</span>
                  </div>
                </div>
              </div>
              
              <a href="/auth/logout" className="logout-button">
                ログアウト
              </a>
            </div>
          ) : (
            <a href="/auth/login" className="login-button">
              GitHub でログイン
            </a>
          )}
        </div>
      </div>
    </header>
  )
}