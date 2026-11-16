export const IMAGE_CATEGORIES = [
  "historical",
  "cultural",
  "events",
  "architecture",
  "people",
  "documents",
  "artifacts",
  "landscape",
  "other",
] as const;

export type ImageCategory = (typeof IMAGE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ImageCategory, string> = {
  historical: "Historical",
  cultural: "Cultural",
  events: "Events",
  architecture: "Architecture",
  people: "People",
  documents: "Documents",
  artifacts: "Artifacts",
  landscape: "Landscape",
  other: "Other",
};
