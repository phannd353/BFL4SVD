import { redirect } from 'next/navigation';

export default async function CmsdeskPage() {
  redirect(`/cmsdesk/settings/account`);
}
