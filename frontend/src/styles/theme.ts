// ダークテーマの共通スタイル定数
export const theme = {
  colors: {
    background: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      card: '#2a2a2a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
      muted: '#808080',
    },
    accent: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      hover: '#2563eb',
    },
    border: {
      primary: '#404040',
      secondary: '#303030',
      accent: '#3b82f6',
    },
    button: {
      primary: '#3b82f6',
      secondary: '#374151',
      danger: '#ef4444',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  transition: 'all 0.2s ease-in-out',
} as const;

// 共通スタイルヘルパー
export const styles = {
  button: {
    base: {
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      borderRadius: theme.borderRadius.md,
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: theme.transition,
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    primary: {
      backgroundColor: theme.colors.button.primary,
      color: theme.colors.text.primary,
    },
    secondary: {
      backgroundColor: theme.colors.button.secondary,
      color: theme.colors.text.primary,
      border: `1px solid ${theme.colors.border.primary}`,
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.text.secondary,
      border: `1px solid ${theme.colors.border.primary}`,
    },
    hover: {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    },
  },
  card: {
    base: {
      backgroundColor: theme.colors.background.card,
      border: `1px solid ${theme.colors.border.secondary}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      transition: theme.transition,
    },
    hover: {
      borderColor: theme.colors.border.accent,
      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)',
    },
    clickable: {
      cursor: 'pointer',
    },
  },
  tag: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      backgroundColor: theme.colors.accent.primary,
      color: theme.colors.text.primary,
      borderRadius: theme.borderRadius.sm,
      fontSize: '12px',
      fontWeight: '500',
      transition: theme.transition,
    },
    removable: {
      paddingRight: theme.spacing.xs,
    },
  },
  link: {
    base: {
      color: theme.colors.accent.primary,
      textDecoration: 'none',
      transition: theme.transition,
    },
    hover: {
      color: theme.colors.accent.hover,
      textDecoration: 'underline',
    },
  },
} as const;