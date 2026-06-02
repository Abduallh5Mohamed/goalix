"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Baby,
  BarChart3,
  Bell,
  Cake,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Ruler,
  Search,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { NAV_ITEMS, ROLE_ROUTES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { useAuth, useCurrentUser } from "@/lib/auth/auth-context";
import { cn, getInitials } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Baby,
  BarChart3,
  Bell,
  Cake,
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
  UserPlus,
  Users,
};

const roleLabels: Record<UserRole, string> = {
  admin: "Academy OS",
  coach: "Coach Hub",
  player: "Player Hub",
  parent: "Family Hub",
};

type NavItem = {
  label: string;
  href?: string;
  icon?: string;
  children?: { label: string; href: string }[];
};

function firstHref(item: NavItem) {
  return item.href ?? item.children?.[0]?.href ?? "#";
}

function isActive(pathname: string, item: NavItem) {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) return true;
  return Boolean(item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)));
}

export function DashboardFrame({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { logout } = useAuth();
  const nav = NAV_ITEMS[role] as NavItem[];
  const primaryNav = nav.slice(0, role === "admin" ? 9 : 8);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  return (
    <div className={`goalix-reference-frame goalix-reference-${role}`}>
      <aside className="goalix-reference-sidebar">
        <Link href={ROLE_ROUTES[role]} className="goalix-reference-brand" aria-label="Goalix dashboard home">
          <span className="goalix-reference-mark">G</span>
          <span>
            <strong>Goalix</strong>
            <small>{roleLabels[role]}</small>
          </span>
        </Link>

        <div className="goalix-reference-menu-label">Menu</div>
        <nav className="goalix-reference-nav">
          {primaryNav.map((item) => {
            const Icon = item.icon ? iconMap[item.icon] : LayoutDashboard;
            const active = isActive(pathname, item);
            const isOpen = openSections[item.label] ?? active;

            if (item.children?.length) {
              return (
                <div key={item.label} className={cn("goalix-reference-nav-group", isOpen && "is-open")}>
                  <button
                    type="button"
                    className={cn("goalix-reference-nav-item is-section", active && "is-active")}
                    aria-expanded={isOpen}
                    onClick={() => setOpenSections((current) => ({ ...current, [item.label]: !isOpen }))}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    <em>{item.children.length}</em>
                    <ChevronDown className="goalix-reference-chevron" size={15} />
                  </button>
                  <div className="goalix-reference-subnav">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);

                      return (
                        <Link key={child.href} href={child.href} className={cn("goalix-reference-subnav-link", childActive && "is-active")}>
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href ?? firstHref(item)}
                className={cn("goalix-reference-nav-item", active && "is-active")}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="goalix-reference-menu-label">General</div>
        <div className="goalix-reference-nav">
          <Link href={role === "admin" ? "/admin/settings" : ROLE_ROUTES[role]} className="goalix-reference-nav-item">
            <Settings size={17} />
            <span>Settings</span>
          </Link>
          <Link href={ROLE_ROUTES[role]} className="goalix-reference-nav-item">
            <HelpCircle size={17} />
            <span>Help</span>
          </Link>
          <button type="button" onClick={logout} className="goalix-reference-nav-item">
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>

        <div className="goalix-reference-download">
          <div className="goalix-reference-download-art" />
          <strong>Goalix AI Coach</strong>
          <p>Daily insights for performance, attendance and match readiness.</p>
          <button type="button">Open Insights</button>
        </div>
      </aside>

      <main className="goalix-reference-main">
        <header className="goalix-reference-topbar">
          <label className="goalix-reference-search">
            <Search size={18} />
            <input placeholder="Search players, sessions, matches..." />
            <kbd>Ctrl F</kbd>
          </label>

          <div className="goalix-reference-top-actions">
            <button type="button" aria-label="Messages">
              <Mail size={18} />
            </button>
            <button type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="goalix-reference-user">
              <span>{getInitials(user?.fullName || role)}</span>
              <div>
                <strong>{user?.fullName || roleLabels[role]}</strong>
                <small>{user?.email || `${role}@goalix.local`}</small>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
