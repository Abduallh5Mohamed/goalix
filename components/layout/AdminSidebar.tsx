"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  ClipboardCheck,
  Trophy,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { toggleSidebarCollapse, setMobileSidebarOpen } from "@/lib/store/slices/uiSlice";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  ClipboardCheck,
  Trophy,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
};

interface NavItemProps {
  label: string;
  href?: string;
  icon?: string;
  children?: { label: string; href: string }[];
  collapsed: boolean;
}

function NavItem({ label, href, icon, children, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (children) {
      return children.some((c) => pathname.startsWith(c.href));
    }
    return false;
  });

  const Icon = icon ? iconMap[icon] : null;
  const isActive = href ? pathname === href : children?.some((c) => pathname.startsWith(c.href));

  const toggle = useCallback(() => setOpen((o) => !o), []);

  if (children && children.length > 0) {
    return (
      <div>
        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {Icon && <Icon className="h-4.5 w-4.5 shrink-0" />}
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform",
                  open && "rotate-180"
                )}
              />
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
            {children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname === child.href
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
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

  return (
    <Link
      href={href || "#"}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-4.5 w-4.5 shrink-0" />}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export function AdminSidebar() {
  const dispatch = useAppDispatch();
  const { sidebarCollapsed, mobileSidebarOpen } = useAppSelector((s) => s.ui);
  const navItems = NAV_ITEMS.admin;

  return (
    <>
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => dispatch(setMobileSidebarOpen(false))}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/50 bg-card transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-64",
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <Image
              src="/Logo.png"
              alt="GOLX"
              width={32}
              height={32}
              className="rounded-lg"
            />
            {!sidebarCollapsed && (
              <span className="text-lg font-bold text-foreground">GOLX</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => dispatch(toggleSidebarCollapse())}
            className="hidden lg:flex"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                sidebarCollapsed && "rotate-180"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => dispatch(setMobileSidebarOpen(false))}
            className="lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item, i) => (
              <NavItem key={i} {...item} collapsed={sidebarCollapsed} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/50 p-3">
          {!sidebarCollapsed && (
            <p className="text-center text-[10px] text-muted-foreground/50">
              GOLX Academy v1.0
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

export function AdminMobileToggle() {
  const dispatch = useAppDispatch();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => dispatch(setMobileSidebarOpen(true))}
      className="lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
