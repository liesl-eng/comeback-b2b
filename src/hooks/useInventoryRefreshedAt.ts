import { useState } from "react";

export function formatInventoryRefreshed(d: Date): string {
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s?(AM|PM)$/i, (_, m) => ` ${m.toUpperCase()}`);
  return `INVENTORY REFRESHED ${datePart}, ${timePart}.`;
}

export function useInventoryRefreshedAt(): Date | null {
  // Show the current load time as the "refreshed" timestamp.
  const [value] = useState<Date>(() => new Date());
  return value;
}
