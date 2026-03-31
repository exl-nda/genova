"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FileStack,
    BookOpen,
    Brain,
    BarChart3,
    FlaskConical,
    PanelLeftClose,
    PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/applications", label: "HDA Forms", icon: FileStack },
    { href: "/rules", label: "Rules Management", icon: BookOpen },
    { href: "/competency", label: "Competency Model", icon: Brain },
    { href: "/methodology", label: "Score Methodology", icon: FlaskConical },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                "flex flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-[width] duration-200",
                collapsed ? "w-[56px]" : "w-56"
            )}
        >
            <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-3">
                {!collapsed && (
                    <span className="font-semibold text-sm truncate">Genova</span>
                )}
                <Button variant="ghost" size="icon" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
                    {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </Button>
            </div>
            <nav className="flex-1 space-y-0.5 p-2">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-[var(--foreground)]/10 text-[var(--foreground)]"
                                    : "text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {!collapsed && <span>{label}</span>}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
