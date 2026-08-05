/**
 * Returns a human-readable relative time string from an ISO date or Firestore Timestamp.
 * e.g. "2 minutes ago", "3 hours ago", "Yesterday", "5 days ago"
 */
export function timeAgo(dateInput: string | { toDate?: () => Date } | null | undefined): string {
  if (!dateInput) return "Recently";

  let date: Date;
  if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else if (typeof dateInput === "object" && typeof dateInput.toDate === "function") {
    date = dateInput.toDate();
  } else {
    return "Recently";
  }

  if (isNaN(date.getTime())) return "Recently";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (seconds < 172800) return "Yesterday";
  const d = Math.floor(seconds / 86400);
  if (d < 30) return `${d} days ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}
