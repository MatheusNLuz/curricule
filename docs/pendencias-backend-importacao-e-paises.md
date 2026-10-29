# Pendências de backend — importação e convenções por país

Registro para uma próxima etapa. Nenhuma implementação de backend foi feita nesta revisão.

## Atualização de 28/10/2026 — branch local

- O teste do perfil informado recebeu HTTP 999 do LinkedIn; o navegador foi enviado à barreira de autenticação. A leitura pública não foi contornada e a interface oferece texto/PDF.
- A extração de vaga evita botões, avisa sobre recorte ou fallback sem área principal e recusa páginas com múltiplas vagas estruturadas. O endereço da vaga do LinkedIn fornecido foi testado: antes importava cerca de 11.360 caracteres com controles; após priorizar a descrição específica, retornou cerca de 4.452 caracteres com responsabilidades e requisitos, sem os controles observados. Outras páginas podem mudar sua estrutura.
- Espanhol e Espanha foram integrados aos contratos, prompts, rótulos e seletores. Um teste isolado com dados fictícios na NVIDIA gerou análise, perguntas, LinkedIn, carta e currículo em espanhol e produziu HTML de exportação e DOCX. Isso não substitui o teste autenticado de ponta a ponta nem verifica todos os perfis e profissões.
- A pesquisa e as orientações utilizadas no currículo estão em [convencoes-curriculo-paises.md](convencoes-curriculo-paises.md).
- A nota da versão reavaliada aparece na biblioteca quando válida; edições existentes invalidam a nota. Respostas condicionais e opções agora são guardadas com formato versionado e convertidas para texto explícito na revisão de fatos; respostas anteriores continuam legíveis.
- A implementação local de duas etapas e os limites da avaliação estão em [avaliacao-duas-ias.md](avaliacao-duas-ias.md). Um teste autenticado concluiu análise e perguntas com aviso de revisão indisponível; a revisão por dois modelos foi confirmada em teste direto anterior, não nessa execução pela interface.
- Termos completos e política para a operação comercial continuam sujeitos à definição dos dados reais da operação e revisão jurídica. A seção atual de processamento não é substituto desses documentos.

## 1. Link de perfil do LinkedIn

- Relato: uma tentativa com link de perfil retornou erro. O endereço específico e a mensagem não foram fornecidos; ainda não há diagnóstico confirmado para esse caso.
- Reproduzir com o endereço e o erro exatos, respeitando privacidade e sem registrar tokens ou conteúdo pessoal em logs. Diferenciar perfil público incompleto, redirecionamento, exigência de autenticação, bloqueio, timeout e incompatibilidade do extrator.
- Preservar limites de rede, proteção contra SSRF e limites de tamanho/tempo. Não contornar login, paywall ou restrições de acesso. Manter texto e PDF como alternativas claras quando o perfil não puder ser lido.
- Critérios: testar página pública acessível, bloqueada, redirecionada, parcialmente disponível e erro de rede; avisar quando dados estiverem incompletos e preservar a revisão antes de usar.

## 2. Link da vaga

- Relato: o endereço foi lido, mas a extração incluiu a página inteira e texto de interface como “show more”.
- O extrator atual em `lib/web-source.ts` já tenta `JobPosting.description` estruturado e possui fallback de texto da página; investigar com o endereço real qual caminho foi usado antes de escolher a correção.
- Priorizar descrição estruturada e áreas semânticas de conteúdo; remover navegação, avisos, botões, rodapés e controles como “show more”, preservando responsabilidades, requisitos e formatação legível. Não inferir conteúdo escondido ou omitir trecho relevante silenciosamente.
- Se a página precisar de JavaScript, login ou não expuser uma descrição confiável, explicar a limitação e solicitar que a pessoa cole a descrição. Preservar conferência e edição antes da análise.
- Critérios: fixtures de páginas reais anonimizadas com JSON-LD, HTML semântico, conteúdo parcial, múltiplas vagas, links de navegação e texto “show more”; assegurar que não importa página irrelevante e que não quebra fontes atualmente aceitas.

## 3. Espanhol e Espanha

- A interface mostra as opções como **em preparação**. O servidor valida uma lista fechada de idiomas e regiões em `lib/analysis-contract.ts`; habilitá-las somente após atualizar contratos, persistência e fluxos completos.
- Acrescentar `es-ES` e `ES` em validações e opções apropriadas; verificar prompts de todas as etapas de IA, tradução e manutenção do idioma, rótulos do currículo, perguntas, revisão, exportação PDF/DOCX, LinkedIn, e registros anteriores.
- Testar geração integral em espanhol, sem mistura de idiomas, e os diferentes fluxos com seleção independente de idioma e país. Não trocar silenciosamente para português caso a opção não seja suportada.

