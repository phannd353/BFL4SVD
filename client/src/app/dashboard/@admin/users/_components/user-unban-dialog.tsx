"use client";

import { useState } from "react";
import { toast } from "sonner";
import { unbanUser } from "@/services/user.service";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { User } from "@/types";

interface UserUnbanDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function UserUnbanDialog({
  user,
  isOpen,
  onClose,
}: UserUnbanDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUnbanUser = async () => {
    try {
      setIsLoading(true);
      await unbanUser(user.id);
      toast.success(`${user.name || user.email} has been unbanned.`);
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
      onConfirm={handleUnbanUser}
      title={`Unban User: ${user.name || user.email}`}
      description="This will restore the user's access to the platform."
      confirmText={isLoading ? "Processing..." : "Unban User"}
    />
  );
}
