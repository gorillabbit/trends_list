import { Card as MUICard, CardProps as MUICardProps } from '@mui/material';
import { ReactNode } from 'react';

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
	const getHoverEffects = () => {
		switch (variant) {
			case 'hover':
				return {
					'&:hover': {
						boxShadow: 4,
						borderColor: 'primary.main',
					},
				};
			case 'clickable':
				return {
					cursor: 'pointer',
					transition: 'all 0.2s ease-in-out',
					'&:hover': {
						boxShadow: 4,
						borderColor: 'primary.main',
						transform: 'scale(1.02)',
					},
				};
			default:
				return {};
		}
	};

	return (
		<MUICard
			sx={{
				p: 3,
				border: 1,
				borderColor: 'divider',
				...getHoverEffects(),
				...sx,
			}}
			{...props}
		>
			{children}
		</MUICard>
	);
}
