"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/workspace/auth-layout";
import { useRouter, useSearchParams } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth/next";
import { ArrowRight01Icon, LockPasswordIcon, Mail01Icon, UserIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { GoogleMark } from "@/components/auth/google-mark";
import { HugeIcon } from "@/components/ui/huge-icon";
import { useToast } from "@/components/ui/custom-toast";
import { getFetchErrorMessage, readApiError } from "@/lib/api-client";
import { createGoogleSignInOptions } from "@/lib/auth/google-sign-in";
import { validateRegistration, type FieldErrors } from "@/lib/form-validation";

const authClient = createAuthClient();

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const { error } = await authClient.signIn.social(createGoogleSignInOptions(searchParams.get("next")));
      if (error) throw new Error(error.message || "Não foi possível cadastrar com Google.");
    } catch (error: unknown) {
      const message = getFetchErrorMessage(error, "Não foi possível cadastrar com Google.");
      setErrorMessage(message);
      toast({ title: "Não foi possível cadastrar com Google", description: message, variant: "error" });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const validationErrors = validateRegistration({ name, email, password });
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Não foi possível criar sua conta."));
      toast({ title: "Espaço criado", description: "Agora você já pode começar uma análise.", variant: "success" });
      const requestedPath = searchParams.get("next");
      const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";
      router.push(nextPath);
      router.refresh();
    } catch (error: unknown) {
      setFieldErrors({});
      const message = getFetchErrorMessage(error, "Não foi possível criar sua conta agora.");
      setErrorMessage(message);
      toast({ title: "Não foi possível criar a conta", description: message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (<AuthLayout register><div><h1>Crie seu espaço.</h1><p>Reúna suas versões e prepare sua próxima candidatura.</p></div>
          <button type="button" onClick={handleGoogleSignUp} disabled={loading || googleLoading} className="googleButton">
            <GoogleMark />
            {googleLoading ? "Conectando ao Google..." : "Cadastrar-se com Google"}
          </button>
          <div className="or"><span className="h-px flex-1 bg-border" /><span>ou cadastre-se com e-mail</span><span className="h-px flex-1 bg-border" /></div>
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Field label="Como podemos chamar você?" icon={UserIcon} htmlFor="name"><input id="name" type="text" autoComplete="name" required maxLength={120} value={name} onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, name: undefined })); setErrorMessage(null); }} placeholder="Seu nome" className="auth-input" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "register-name-error" : undefined} />{fieldErrors.name && <p id="register-name-error" className="text-[12px] leading-relaxed text-signal" role="alert">{fieldErrors.name}</p>}</Field>
            <Field label="E-mail" icon={Mail01Icon} htmlFor="email"><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); setErrorMessage(null); }} placeholder="voce@email.com" className="auth-input" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "register-email-error" : undefined} />{fieldErrors.email && <p id="register-email-error" className="text-[12px] leading-relaxed text-signal" role="alert">{fieldErrors.email}</p>}</Field>
            <Field label="Crie uma senha" icon={LockPasswordIcon} htmlFor="password"><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); setErrorMessage(null); }} placeholder="Pelo menos 8 caracteres" className="auth-input pr-11" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "register-password-error" : undefined} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><HugeIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={17} /></button></div>{fieldErrors.password && <p id="register-password-error" className="text-[12px] leading-relaxed text-signal" role="alert">{fieldErrors.password}</p>}</Field>
            {errorMessage && <p id="register-form-error" className="rounded-xl border border-signal/25 bg-signal/10 px-3 py-2.5 text-[12px] leading-relaxed text-signal" role="alert">{errorMessage}</p>}
            <button type="submit" disabled={loading || googleLoading} className="button primary fullWidth">{loading ? "Cadastrando..." : "Criar Conta"}<HugeIcon icon={ArrowRight01Icon} size={17} /></button>
          </form>
          <p className="authSwitch">Já possui uma conta? <Link href="/login" className="font-semibold text-primary hover:underline">Faça login</Link></p>
<div className="authAssurance"><HugeIcon icon={LockPasswordIcon} size={18} /><p>Você revisa os fatos. Você dá a palavra final.</p></div><p className="text-xs leading-6 text-muted-foreground">Antes de enviar seus materiais, conheça <Link href="/privacy" className="underline">como tratamos seus dados</Link>. A IA pode cometer erros; você revisa o resultado antes de usar.</p></AuthLayout>);
}

function Field({ label, icon, htmlFor, children }: { label: string; icon: Parameters<typeof HugeIcon>[0]["icon"]; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label htmlFor={htmlFor} className="flex items-center gap-2 text-[12px] font-semibold text-foreground"><HugeIcon icon={icon} size={15} className="text-primary" /> {label}</label>{children}</div>;
}