## 4. Currículo por país

Existem convenções locais, mas elas variam por vaga, setor e empregador; não tratar modelos de apresentação como norma legal universal nem impor atributos pessoais desnecessários.

- **Espanha:** o serviço público espanhol recomenda currículo claro e conciso, normalmente até duas páginas; informa que foto não é necessária, embora possa ser conveniente em certos postos. Seu guia também menciona palavras-chave e sugere evitar detalhes pessoais como estado civil, religião e política. Fontes: [SEPE — Trabalhar na Espanha](https://www.sepe.es/HomeSepe/es/que-es-el-sepe/comunicacion-institucional/publicaciones/publicaciones-oficiales/listado-pub-eures/trabajar-en-espana.html) e [guia de CV e carta](https://www.sepe.es/SiteSepe/contenidos/personas/encontrar_empleo/encontrar_empleo_europa/pdf/2025/CV-y-CARTAS-de-PRESENTACION/2025_CV_Carta_Espa-a.pdf).
- **Canadá:** o Job Bank aconselha não incluir foto e dados pessoais desnecessários. [Fonte oficial](https://www.jobbank.gc.ca/findajob/resources/write-good-resume?wbdisable=true).
- **Europa:** Europass é um formato conhecido, porém não deve ser presumido obrigatório para todas as vagas. [Europass](https://europass.europa.eu/en/create-europass-cv) e [EURES](https://eures.europa.eu/jobseekers/europass_en).
- **Próxima etapa:** pesquisar individualmente Brasil, Portugal, EUA, Reino Unido e Alemanha em fontes oficiais atuais, documentar diferenças por país e profissão e testar orientações com dados fictícios. Manter estrutura legível por ATS, priorizar a vaga e oferecer escolha à pessoa usuária.

## 5. Condições de uso

A seção de processamento foi reunida em Privacidade/Condições de uso na interface. Antes de divulgar comercialmente, elaborar e revisar termos completos e política de privacidade para a operação real; não presumir que essa seção, isoladamente, substitui termos completos.

## 6. Duas IAs para análise e perguntas

- Pedido: avaliar o uso de duas IAs na análise do currículo e na geração de perguntas. Ainda é preciso definir os modelos e se as duas atuam em paralelo ou em etapas; não pressupor que personagens ou rótulos na interface comprovem modelos independentes.
- Investigar alternativas: análises independentes com consolidação ou uma IA que produz e outra que revisa; avaliar perguntas com base em evidências do currículo e da vaga, evitar repetição e invenção de fatos.
- Projetar limites de tempo, custo por análise e quantidade de chamadas; tratamento de falhas, respostas divergentes, provedor indisponível e retomada segura sem duplicação de cobrança. Os dados enviados e as condições dos provedores devem ser informados adequadamente.
- Validar com casos reais anonimizados: qualidade e pertinência das perguntas, consistência das notas, idioma escolhido, tempo de resposta e orçamento. Comparar com uma IA antes de decidir se a segunda realmente melhora o resultado.
- Não implementado nesta revisão. Respeitar limites dos provedores e não apresentar resultados sintéticos como análise real.

## 7. Nota revisada na biblioteca de currículos

- O cartão da biblioteca ainda não recebe `finalScores` na consulta existente. A interface oferece um link para consultar a análise, mas não apresenta um valor fictício.
- Na próxima etapa, incluir apenas o dado necessário na consulta já paginada, sem uma chamada extra por currículo, e mostrar a nota realmente vinculada à versão reavaliada. Distinguir claramente nota inicial, nota reavaliada e revisão pendente, inclusive registros antigos com dados ausentes ou inválidos.
- Testar isolamento por usuário, zero como nota válida, ausência de nota e comparação após alterações no currículo. Confirmar regras de invalidação da avaliação quando houver edições posteriores.

## 8. Perguntas com respostas condicionais e opções

- Quando apropriado para a pergunta, oferecer **Sim/Não**. Se a resposta for Sim, apresentar um campo para explicar; se for Não, permitir continuar sem exigir explicação. Preservar a resposta ao alternar, sem interpretar a ausência de explicação como experiência comprovada.
- Permitir perguntas de múltipla escolha e seleção de uma ou várias opções quando fizer sentido; manter resposta livre e uma opção para a pessoa escrever sua própria resposta. Não forçar alternativas em todas as perguntas.
- Definir contratos entre geração, persistência, interface e validação de fatos; diferenciar resposta negativa, sem resposta e resposta afirmativa com explicação. Não transformar opções sugeridas em afirmações confirmadas automaticamente.
- Testar perguntas com Sim/Não, múltipla escolha, texto livre, mudança de resposta, dados legados, acessibilidade e idioma escolhido. Não implementado nesta revisão.
