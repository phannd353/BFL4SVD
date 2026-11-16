// app/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { hasLocale } from 'next-intl';

export default getRequestConfig(async ({ locale }) => {
  // Static for now, we'll change this later
  locale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../localization/${locale}.json`)).default,
  };
});
