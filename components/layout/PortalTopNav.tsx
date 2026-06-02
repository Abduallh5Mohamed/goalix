"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Baby,
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Ruler,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
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
import { DashboardBrand } from "@/components/layout/DashboardBrand";
import { NAV_ITEMS, ROLE_ROUTES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { useAuth, useCurrentUser } from "@/lib/auth/auth-context";
import { cn, getInitials } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Baby,
  BarChart3,
  Bell,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Home,
  LayoutDashboard,
  Ruler,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  Users,
};

const roleTitles: Record<UserRole, string> = {
  admin: "Admin Command Center",
  coach: "Coach Portal",
  player: "Player Portal",
  parent: "Parent Portal",
};

type NavItem = {
  label: string;
  href?: string;
  icon?: string;
  children?: { label: string; href: string }[];
};

function isItemActive(pathname: string, item: NavItem) {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
    return true;
  }

  return Boolean(item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)));
}

function TopNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isItemActive(pathname, item);
  const Icon = item.icon ? iconMap[item.icon] : null;

  if (item.children?.length) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
              active
                ? "border-lime-300 bg-lime-300/10 text-lime-300 shadow-[0_0_22px_rgba(182,255,0,0.18)]"
                : "border-transparent text-slate-300 hover:border-cyan-300/30 hover:bg-white/[0.04] hover:text-white"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-56 border-[#284762] bg-[#07172a]/95 p-2 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <DropdownMenuLabel className="text-xs uppercase tracking-[0.22em] text-lime-300/80">
            {item.label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#284762]" />
          {item.children.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <DropdownMenuItem key={child.href} asChild className="cursor-pointer rounded-lg p-0">
                <Link
                  href={child.href}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-sm transition",
                    childActive ? "bg-lime-300/10 text-lime-300" : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  {child.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-lime-300 bg-lime-300/10 text-lime-300 shadow-[0_0_22px_rgba(182,255,0,0.18)]"
          : "border-transparent text-slate-300 hover:border-cyan-300/30 hover:bg-white/[0.04] hover:text-white"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {item.label}
    </Link>
  );
}

function MobileNavItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  const Icon = item.icon ? iconMap[item.icon] : null;
  const active = isItemActive(pathname, item);

  return (
    <div className="rounded-2xl border border-[#253f5a] bg-white/[0.025] p-2">
      {item.href ? (
        <Link
          href={item.href}
          onClick={onNavigate}
          className={cn("flex items-center gap-3 rounded-xl px-3 py-3 font-semibold", active ? "bg-lime-300/10 text-lime-300" : "text-slate-200")}
        >
          {Icon && <Icon className="h-5 w-5" />}
          {item.label}
        </Link>
      ) : (
        <div className={cn("flex items-center gap-3 rounded-xl px-3 py-3 font-semibold", active ? "text-lime-300" : "text-slate-200")}>
          {Icon && <Icon className="h-5 w-5" />}
          {item.label}
        </div>
      )}
      {item.children && (
        <div className="grid gap-1 px-3 pb-2">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                "rounded-lg px-8 py-2 text-sm transition",
                pathname === child.href || pathname.startsWith(`${child.href}/`)
                  ? "bg-cyan-300/10 text-cyan-300"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortalTopNav({ role }: { role: UserRole }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useCurrentUser();
  const { logout } = useAuth();
  const nav = NAV_ITEMS[role] as NavItem[];

  return (
    <header className="goalix-portal-nav sticky top-0 z-40 border-b border-[#1c344e]/80 bg-[#030812]/86 px-4 py-3 text-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1840px] items-center gap-4">
        <DashboardBrand href={ROLE_ROUTES[role]} subtitle={roleTitles[role]} className="w-[210px] shrink-0" />

        <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
          {nav.map((item) => (
            <TopNavItem key={item.label} item={item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button className="relative hidden h-11 w-11 place-items-center rounded-full border border-[#2b4661] bg-white/[0.03] text-slate-100 transition hover:border-cyan-300/45 hover:text-cyan-200 sm:grid">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-lime-300 text-[11px] font-black text-[#06111f]">
              3
            </span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden items-center gap-3 rounded-full border border-[#2b4661] bg-white/[0.03] px-2 py-1.5 pr-4 transition hover:border-lime-300/40 md:flex">
                <Avatar className="h-9 w-9 border border-lime-300/30">
                  <AvatarFallback className="bg-[#07172a] text-sm font-bold text-lime-300">
                    {getInitials(user?.fullName || role)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-32 truncate text-sm font-semibold text-slate-200">
                  {user?.fullName || roleTitles[role]}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56 border-[#284762] bg-[#07172a]/95 p-2 text-slate-100 backdrop-blur-xl">
              <DropdownMenuLabel>
                <div className="text-sm">{user?.fullName || roleTitles[role]}</div>
                <div className="text-xs font-normal capitalize text-slate-400">{role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#284762]" />
              <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-red-300 focus:bg-red-500/10 focus:text-red-200">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon-sm"
            className="border-[#2b4661] bg-white/[0.03] text-white hover:border-cyan-300/45 hover:bg-cyan-300/10 xl:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="goalix-portal-mobile fixed inset-0 z-50 bg-[#020711]/95 p-4 backdrop-blur-xl xl:hidden">
          <div className="mb-5 flex items-center justify-between">
            <DashboardBrand href={ROLE_ROUTES[role]} subtitle={roleTitles[role]} className="w-[210px]" />
            <Button
              variant="outline"
              size="icon-sm"
              className="border-[#2b4661] bg-white/[0.03] text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid max-h-[calc(100vh-116px)] gap-2 overflow-y-auto pb-6">
            {nav.map((item) => (
              <MobileNavItem key={item.label} item={item} onNavigate={() => setMobileOpen(false)} />
            ))}
            <button
              onClick={logout}
              className="mt-2 flex items-center gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-4 font-semibold text-red-200"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
