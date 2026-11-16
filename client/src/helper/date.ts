import { components } from "@shared/interfaces/bfl4svd-api-documentation";
import { useTranslations } from "next-intl";

// Helper function to create date from parts
const createDate = (
  year: number,
  month?: number | null,
  day?: number | null,
) => {
  // Handle BCE dates (negative years)
  const isBCE = year < 0;
  const absYear = Math.abs(year);

  const date = new Date(year, (month || 1) - 1, day || 1); // Start with a base date
  if (year < 100) {
    // For CE years less than 100, set the full year explicitly
    date.setFullYear(absYear);
  }

  if (isBCE) {
    // For BCE, create date and adjust
    date.setFullYear(-absYear);
  }

  return date;
};

export { createDate };
