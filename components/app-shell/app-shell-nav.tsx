"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Add01Icon,
  Cancel01Icon,
  Clock01Icon,
  File02Icon,
  Home01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu, UserAvatar } from "@/components/app-shell/account-menu";
import { HugeIcon } from "@/components/ui/huge-icon";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CurriculeLogo } from "@/components/brand/curricule-logo";

const navigation = [
  { href: "/", label: "Início", icon: Home01Icon },
  { href: "/history", label: "Histórico", icon: Clock01Icon },
  { href: "/resumes", label: "Ver currículos", icon: File02Icon },
];

export function AppShellNav({ session }: { session: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isAuthRoute = pathname === "/login" || pathname === "/register";

  if (!session || isAuthRoute) {
    return (
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-8">
          <Brand />
          {!isAuthRoute && <nav aria-label="Conheça o Curricule" className="hidden items-center gap-7 text-xs font-medium text-muted-foreground lg:flex"><Link href="/#recursos" className="hover:text-primary">O que você recebe</Link><Link href="/#na-pratica" className="hover:text-primary">Experimente</Link><Link href="/#como-funciona" className="hover:text-primary">Como funciona</Link><Link href="/#duvidas" className="hover:text-primary">Dúvidas</Link></nav>}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isAuthRoute && <><Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-2 py-2 text-xs font-semibold hover:text-primary sm:px-3">Entrar</Link><Link href="/register?next=%2Fanalysis%2Fnew" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground sm:px-4">Começar</Link></>}
            {pathname === "/login" && (
              <Link href="/register" className="inline-flex min-h-11 items-center rounded-xl px-2 py-2 text-[12px] font-semibold text-primary transition-colors hover:bg-soft-primary sm:px-3 sm:text-[13px]">Criar conta</Link>
            )}
            {pathname === "/register" && (
              <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl px-2 py-2 text-[12px] font-semibold text-primary transition-colors hover:bg-soft-primary sm:px-3 sm:text-[13px]">Entrar</Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header data-app-shell-nav className="sticky top-0 z-30 hidden h-16 items-center justify-end border-b border-border/80 bg-background/90 pl-64 pr-8 backdrop-blur-xl md:flex">
        <AccountMenu session={session} />
      </header>

      <aside data-app-shell-nav className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/80 bg-surface/92 px-4 py-5 backdrop-blur-xl md:flex">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <ThemeToggle />
        </div>
        <div className="mt-10 flex flex-1 flex-col">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Seu espaço</p>
          <nav className="mt-3 space-y-1" aria-label="Navegação principal">
            {navigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}
          </nav>
          <Link href="/analysis/new" className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <HugeIcon icon={Add01Icon} size={17} />
            Nova análise
          </Link>
        </div>
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-3 px-2">
            <UserAvatar session={session} />
            <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{session.name || "Sua conta"}</p><p className="truncate text-[11px] text-muted-foreground">{session.email}</p></div>
          </div>
        </div>
      </aside>

      <header data-app-shell-nav className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Brand compact />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccountMenu session={session} />
            <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"} className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:bg-soft-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><HugeIcon icon={open ? Cancel01Icon : Menu01Icon} size={18} /></button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-surface px-4 py-3 shadow-lg">
            <nav className="grid gap-1" aria-label="Navegação principal">
              {navigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />)}
            </nav>
            <Link href="/analysis/new" onClick={() => setOpen(false)} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"><HugeIcon icon={Add01Icon} size={17} /> Nova análise</Link>
          </div>
        )}
      </header>

      <nav data-app-shell-nav className="fixed inset-x-0 bottom-0 z-40 grid min-h-16 grid-cols-3 border-t border-border bg-surface/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Navegação rápida">
        {navigation.map((item) => <NavItem key={item.href} item={item} pathname={pathname} compact />)}
      </nav>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <Link href={pathname === "/" ? "#page-top" : "/"} className="group inline-flex min-h-11 items-center gap-2 sm:gap-3" aria-label="Curricule, início">
      <CurriculeLogo className={cn("h-7 w-auto shrink-0 sm:h-8", compact && "sm:h-7")} aria-hidden="true" />
    </Link>
  );
}

function NavItem({ item, pathname, compact = false, onNavigate }: { item: typeof navigation[number]; pathname: string; compact?: boolean; onNavigate?: () => void }) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  return (
    <Link href={item.href} onClick={onNavigate} className={cn("group flex items-center gap-3 rounded-xl text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", compact ? "min-h-11 flex-col justify-center gap-1 px-2 py-2 text-[10px] leading-none" : "px-3 py-2.5", active ? "bg-soft-primary text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
      <HugeIcon icon={item.icon} size={compact ? 18 : 17} />
      <span>{item.label}</span>
      {!compact && active && <span className="ml-auto size-1.5 rounded-full bg-route" />}
    </Link>
  );
}
