export type RelevanceLevel = "high" | "medium" | "low" | "unknown";

export function getRelevanceLevel(score: number | null): RelevanceLevel {
  if (score === null) return "unknown";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getRelevanceColor(score: number | null): string {
  const level = getRelevanceLevel(score);
  switch (level) {
    case "high":
      return "text-success";
    case "medium":
      return "text-warning";
    case "low":
      return "text-neutral-foreground";
    case "unknown":
      return "text-muted-foreground";
  }
}

export function getRelevanceBadgeClass(score: number | null): string {
  const level = getRelevanceLevel(score);
  switch (level) {
    case "high":
      return "bg-success-muted text-success-foreground border-success-border";
    case "medium":
      return "bg-warning-muted text-warning-foreground border-warning-border";
    case "low":
    case "unknown":
      return "bg-neutral-muted text-neutral-foreground border-neutral-border";
  }
}

export function getRelevanceBadgeVariant(
  score: number | null
): "default" | "secondary" | "outline" {
  if (score === null) return "outline";
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  return "outline";
}

export function getStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "sent":
      return "bg-success-muted text-success-foreground border-success-border";
    case "archived":
      return "bg-neutral-muted text-neutral-foreground border-neutral-border";
    default:
      return "bg-info-muted text-info-foreground border-info-border";
  }
}
