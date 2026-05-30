/** Pure utility functions — no server deps, safe in client components */

export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: Date | string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", opts ?? {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
