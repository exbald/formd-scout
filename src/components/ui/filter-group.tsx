"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  badge?: React.ReactNode;
}

export function FilterGroup({
  title,
  children,
  defaultOpen = false,
  className,
  badge,
}: FilterGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-[0.15rem] p-2 text-left transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pt-1 pb-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
