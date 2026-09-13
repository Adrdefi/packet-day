// Maps a packets.grade_level value ("K", "1".."8") to a human-readable
// label. Shared by the public share page and the packet OG card route.

export const GRADE_LABELS: Record<string, string> = {
  K: "Kindergarten",
  "1": "1st Grade",
  "2": "2nd Grade",
  "3": "3rd Grade",
  "4": "4th Grade",
  "5": "5th Grade",
  "6": "6th Grade",
  "7": "7th Grade",
  "8": "8th Grade",
};
