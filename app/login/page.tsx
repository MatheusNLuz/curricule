"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth/next";
import { ArrowRight01Icon, LockPasswordIcon, Mail01Icon, SparklesIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/huge-icon";
import { useToast } from "@/components/ui/custom-toast";
import { getFetchErrorMessage, getOAuthCallbackUrl, readApiError } from "@/lib/api-client";
import { validateLogin, type FieldErrors } from "@/lib/form-validation";

const authClient = createAuthClient();

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const validationErrors = validateLogin({ email, password });
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Não foi possível entrar."));
      toast({ title: "Bem-vindo de volta", description: "Sua análise está pronta para continuar.", variant: "success" });
      const requestedPath = searchParams.get("next");
      const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";
      router.push(nextPath);
      router.refresh();
    } catch (error: unknown) {
      setFieldErrors({});
      const message = getFetchErrorMessage(error, "Não foi possível entrar agora.");
      setErrorMessage(message);
      toast({ title: "Não foi possível entrar", description: message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: getOAuthCallbackUrl(searchParams.get("next")),
      });
      if (error) throw new Error(error.message || "Não foi possível entrar com Google.");
    } catch (error: unknown) {
      const message = getFetchErrorMessage(error, "Não foi possível entrar com Google.");
      setErrorMessage(message);
      toast({ title: "Não foi possível entrar com Google", description: message, variant: "error" });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.85fr_1fr] lg:px-12">
      <div className="hidden lg:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Volte para sua rota</p>
        <h1 className="mt-4 max-w-[10ch] font-heading text-5xl font-semibold leading-[0.98] tracking-[-0.06em]">Seu próximo passo começa aqui.</h1>
        <p className="mt-6 max-w-[36ch] text-[14px] leading-7 text-muted-foreground">Um espaço para dar forma ao que você já construiu e clareza ao que vem depois.</p>
        <div className="mt-10 flex items-center gap-3 text-[12px] text-muted-foreground"><span className="grid size-9 place-items-center rounded-xl bg-soft-primary text-primary"><HugeIcon icon={SparklesIcon} size={17} /></span> Curriculy acompanha seu contexto.</div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 lg:hidden"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bem-vindo ao Curriculy</p><h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">Entre para continuar.</h1></div>
        <div className="surface rounded-[24px] p-6 shadow-[0_24px_80px_rgba(108,74,163,0.10)] sm:p-8">
          <div className="mb-8"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Seu espaço profissional</p><h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em]">Entrar na conta</h2><p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">Retome sua análise exatamente de onde parou.</p></div>
          <button type="button" onClick={handleGoogleSignIn} disabled={loading || googleLoading} className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <GoogleMark />
            {googleLoading ? "Conectando ao Google..." : "Continuar com Google"}
          </button>
          <div className="my-5 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>ou entre com e-mail</span><span className="h-px flex-1 bg-border" /></div>
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Field label="E-mail" icon={Mail01Icon} htmlFor="email"><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); setErrorMessage(null); }} placeholder="voce@email.com" className="auth-input" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "login-email-error" : undefined} />{fieldErrors.email && <p id="login-email-error" className="text-[12px] leading-relaxed text-signal" role="alert">{fieldErrors.email}</p>}</Field>
            <Field label="Senha" icon={LockPasswordIcon} htmlFor="password"><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); setErrorMessage(null); }} placeholder="Sua senha" className="auth-input pr-11" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "login-password-error" : undefined} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"> <HugeIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={17} /> </button></div>{fieldErrors.password && <p id="login-password-error" className="text-[12px] leading-relaxed text-signal" role="alert">{fieldErrors.password}</p>}</Field>
            {errorMessage && <p id="login-form-error" className="rounded-xl border border-signal/25 bg-signal/10 px-3 py-2.5 text-[12px] leading-relaxed text-signal" role="alert">{errorMessage}</p>}
            <button type="submit" disabled={loading || googleLoading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">{loading ? "Conectando..." : "Entrar"}<HugeIcon icon={ArrowRight01Icon} size={17} /></button>
          </form>
          <p className="mt-7 border-t border-border pt-5 text-center text-[12px] text-muted-foreground">Não tem uma conta? <Link href="/register" className="font-semibold text-primary hover:underline">Cadastre-se gratuitamente</Link></p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4.2 6v5h6.8c4-3.7 6-9 6-14.7Z" />
      <path fill="#34A853" d="M24 44c5.4 0 10-1.8 13.4-4.8l-6.8-5c-1.9 1.3-4.2 2.1-6.6 2.1-5.1 0-9.5-3.4-11.1-8H5.9v5.2C9.2 39.8 16 44 24 44Z" />
      <path fill="#FBBC05" d="M12.9 28.3a12 12 0 0 1 0-8.6v-5.2H5.9a20 20 0 0 0 0 19l7-5.2Z" />
      <path fill="#EA4335" d="M24 11.7c2.9 0 5.5 1 7.5 3l5.8-5.8C33.7 5.6 29.2 4 24 4 16 4 9.2 8.2 5.9 14.5l7 5.2c1.6-4.6 6-8 11.1-8Z" />
    </svg>
  );
}

function Field({ label, icon, htmlFor, children }: { label: string; icon: Parameters<typeof HugeIcon>[0]["icon"]; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label htmlFor={htmlFor} className="flex items-center gap-2 text-[12px] font-semibold text-foreground"><HugeIcon icon={icon} size={15} className="text-primary" /> {label}</label>{children}</div>;
}
