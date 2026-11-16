'use client';

import { ExternalLink } from 'lucide-react';
import Link from '@/i18n/navigation';
import { usePathname } from 'next/navigation';

import { getHeaderNavItems } from '@/content/menus/header-nav-items';

export default function NavLink({
  navItem,
  ...props
}: Partial<Parameters<typeof Link>[0]> & {
  navItem: Awaited<ReturnType<typeof getHeaderNavItems>>[number];
}) {
  const segment = usePathname();
  const isActive = navItem.link_url === segment;

  return (
    <Link
      rel='noreferrer noopener'
      target={navItem.link_new_tab ? '__blank' : ''}
      {...props}
      href={navItem.link_url}
      style={{ fontWeight: isActive ? 'bold' : 'normal' }}
    >
      {navItem.link_label}
      {navItem.link_new_tab ? <ExternalLink /> : ''}
    </Link>
  );
}
