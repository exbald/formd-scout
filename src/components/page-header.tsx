import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {kicker ? (
          <p className="text-highlight mb-2 font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <div className="text-muted-foreground mt-2 max-w-2xl text-base">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
