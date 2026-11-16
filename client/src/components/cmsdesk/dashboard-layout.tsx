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

import React from "react";
import Link from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { DashboardSidebar } from "@/components/cmsdesk/dashboard-sidebar";
import { ModeToggle } from "../mode-toggle";
import { useLocale } from "next-intl";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const locale = useLocale();
  const pathSegments = pathname
    .replace(`/${locale}`, "")
    .split("/")
    .filter((segment) => segment);

  const relevantSegments =
    pathSegments[0] === "cmsdesk" ? pathSegments.slice(1) : pathSegments;

  return (
    <SidebarProvider className="bg-secondary-background">
      <DashboardSidebar />

      <SidebarInset className="">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="w-full flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    <Link href="/cmsdesk">Cmsdesk</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {relevantSegments.length > 0 && <BreadcrumbSeparator />}
                {relevantSegments.map((segment, index) => {
                  const href = `/cmsdesk/${relevantSegments
                    .slice(0, index + 1)
                    .join("/")}`;
                  const isLast = index === relevantSegments.length - 1;
                  return (
                    <React.Fragment key={href}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="capitalize">
                            {segment.replace(/-/g, " ")}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink className="capitalize">
                            <Link href={href}>
                              {segment.replace(/-/g, " ")}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
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

export default DashboardLayout;
