"use client";

import { Search, Users, Shield, UserPlus, Pen } from "lucide-react";
import useSWR from "swr";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { UserAddDialog } from "./user-add-dialog";
import { IPaginatedResponse } from "@/interfaces/response.interface";
import { Button } from "@/components/ui/button";
import { roles } from "@/lib/permissions";
import { swrFetcher } from "@/helper/swrFetcher";
import { User as IUser } from "@/types";
import { SharedTable } from "@/components/shared/table";
import { getUserColumns } from "./user-colums";

export function UserTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [role, setRole] = useState(searchParams.get("role") || "all");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [debouncedEmail, setDebouncedEmail] = useState(email);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(email), 300);
    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (role !== "all") params.set("role", role);
    if (debouncedEmail) params.set("email", debouncedEmail);
    if (page) params.set("page", String(page));
    params.set("limit", String(limit));
    router.replace(`?${params.toString()}`);
  }, [role, debouncedEmail, page, router]);

  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (role !== "all") params.set("role", role);
    if (debouncedEmail) params.set("email", debouncedEmail);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return `/api/admin/users?${params.toString()}`;
  }, [role, debouncedEmail, page]);

  const { data, error, mutate, isLoading } = useSWR<IPaginatedResponse<IUser>>(
    swrKey,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    },
  );

  const handleActionComplete = useCallback(() => {
    mutate();
  }, [mutate]);

  const columns = useMemo<ColumnDef<IUser>[]>(
    () => getUserColumns({ handleActionComplete }),
    [handleActionComplete],
  );

  const filterControls = (
    <div className="mb-2 flex w-full flex-wrap items-end justify-between gap-2">
      <div className="flex items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search email..."
            className="w-[200px] rounded-md border bg-background py-2 pl-8 pr-2 text-sm"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={role}
          onValueChange={(value) => {
            if (value) setRole(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="flex w-[140px] items-center gap-2">
            <span className="flex items-center gap-2">
              {role === "admin" ? (
                <Shield className="h-4 w-4" />
              ) : role === "client" ? (
                <Pen className="h-4 w-4" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {role === "all"
                ? "All Roles"
                : role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Roles
              </span>
            </SelectItem>
            {Object.keys(roles).map((roleKey) => (
              <SelectItem key={roleKey} value={roleKey}>
                <span className="flex items-center gap-2">
                  {roleKey === "admin" ? (
                    <Shield className="h-4 w-4" />
                  ) : roleKey === "client" ? (
                    <Pen className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {roleKey.charAt(0).toUpperCase() + roleKey.slice(1)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => setIsAddDialogOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add a user
      </Button>
    </div>
  );

  if (error) return <div>{error.message}</div>;

  return (
    <SharedTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      setPage={setPage}
    >
      {filterControls}

      <UserAddDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => mutate()}
      />
    </SharedTable>
  );
}
