"use client";
import { useState } from "react";
import { ArrowRight, Check, PencilLine, ShieldCheck } from "lucide-react";
import styles from "@/app/landing.module.css";

const examples = [
  { label: "Atendimento", role: "Assistente de atendimento", before: "Trabalhei com atendimento ao cliente, respondia dúvidas por e-mail e organizava os pedidos em planilhas.", after: "Atendimento a clientes por e-mail, esclarecimento de dúvidas e organização de pedidos em planilhas.", extra: "Também atendia os clientes pelo chat.", confirmed: "Atendimento a clientes por e-mail e chat, esclarecimento de dúvidas e organização de pedidos em planilhas." },
  { label: "Tecnologia", role: "Desenvolvedor front-end", before: "Fazia telas em React e TypeScript e trabalhava com o pessoal de design para deixar elas responsivas.", after: "Desenvolvimento de interfaces responsivas com React e TypeScript, em colaboração com a equipe de design.", extra: "Utilizava Git para versionar o código.", confirmed: "Desenvolvimento de interfaces responsivas com React e TypeScript, em colaboração com a equipe de design. Versionamento de código com Git." },
  { label: "Administrativo", role: "Assistente administrativo", before: "Eu cuidava de documentos, fazia controle de contas a pagar e ajudava a equipe com os relatórios do mês.", after: "Organização de documentos, controle de contas a pagar e apoio à elaboração de relatórios mensais da equipe.", extra: "Também fazia a conferência de notas fiscais.", confirmed: "Organização de documentos, conferência de notas fiscais, controle de contas a pagar e apoio à elaboração de relatórios mensais da equipe." },
];
export function ResumeDemo() {
  const [selected, setSelected] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const example = examples[selected];
  return <div className={styles.demo}>
    <div className={styles.demoHeader}><span><PencilLine size={16} aria-hidden="true" /> Laboratório de escrita</span><span>Simulação local</span></div>
    <div className={styles.demoTabs} role="group" aria-label="Escolha uma área para simular">{examples.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); setConfirmed(false); }}>{item.label}</button>)}</div>
    <div className={styles.labSource}><span>Texto original do exemplo</span><h3>{example.role}</h3><p>{example.before}</p></div>
    <div className={styles.confirmExperiment}><div><ShieldCheck size={17} aria-hidden="true" /><span>Uma informação a confirmar</span></div><p>“{example.extra}”</p><label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Confirmar essa informação no exemplo</label></div>
    <div className={styles.labResult}><span><ArrowRight size={15} aria-hidden="true" /> Texto sugerido nesta simulação</span><p key={`${selected}:${confirmed}`} aria-live="polite" aria-atomic="true">{confirmed ? example.confirmed : example.after}</p><div className={styles.demoInsight}><Check size={15} aria-hidden="true" /><span>{confirmed ? "A informação confirmada agora aparece no texto." : "A informação sem confirmação fica de fora."}</span></div></div>
    <p className={styles.demoFootnote}>Exemplos predefinidos para demonstrar a revisão. Nenhuma IA está sendo chamada.</p>
  </div>;
}
