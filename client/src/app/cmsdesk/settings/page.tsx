import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  redirect(`/cmsdesk/settings/account`);
}
