"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link
            href="/dashboard"
            prefetch={true}
            className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-lg group"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-line/60 group-hover:scale-105 transition-all">
              <Image
                src="/logo.jpg"
                alt="MedLens Logo"
                width={40}
                height={40}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-serif text-2xl font-bold text-ink tracking-tight">MedLens</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1.5" aria-label="Main navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                prefetch={true}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                  pathname.startsWith(href)
                    ? "bg-accent text-white shadow-xs font-semibold"
                    : "text-ink/70 hover:text-ink hover:bg-cream-100"
                )}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3.5">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-ink leading-tight">{user?.name}</p>
              <p className="text-2xs text-accent font-semibold uppercase tracking-wider mt-0.5">Administrator</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "text-ink/60 hover:text-flag-high hover:bg-flag-high/10 border border-line hover:border-flag-high/30 active:scale-95 transition-all",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              )}
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
