"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import styles from "@/app/landing.module.css";

const goals = [
  { label: "Quero melhorar meu currículo", mode: "MAKE_ATS_FRIENDLY", title: "Comece com uma revisão do seu currículo.", text: "Veja o que pode ficar mais claro na estrutura e no conteúdo, mesmo sem ter uma vaga em mente.", input: "Seu currículo em PDF ou texto", output: "Análise, recomendações e revisão do conteúdo", cta: "Revisar meu currículo" },
  { label: "Encontrei uma vaga", mode: "OPTIMIZE_FOR_JOB", title: "Prepare uma candidatura com contexto.", text: "Compare seu material com os requisitos, responda às perguntas sobre sua experiência e revise uma versão direcionada.", input: "Seu currículo + link ou descrição da vaga", output: "Comparação, perguntas e currículo para revisar", cta: "Preparar para uma vaga" },
  { label: "Meu LinkedIn precisa de atenção", mode: "LINKEDIN_OPTIMIZATION", title: "Dê mais clareza ao seu perfil profissional.", text: "Analise o que seu título, Sobre e experiências comunicam. Receba sugestões a partir do conteúdo que você fornecer.", input: "Link público, PDF ou texto do perfil", output: "Sugestões de título, Sobre e experiências", cta: "Revisar meu LinkedIn" },
  { label: "Preciso de uma carta", mode: "COVER_LETTER_ONLY", title: "Conecte sua trajetória à oportunidade.", text: "Use seu currículo e a vaga para preparar uma carta de apresentação que você pode conferir e ajustar antes de enviar.", input: "Seu currículo + link ou descrição da vaga", output: "Carta de apresentação para revisar", cta: "Preparar minha carta" },
];
export function GoalPicker() {
  const [selected, setSelected] = useState(0);
  const goal = goals[selected];
  const destination = `/register?${new URLSearchParams({ next: `/analysis/new?mode=${goal.mode}` })}`;
  return <div className={styles.goalPicker}><div className={styles.goalOptions} role="group" aria-label="Qual é seu objetivo agora?">{goals.map((item, index) => <button key={item.mode} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}>{item.label}<span>{index === selected ? <Check size={17} aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}</span></button>)}</div><div className={styles.goalResult} aria-live="polite" aria-atomic="true"><h3 key={goal.mode} className={styles.goalTitle}>{goal.title}</h3><p key={goal.mode + ":copy"}>{goal.text}</p><dl key={goal.mode + ":details"}><div><dt>Você traz</dt><dd>{goal.input}</dd></div><div><dt>Você recebe</dt><dd>{goal.output}</dd></div></dl><Link href={destination} className={styles.primary}>{goal.cta}<ArrowUpRight size={18} aria-hidden="true" /></Link><p className={styles.goalNote}>Crie sua conta para começar pelo objetivo escolhido.</p></div></div>;
}
