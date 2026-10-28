"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const subscribeToHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

function preferredTheme(): Theme {
  try {
    const saved = window.localStorage.getItem("curricule-theme") || window.localStorage.getItem("curriculy-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch { /* Storage can be unavailable in private or restricted browsers. */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [chosenTheme, setThemeState] = useState<Theme | null>(null);
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrated, serverHydrated);
  const theme = chosenTheme ?? (hydrated ? preferredTheme() : "light");

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try { window.localStorage.setItem("curricule-theme", theme); } catch { /* Keep theme switching available without storage. */ }
  }, [theme, hydrated]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState(theme === "dark" ? "light" : "dark"),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
