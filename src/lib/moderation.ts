const BAD_WORDS = [
  "fuck", "shit", "bitch", "bastard", "asshole", "idiot", "moron",
  "chutiya", "chutia", "madarchod", "bhenchod", "behenchod", "gaand", "gandu",
  "harami", "randi", "bsdk", "bhosdi", "bhosdike",
];

export function moderationStatusForText(value: string): "pending" | "spam" {
  const normalized = value.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/gi, " ");
  return BAD_WORDS.some((word) => normalized.includes(word)) ? "spam" : "pending";
}

export function containsBlockedLanguage(value: string): boolean {
  return moderationStatusForText(value) === "spam";
}
