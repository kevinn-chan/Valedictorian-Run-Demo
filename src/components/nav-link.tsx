"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sidebar / bottom-bar link that knows whether it's the current page.
// `exact` is for "/" — otherwise every route would mark Home active.
export function NavLink({
  href,
  exact,
  className,
  activeClassName,
  idleClassName,
  children,
}: {
  href: string;
  exact?: boolean;
  className: string;
  activeClassName: string;
  idleClassName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      // The rail is on every screen, so leaving prefetch on means every page
      // view quietly triggers a full SSR render of every other nav target —
      // each one several Supabase queries. That was enough to make the free
      // tier answer 503. Both loading.tsx boundaries cover the wait instead.
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : idleClassName}`}
    >
      {children}
    </Link>
  );
}
