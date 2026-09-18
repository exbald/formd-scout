import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  inverted = false,
  className,
}: {
  href?: string;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="FormD Scout"
    >
      <span
        className={cn(
          "font-display flex h-7 w-7 items-center justify-center rounded-md text-sm italic",
          inverted ? "bg-highlight text-highlight-foreground" : "bg-highlight/15 text-highlight"
        )}
      >
        D
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-xl leading-none tracking-tight italic",
            inverted ? "text-primary-foreground" : "text-foreground"
          )}
        >
          FormD
        </span>
        <span
          className={cn(
            "text-[0.7rem] font-medium tracking-[0.22em] uppercase",
            inverted ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          Scout
        </span>
      </span>
    </Link>
  );
}
