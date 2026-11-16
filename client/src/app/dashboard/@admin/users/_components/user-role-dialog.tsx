"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roles } from "@/lib/permissions";
import { updateUserRole } from "@/services/user.service";
import { User } from "@/types";

interface UserRoleDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = Object.keys(roles).map((role) => ({
  value: role,
  label: role.charAt(0).toUpperCase() + role.slice(1),
}));

export function UserRoleDialog({ user, isOpen, onClose }: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user.role || "user");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateRole = async () => {
    try {
      setIsLoading(true);
      await updateUserRole(user.id!, selectedRole);
      toast.success(`User role updated to ${selectedRole}`);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleUpdateRole}
      title={`Update Role: ${user.name || user.email}`}
      description="Change the user's role in the system."
      confirmText={isLoading ? "Processing..." : "Update Role"}
    >
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="role">Select Role</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="hover:bg-muted"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ConfirmationDialog>
  );
}
