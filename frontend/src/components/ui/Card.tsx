import { Card as MUICard, CardProps as MUICardProps } from '@mui/material';
import { ReactNode, useState } from 'react';
import { theme } from '../../styles/theme';

interface CardProps extends Omit<MUICardProps, 'variant'> {
	variant?: 'default' | 'hover' | 'clickable';
	children: ReactNode;
}

export default function Card({
	variant = 'default',
	children,
	sx,
	...props
}: CardProps) {
	const [isHovered, setIsHovered] = useState(false);

	const getCardSx = () => {
		const baseSx = {
			p: 3,
			backgroundColor: theme.colors.background.card,
			border: `1px solid ${theme.colors.border.secondary}`,
			borderRadius: theme.borderRadius.lg,
			transition: theme.transition,
		};

		if (variant === 'clickable') {
			Object.assign(baseSx, {
				cursor: 'pointer',
			});
		}

		if (isHovered && (variant === 'hover' || variant === 'clickable')) {
			Object.assign(baseSx, {
				borderColor: theme.colors.border.accent,
				boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)',
			});
			if (variant === 'clickable') {
				Object.assign(baseSx, {
					transform: 'scale(1.02)',
				});
			}
		}

		return { ...baseSx, ...sx };
	};

	return (
		<MUICard
			sx={getCardSx()}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			{...props}
		>
			{children}
		</MUICard>
	);
}
