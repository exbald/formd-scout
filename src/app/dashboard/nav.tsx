"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Mail,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/filings", label: "Filings", icon: FileText },
  { href: "/dashboard/outreach", label: "Outreach", icon: Mail },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
    router.refresh();
  };

  const userInitial = (session?.user?.name?.[0] || session?.user?.email?.[0] || "U").toUpperCase();

  // Close mobile menu when route changes
  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container mx-auto flex h-16 items-center px-4">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="mr-4 flex items-center gap-2 lg:mr-8"
            aria-label="FormD Scout - Dashboard"
          >
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-[0.15rem]">
              <FileSearch className="text-primary h-5 w-5" />
            </div>
            <span className="text-foreground text-xl font-bold tracking-tight">FormD Scout</span>
          </Link>

          {/* Desktop Navigation - visible on md and up */}
          <nav
            className="hidden flex-1 items-center gap-1 md:flex"
            role="navigation"
            aria-label="Dashboard navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-[0.15rem] px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-muted/50 text-primary border-primary border-b-2"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu Button - visible below md */}
          <button
            className="-mr-2 flex flex-1 justify-end p-2 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop User section - visible on md and up */}
          <div className="hidden items-center gap-4 md:flex">
            <ModeToggle />
            {isPending ? (
              <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
            ) : session ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-muted-foreground text-xs">{session.user?.email}</p>
                  </div>
                  <Avatar className="size-9">
                    <AvatarImage
                      src={session.user?.image || ""}
                      alt={session.user?.name || "User"}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu - slides down when open */}
        {mobileMenuOpen && (
          <div className="bg-background border-t md:hidden">
            <nav
              className="container mx-auto space-y-2 px-4 py-4"
              role="navigation"
              aria-label="Mobile navigation"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 rounded-[0.15rem] px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-muted/50 text-primary border-primary border-l-4"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}

              <Separator className="my-3" />

              {/* Theme Toggle */}
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="text-muted-foreground text-sm">Theme</span>
                <ModeToggle />
              </div>

              {/* Mobile User Section */}
              {isPending ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="bg-muted h-9 w-9 animate-pulse rounded-full" />
                  <div className="space-y-1">
                    <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-32 animate-pulse rounded" />
                  </div>
                </div>
              ) : session ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-9">
                      <AvatarImage
                        src={session.user?.image || ""}
                        alt={session.user?.name || "User"}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{session.user?.name}</p>
                      <p className="text-muted-foreground text-xs">{session.user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex w-full items-center gap-3 rounded-[0.15rem] px-4 py-3 text-left text-sm font-medium transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={handleNavClick}
                  className="flex items-center justify-center px-4 py-3"
                >
                  <Button size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6" id="main-content">
        {children}
      </main>

      <footer className="text-muted-foreground mt-auto border-t py-6 text-center text-sm">
        <div className="container mx-auto flex flex-col items-center gap-2 px-4">
          <p>FormD Scout &mdash; SEC EDGAR Form D Filing Monitor</p>
          <a
            href="https://zerodraft.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] opacity-20 transition-opacity hover:opacity-100"
          >
            zerodraft.studio
          </a>
        </div>
      </footer>
    </div>
  );
}
