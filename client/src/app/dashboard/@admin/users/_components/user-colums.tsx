import { UserAvatar } from "@/components/auth/user/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User as IUser } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Ban, Check, CheckCircle, Shield, User, XCircle } from "lucide-react";
import { UserActions } from "./user-actions";

export function getUserColumns({
  handleActionComplete,
}: {
  handleActionComplete: () => void;
}): ColumnDef<IUser>[] {
  return [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-4">
            <UserAvatar
              user={{
                id: user.id ?? user.email,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                image: user.image ?? null,
                createdAt: new Date(user.createdAt),
                updatedAt: new Date(user.updatedAt),
              }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.email.replace(/^[^@]+/, (match) =>
                  "*".repeat(match.length),
                )}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "verification",
      header: "Verification",
      cell: ({ row }) =>
        row.original.emailVerified ? (
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-200"
          >
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-yellow-200 bg-yellow-50 px-2 py-1 text-xs text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
          >
            <XCircle className="h-3 w-3" />
            Unverified
          </Badge>
        ),
    },
    {
      id: "linkedAccounts",
      header: "Linked Accounts",
      cell: () => <div className="flex -space-x-2" />,
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => {
        const userRole = row.original.role;
        return (
          <Badge
            variant="outline"
            className={`flex items-center gap-1 px-2 py-1 text-xs ${
              userRole === "admin"
                ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900 dark:text-purple-200"
                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200"
            }`}
          >
            {userRole === "admin" ? (
              <Shield className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
            {userRole
              ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
              : "User"}
          </Badge>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original;
        return user.banned ? (
          <div className="flex flex-col gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant="destructive"
                    className="flex cursor-help items-center gap-1 px-2 py-1 text-xs"
                  />
                }
              >
                <Ban className="h-3 w-3" />
                Banned
              </TooltipTrigger>
              {user.banReason && (
                <TooltipContent>Reason: {user.banReason}</TooltipContent>
              )}
            </Tooltip>
            {user.banExpires && (
              <span className="text-xs text-muted-foreground">
                Expires: {format(user.banExpires, "MMM d, yyyy")}
              </span>
            )}
          </div>
        ) : (
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-200"
          >
            <Check className="h-3 w-3" />
            Active
          </Badge>
        );
      },
    },
    {
      id: "lastSignIn",
      header: "Last Sign In",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(row.original.updatedAt, "MMM d, yyyy 'at' h:mm a")}
        </span>
      ),
    },
    {
      id: "walletAddress",
      header: "Wallet Address",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.walletAddress}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => "Actions",
      cell: ({ row }) => (
        <UserActions
          user={row.original}
          onActionComplete={handleActionComplete}
        />
      ),
    },
  ];
}
