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
	sx,
	...props
}: TagProps) {
	return (
		<Chip
			label={children}
			variant="filled"
			size="small"
			sx={{ bgcolor: color }}
			deleteIcon={variant === 'removable' ? <Close /> : undefined}
			onDelete={variant === 'removable' ? onRemove : undefined}
			{...props}
		/>
	);
}
