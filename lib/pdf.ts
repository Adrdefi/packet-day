// PDF generation helpers for @react-pdf/renderer
// Components live in components/pdf/ — this file holds shared utilities.

export const PDF_COLORS = {
  sage: "#4A7C59",
  honey: "#D4A843",
  coral: "#E07A5F",
  cream: "#FDFBF7",
  dark: "#1A1A2E",
  muted: "#6B7280",
  white: "#FFFFFF",
} as const;

export const PDF_FONTS = {
  // @react-pdf/renderer uses its own font registration
  // Register fonts in your PDF component files using Font.register()
  body: "Helvetica",
  heading: "Helvetica-Bold",
} as const;

export function formatPacketDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function estimateTotalTime(activities: { estimated_minutes: number }[]): string {
  const total = activities.reduce((sum, a) => sum + a.estimated_minutes, 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
