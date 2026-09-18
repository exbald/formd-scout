import Link from "next/link";
import { UserProfile } from "@/components/auth/user-profile";
import { BrandMark } from "@/components/brand-mark";
import { ModeToggle } from "./ui/mode-toggle";

export function SiteHeader() {
  return (
    <>
      <a
        href="#main-content"
        className="bg-background text-foreground focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:border focus:px-4 focus:py-2 sr-only"
      >
        Skip to main content
      </a>
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/55 sticky top-0 z-50 border-b backdrop-blur-md" role="banner">
        <nav
          className="container mx-auto flex h-[4.5rem] items-center justify-between px-6"
          aria-label="Main navigation"
        >
          <BrandMark href="/" />
          <div className="flex items-center gap-3" role="group" aria-label="User actions">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground hidden text-sm font-medium sm:inline"
            >
              The desk
            </Link>
            <UserProfile />
            <ModeToggle />
          </div>
        </nav>
      </header>
    </>
  );
}
