"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu, UserAvatar } from "@/components/app-shell/account-menu";
import { CurriculeLogo } from "@/components/brand/curricule-logo";
import { Layout, Plus, FileText, RefreshCw, Key, ShieldCheck, ChevronRight } from "@/components/ui/app-icon";
import type { SessionUser } from "@/lib/auth";
import { pageTitle } from "@/lib/page-title";
const navigation = [
 { href:"/dashboard",label:"Meu espaço",mobile:"Início",icon:Layout },
 { href:"/analysis/new",label:"Nova análise",mobile:"Criar",icon:Plus },
 { href:"/resumes",label:"Meus currículos",mobile:"Currículos",icon:FileText },
 { href:"/history",label:"Histórico",mobile:"Histórico",icon:RefreshCw },
];
export function AppShellNav({session}:{session:SessionUser|null}){
 const pathname=usePathname();
 if(pathname==="/login"||pathname==="/register")return null;
 if(!session)return <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-8"><Link href={pathname==="/"?"#page-top":"/"} className="inline-flex min-h-11 items-center" aria-label="Curricule, início"><CurriculeLogo className="h-7 w-auto sm:h-8"/></Link><nav aria-label="Conheça o Curricule" className="hidden items-center gap-7 text-xs font-medium text-muted-foreground lg:flex"><Link href="/#recursos">O que você recebe</Link><Link href="/#na-pratica">Experimente</Link><Link href="/#como-funciona">Como funciona</Link><Link href="/#duvidas">Dúvidas</Link></nav><div className="flex items-center gap-2"><ThemeToggle/><Link href="/login" className="inline-flex min-h-11 items-center px-2 text-xs font-semibold sm:px-3">Entrar</Link><Link href="/register?next=%2Fanalysis%2Fnew" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground sm:px-4">Começar</Link></div></div></header>;
 const active=(href:string)=>href==="/analysis/new"?pathname.startsWith("/analysis"):pathname===href;
 return <div className="curricule-shell" data-app-shell-nav><aside className="sidebar" aria-label="Navegação do aplicativo"><Link href="/dashboard" className="brand" aria-label="Curricule, meu espaço"><CurriculeLogo/></Link><nav aria-label="Navegação principal">{navigation.map(item=><Link key={item.href} href={item.href} className={active(item.href)?"active":""} aria-current={active(item.href)?"page":undefined}><item.icon size={20}/><span>{item.label}</span></Link>)}</nav><nav className="secondaryNav" aria-label="Conta e administração"><Link href="/settings/billing"><Key size={20}/><span>Acesso e cobrança</span></Link>{session.role==="ADMIN"&&<Link href="/admin"><ShieldCheck size={20}/><span>Administração</span></Link>}</nav><Link className="account" href="/settings/billing"><UserAvatar session={session}/><span><strong>{session.name||"Sua conta"}</strong><small>{session.email}</small></span><ChevronRight size={16}/></Link></aside><header className="topbar workspaceTopbar"><nav className="breadcrumbs" aria-label="Caminho da página"><Link href="/dashboard">Curricule</Link><ChevronRight size={13}/><strong aria-current="page">{pageTitle(pathname)}</strong></nav><div className="topbarRight"><ThemeToggle/><AccountMenu session={session}/></div></header><nav className="mobileNav" aria-label="Navegação rápida">{navigation.map(item=><Link key={item.href} href={item.href} className={active(item.href)?"active":""} aria-current={active(item.href)?"page":undefined}><span className="mobileNavIcon"><item.icon size={20}/></span><span>{item.mobile}</span></Link>)}</nav></div>;
}
