import { Link } from '@mui/material';
import { ReactNode, useState } from 'react';
import { theme } from '../../styles/theme';

interface ExternalLinkProps {
	href: string;
	children: ReactNode;
	title?: string;
}

function ExternalLink({
	href,
	children,
	title,
}: ExternalLinkProps) {
	const [isHovered, setIsHovered] = useState(false);

	const getLinkSx = () => ({
		color: theme.colors.accent.primary,
		textDecoration: 'none',
		transition: theme.transition,
		'&:hover': {
			color: theme.colors.accent.hover,
			textDecoration: 'underline',
		},
		...(isHovered && {
			color: theme.colors.accent.hover,
			textDecoration: 'underline',
		}),
	});

	return (
		<Link
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			title={title}
			sx={getLinkSx()}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{children}
		</Link>
	);
}

export default ExternalLink;
