/**
 * Componente Link que mantiene el contexto de navegación
 * Si estás en /grupo/{slug} o /sucursal/{slug}, agrega el prefijo automáticamente
 */

import Link, { LinkProps } from 'next/link';
import { useStoreContext } from '@/contexts/StoreContext';
import { useRouter } from 'next/router';
import { ReactNode, AnchorHTMLAttributes } from 'react';

interface ContextualLinkProps extends Omit<LinkProps, 'href'>, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
  preserveQuery?: boolean;
}

export default function ContextualLink({ 
  href, 
  children, 
  preserveQuery = false,
  ...props 
}: ContextualLinkProps) {
  const { getContextualUrl } = useStoreContext();
  const router = useRouter();
  
  // Generar URL con contexto
  let contextualHref = getContextualUrl(href);
  
  // Preservar query params si se solicita
  if (preserveQuery && router.query) {
    const queryString = new URLSearchParams(
      Object.entries(router.query).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = value;
        } else if (Array.isArray(value)) {
          acc[key] = value[0];
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    if (queryString) {
      contextualHref += `?${queryString}`;
    }
  }
  
  // Separar props de Link de props de anchor
  const { style, onMouseEnter, onMouseLeave, className, ...linkProps } = props;

  return (
    <Link
      href={contextualHref}
      {...linkProps}
      className={className}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
}

