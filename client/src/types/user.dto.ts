import { roles } from "@/lib/permissions";
import { UserWithRole } from "better-auth/plugins/admin";

export interface User extends UserWithRole {
  walletAddress?: string;
}

export interface UserBriefResponseDto extends Pick<
  User,
  "id" | "name" | "image" | "walletAddress"
> {}

export interface UserCreateRequestDto {
  name: string;
  email: string;
  password: string;
  role: keyof typeof roles;
}
