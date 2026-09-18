import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t py-10 text-sm">
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <p>FormD Scout — funding intelligence before the press release.</p>
        <nav className="flex items-center gap-6" aria-label="Footer">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Filings preview
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
