"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "@/i18n/navigation";
import { LogOut, GalleryVerticalEnd, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSignOut } from "@better-auth-ui/react";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { SharedDashboardLayoutNavItem } from ".";

export function SharedDashboardSidebar({
  navItems,
}: {
  navItems: SharedDashboardLayoutNavItem[];
}) {
  const pathname = usePathname();
  const { mutate: signOut } = useSignOut(authClient);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      signOut();
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "ghost" })}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Dashboard Panel</span>
                  <span className="">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={
                      pathname.endsWith(item.href) ||
                      pathname.includes(`${item.href}/`)
                    }
                    tooltip={item.label}
                    className="text-muted-foreground"
                  >
                    <Link
                      href={item.href}
                      className={buttonVariants({
                        variant: "ghost",
                        className: "w-full justify-start",
                      })}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Link
                href="/dashboard/settings/account"
                className={buttonVariants({
                  variant: "ghost",
                  className: "w-full justify-start",
                })}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="cursor-pointer"
              render={
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  type="button"
                  className="justify-start"
                />
              }
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
