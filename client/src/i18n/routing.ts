import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['vi'],

  // Used when no locale matches
  defaultLocale: 'vi',
  // localeDetection: false, // Prevent automatic locale detection based on the browser's Accept-Language header
});
