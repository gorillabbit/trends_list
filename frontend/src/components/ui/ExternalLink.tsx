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
  className = "text-blue-600 hover:text-blue-800 underline transition-colors",
  title
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