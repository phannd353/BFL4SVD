'use client';
import { SharedError } from '@/components/shared';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return <SharedError error={error} />;
}
