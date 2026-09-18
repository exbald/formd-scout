"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const AUTH_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="page-enter">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
