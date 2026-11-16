"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import Link from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SharedDashboardSidebar } from "./dashboard-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { useLocale } from "next-intl";
import { Fragment } from "react/jsx-runtime";

export interface SharedDashboardLayoutNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

interface SharedDashboardLayoutProps {
  children: React.ReactNode;
  navItems: SharedDashboardLayoutNavItem[];
  basePath: string;
}

export const SharedDashboardLayout = ({
  children,
  navItems,
  basePath,
}: SharedDashboardLayoutProps) => {
  const locale = useLocale();
  const pathname = usePathname();
  const pathSegments = pathname
    .replace(`/${locale}`, "")
    .split("/")
    .filter((segment) => segment);

  const relevantSegments =
    pathSegments[0] === basePath.split("/")[1]
      ? pathSegments.slice(1)
      : pathSegments;

  return (
    <SidebarProvider>
      <SharedDashboardSidebar navItems={navItems} />

      <SidebarInset className="bg-background overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="w-full flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4 self-center!"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={basePath} className="capitalize">
                    {basePath.split("/")[1]}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {relevantSegments.length > 0 && <BreadcrumbSeparator />}
                {relevantSegments.map((segment, index) => {
                  const href = `/${locale}${basePath}/${relevantSegments
                    .slice(0, index + 1)
                    .join("/")}`;
                  const isLast = index === relevantSegments.length - 1;
                  return (
                    <Fragment key={href}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="capitalize">
                            {segment}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={href} className="capitalize">
                            {segment}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="grow flex justify-end">
              <ModeToggle />
            </div>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};
