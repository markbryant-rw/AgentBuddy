import { Link, useMatch, useResolvedPath, LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps extends Omit<LinkProps, 'className'> {
  className?: string;
  activeClassName?: string;
  end?: boolean;
}

export function NavLink({ 
  to, 
  className = '', 
  activeClassName = '', 
  end = false,
  children,
  ...props 
}: NavLinkProps) {
  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end });

  return (
    <Link
      to={to}
      className={cn(className, match ? activeClassName : '')}
      {...props}
    >
      {children}
    </Link>
  );
}
