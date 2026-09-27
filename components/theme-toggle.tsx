"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "@/components/theme-provider";
import { HugeIcon } from "@/components/ui/huge-icon";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-soft-primary text-primary transition-colors hover:border-primary/45 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <HugeIcon icon={isDark ? Sun03Icon : Moon02Icon} size={17} />
    </button>
  );
}
