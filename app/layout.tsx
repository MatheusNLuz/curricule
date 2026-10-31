import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./workspace.css";
import { Topbar } from "@/components/app-shell/topbar";
import { ToastProvider } from "@/components/ui/custom-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { getSessionUser } from "@/lib/auth";
import { GuideProvider } from "@/components/mascot/guide-provider";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#171a19" },
  ],
};

const themeInitScript = `
  (function () {
    try {
      var saved = window.localStorage.getItem("curricule-theme") || window.localStorage.getItem("curriculy-theme");
      var preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var theme = saved === "dark" || saved === "light" ? saved : preferred;
      var root = document.documentElement;
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
    } catch (error) {}
  })();
`;

export const metadata: Metadata = {
  title: { default: "Curricule - Início", template: "Curricule - %s" },
  description: "Organize seu currículo, entenda uma oportunidade e prepare uma candidatura que representa sua história.",
  keywords: ["currículo", "vagas", "candidatura", "resume", "perfil profissional"],
  openGraph: {
    title: "Curricule",
    description: "Um espaço calmo para melhorar seu currículo e preparar sua próxima candidatura.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Curricule",
    description: "Um espaço calmo para melhorar seu currículo e preparar sua próxima candidatura.",
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();

  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <GuideProvider key={session?.userId || "public"} userId={session?.userId}>
          <ToastProvider>
            <div id="page-top" className="flex min-h-screen flex-col">
              <a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring">
                Ir para o conteúdo principal
              </a>
              <Topbar session={session} />
              <main id="main-content" tabIndex={-1} className={session ? "workspaceMain min-w-0 flex-1" : "min-w-0 flex-1"}>{children}</main>
            </div>
          </ToastProvider>
          </GuideProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
