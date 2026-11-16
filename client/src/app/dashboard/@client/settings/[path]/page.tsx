import { Settings } from "@/components/auth/settings/settings";
import { WalletConnection } from "@/components/auth/settings/account/wallet-connection";
import { viewPaths } from "@better-auth-ui/core";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(viewPaths.settings).map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="container self-center p-4 md:p-6">
      <div className="mb-6">
        <WalletConnection />
      </div>
      <Settings basePath="/dashboard/settings" path={path} />
    </main>
  );
}
