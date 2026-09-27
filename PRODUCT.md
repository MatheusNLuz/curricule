# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas em busca de oportunidades de trabalho em qualquer área profissional, usando o produto para melhorar currículo, LinkedIn e materiais de candidatura conforme o próprio perfil e a vaga desejada.

## Product Purpose

O produto analisa e aprimora materiais profissionais para ajudar a pessoa candidata a se apresentar melhor em processos seletivos, adaptando recomendações ao seu histórico e ao contexto da oportunidade.

## Positioning

Um otimizador de candidatura generalista, capaz de se adaptar a diferentes perfis profissionais e tipos de vaga em vez de assumir um único nicho de carreira.

## Operating Context

A pessoa pode enviar um currículo em PDF ou colar seu texto, informar uma descrição de vaga quando necessário, revisar recomendações, responder perguntas de contexto, editar o resultado e exportar os materiais finais.

## Capabilities and Constraints

- O sistema existente oferece análise ATS, comparação com vaga, otimização completa, otimização de LinkedIn e geração de carta de apresentação.
- Nesta etapa, o comportamento de análise, otimização e demais fluxos de backend deve permanecer inalterado.
- A única exceção de backend autorizada nesta etapa é a migração da autenticação atual para Neon Auth.
- A interface deve funcionar bem em telas móveis e desktop.

## Brand Commitments

- O produto se chama Curriculy.
- A assinatura de marca pode comunicar a ideia de um perfil profissional pronto para a próxima oportunidade.
- A identidade visual deve evitar aparência genérica ou claramente gerada por IA.
- A interface deve usar ReactBits e HugeIcons de forma coerente e intencional.

## Evidence on Hand

- Código existente do produto em `app/`, `components/`, `lib/` e `prisma/`.
- Fluxos funcionais existentes para currículo, vaga, LinkedIn, perguntas, revisão e exportação.
- Não há depoimentos, métricas de mercado ou outros ativos de prova fornecidos; não inventar esses elementos.

## Product Principles

- Adaptar a experiência ao perfil profissional e à vaga, sem presumir uma área específica.
- Preservar a veracidade das informações da candidatura.
- Reduzir fricção para concluir uma candidatura de qualidade.
- Priorizar clareza, confiança e uso confortável em dispositivos móveis.
