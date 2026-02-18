import { format, parseISO, isValid } from "date-fns";

/**
 * Format a date string for human-readable display.
 * Handles ISO date strings (YYYY-MM-DD) and returns a friendly format like "Jan 15, 2025".
 *
 * @param dateString - ISO date string or any valid date string
 * @returns Formatted date string or original string if invalid
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "N/A";
  }

  try {
    // Try parsing as ISO date first (YYYY-MM-DD format from database)
    const date = parseISO(dateString);

    if (!isValid(date)) {
      // If ISO parsing fails, try creating a Date directly
      const fallbackDate = new Date(dateString);
      if (!isValid(fallbackDate)) {
        return dateString; // Return original if we can't parse it
      }
      return format(fallbackDate, "MMM d, yyyy");
    }

    return format(date, "MMM d, yyyy");
  } catch {
    return dateString; // Return original string on any error
  }
}

/**
 * Format a date string for short display.
 * Returns format like "Jan 15" (no year) for recent dates.
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) {
    return "N/A";
  }

  try {
    const date = parseISO(dateString);

    if (!isValid(date)) {
      return dateString;
    }

    return format(date, "MMM d");
  } catch {
    return dateString;
  }
}
