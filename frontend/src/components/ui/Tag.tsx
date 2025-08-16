import { Chip, ChipProps } from '@mui/material';
import { Close } from '@mui/icons-material';
import { ReactNode } from 'react';

interface TagProps extends Omit<ChipProps, 'variant' | 'children' | 'color'> {
	variant?: 'default' | 'removable';
	color?: string;
	onRemove?: () => void;
	children: ReactNode;
}

export default function Tag({
	variant = 'default',
	color,
	onRemove,
	children,
	...props
}: TagProps) {
	return (
		<Chip
			label={children}
			variant="filled"
			size="small"
			deleteIcon={variant === 'removable' ? <Close /> : undefined}
			onDelete={variant === 'removable' ? onRemove : undefined}
			sx={{
				backgroundColor: color || 'primary.main',
				color: 'white',
				'& .MuiChip-deleteIcon': {
					color: 'rgba(255, 255, 255, 0.7)',
					'&:hover': {
						color: 'white',
					},
				},
			}}
			{...props}
		/>
	);
}
