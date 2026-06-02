"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Baby,
  BarChart3,
  Bell,
  BrainCircuit,
  Cake,
  Calendar,
  CheckCheck,
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
  MessageSquare,
  RefreshCw,
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
import { getNotificationHref } from "@/lib/notifications";
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/lib/store/api/calendarApi";
import type { UserRole } from "@/lib/types";
import { useAuth, useCurrentUser } from "@/lib/auth/auth-context";
import { cn, formatDateTime, getInitials } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Baby,
  BarChart3,
  Bell,
  BrainCircuit,
  Cake,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageSquare,
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(undefined, { pollingInterval: 60000 });
  const { data: unreadCountFromApi } = useGetUnreadNotificationsCountQuery(undefined, {
    pollingInterval: 60000,
  });
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, markAllNotificationsReadState] = useMarkAllNotificationsReadMutation();
  const notifications = notificationsData?.data ?? [];
  const unreadCount = typeof unreadCountFromApi === "number"
    ? unreadCountFromApi
    : notifications.filter((item) => !item.is_read).length;

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
          {nav.map((item) => {
            const Icon = (item.icon && iconMap[item.icon]) || LayoutDashboard;
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
            <div className="goalix-reference-notifications">
              <button
                type="button"
                className="goalix-reference-notification-trigger"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="goalix-reference-notification-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="goalix-reference-notification-panel" role="dialog" aria-label="Notifications">
                  <div className="goalix-reference-notification-head">
                    <div>
                      <strong>Notifications</strong>
                      <small>{unreadCount} unread</small>
                    </div>
                    <div>
                      <button
                        type="button"
                        aria-label="Refresh notifications"
                        onClick={() => refetchNotifications()}
                      >
                        <RefreshCw size={14} />
                      </button>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          disabled={markAllNotificationsReadState.isLoading}
                          onClick={() => markAllNotificationsRead()}
                        >
                          <CheckCheck size={14} />
                          <span>Read all</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="goalix-reference-notification-list">
                    {notificationsLoading ? (
                      <div className="goalix-reference-notification-empty">Loading notifications...</div>
                    ) : notificationsError ? (
                      <div className="goalix-reference-notification-empty">Could not load notifications.</div>
                    ) : notifications.length ? (
                      notifications.slice(0, 8).map((notification) => (
                        <Link
                          key={notification.id}
                          href={getNotificationHref(role, notification.type, notification.data)}
                          className={cn(
                            "goalix-reference-notification-row",
                            !notification.is_read && "is-unread",
                          )}
                          onClick={() => {
                            setNotificationsOpen(false);
                            if (!notification.is_read) {
                              markNotificationRead(notification.id);
                            }
                          }}
                        >
                          <span />
                          <div>
                            <strong>{notification.title}</strong>
                            <p>{notification.body}</p>
                            <small>{formatDateTime(notification.created_at)}</small>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="goalix-reference-notification-empty">No notifications yet.</div>
                    )}
                  </div>

                  <Link
                    className="goalix-reference-notification-all"
                    href={`/${role}/notifications`}
                    onClick={() => setNotificationsOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
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
