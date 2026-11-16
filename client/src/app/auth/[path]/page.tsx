import { Metadata } from 'next';
import { Auth } from '@/components/auth/auth';

import { authLegalCopy } from '@/localization/vi/auth-localization';
import Link from 'next/link';
import RedirectOnSignedIn from './RedirectOnSignedIn';

export const metadata: Metadata = {
  robots: {
    index: false,
  },
};

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  if (!path) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900'></div>
      </div>
    );
  }

  return (
    <main className='h-full container flex grow flex-col items-center justify-center gap-4 self-center p-4 md:p-6'>
      <Auth path={path} />

      <RedirectOnSignedIn path={path} redirectPaths={['sign-in', 'sign-up']} />

      {!['callback', 'sign-out'].includes(path) && (
        <p className='w-3xs text-center text-muted-foreground text-xs'>
          {authLegalCopy.BY_CONTINUING_YOU_AGREE}{' '}
          <Link
            className='text-warning underline'
            href='/terms'
            target='_blank'
          >
            {authLegalCopy.TERMS_OF_SERVICE}
          </Link>
          {' and '}
          <Link
            className='text-warning underline'
            href='/privacy'
            target='_blank'
          >
            {authLegalCopy.PRIVACY_POLICY}
          </Link>
          .
        </p>
      )}
    </main>
  );
}
