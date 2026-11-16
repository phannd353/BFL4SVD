"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "@/i18n/navigation";
import {
  Settings,
  LogOut,
  GalleryVerticalEnd,
  ChartGantt,
  Newspaper,
  Image,
  Tags,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

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
import { Button, buttonVariants } from "../ui/button";

const sidebarNavItems = [
  // {
  //   href: '/cmsdesk/website',
  //   icon: PanelTop,
  //   label: 'Website',
  // },
  // {
  //   href: '/cmsdesk/nav-menus',
  //   icon: Route,
  //   label: 'Nav Menus',
  // },
  {
    href: "/cmsdesk/posts",
    icon: Newspaper,
    label: "Posts",
  },
  {
    href: "/cmsdesk/images",
    icon: Image,
    label: "Images",
  },
  {
    href: "/cmsdesk/categories",
    icon: Tags,
    label: "Categories",
  },
];

export function DashboardSidebar() {
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
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Link
                href="/cmsdesk"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Admin Panel</span>
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
              {sidebarNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    // tooltip={item.label}
                    className="text-muted-foreground w-full"
                  >
                    <Link
                      href={item.href}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className: "w-full",
                      })}
                    >
                      <item.icon />
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
            <SidebarMenuButton>
              <Link
                href="/cmsdesk/settings/account"
                className={buttonVariants({ variant: "ghost" })}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer">
              <Button onClick={handleLogout} variant="ghost">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
