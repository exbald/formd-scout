import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ModeToggle } from "@/components/ui/mode-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary px-12 py-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 20% 20%, var(--highlight), transparent 55%)",
          }}
        />
        <BrandMark href="/" inverted />
        <div className="relative max-w-lg">
          <p className="font-display text-4xl leading-tight italic xl:text-5xl">
            Detect the raise before the press release.
          </p>
          <p className="mt-5 text-base text-primary-foreground/70">
            Form D filings appear two to three weeks before the announcement. Scout the companies
            that just raised — while they are still looking for space.
          </p>
        </div>
        <p className="relative font-mono text-[11px] tracking-[0.22em] uppercase text-primary-foreground/50">
          Private CRE intelligence
        </p>
      </aside>

      <div className="relative flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <div className="lg:hidden">
            <BrandMark href="/" />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground hidden text-sm sm:inline">
              Home
            </Link>
            <ModeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">{children}</div>
      </div>
    </div>
  );
}
