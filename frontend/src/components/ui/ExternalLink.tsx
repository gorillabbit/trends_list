import { ReactNode } from 'react';

interface ExternalLinkProps {
	href: string;
	children: ReactNode;
	className?: string;
	title?: string;
}

function ExternalLink({
	href,
	children,
	className = 'external-link',
	title,
}: ExternalLinkProps) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={className}
			title={title}
		>
			{children}
		</a>
	);
}

export default ExternalLink;
