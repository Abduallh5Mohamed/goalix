"use client";

import { useAuth, useCurrentUser } from "@/lib/auth/auth-context";
import { AdminMobileToggle } from "./AdminSidebar";
import { SearchInput } from "@/components/shared/SearchInput";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, Settings } from "lucide-react";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

export function AdminHeader() {
  const { user } = useCurrentUser();
  const { logout } = useAuth();
  const displayIdentifier = user?.email || user?.username || "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-card/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <AdminMobileToggle />
        <SearchInput
          placeholder="Search players, coaches, groups..."
          className="hidden w-80 sm:block"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link href="/admin/notifications">
          <Button variant="ghost" size="icon-sm" className="relative">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              3
            </span>
          </Button>
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                  {user ? getInitials(user.fullName) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground sm:block">
                {user?.fullName ?? "Guest"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{displayIdentifier}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
