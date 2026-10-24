# Gestão Acadêmica com Assistente de IA — Desafio Codgo.X

[![CI](https://github.com/riverofernandes/codgo-gestao-academica/actions/workflows/ci.yml/badge.svg)](https://github.com/riverofernandes/codgo-gestao-academica/actions/workflows/ci.yml)

Aplicação full stack para consultar alunos, visualizar a situação financeira e fazer perguntas a um assistente de IA (Anthropic Claude) sobre os dados acadêmicos **fictícios**.

- **Back-end:** Node.js + Express + TypeScript (`backend/`)
- **Front-end:** React + Vite + TypeScript (`frontend/`)
- **IA:** Anthropic Claude via SDK oficial `@anthropic-ai/sdk`, com **modo demonstrativo** quando não há chave
- **Testes:** Vitest + Supertest (back-end) e Vitest + Testing Library (front-end)

---

## Como executar localmente

Pré-requisito: **Node.js 22.12+** (testado com Node 25 / npm 11).

```bash
npm install            # instala back-end e front-end (npm workspaces)
cp backend/.env.example backend/.env   # opcional: configurar a chave da IA
npm run dev            # sobe API (http://localhost:3333) e web (http://localhost:5173)
```

Abra **http://localhost:5173**. O Vite faz proxy de `/api` para o back-end, então o front-end não conhece URLs nem segredos.

Outros comandos (na raiz):

| Comando | O que faz |
|---|---|
| `npm test` | Roda todos os testes (back-end e front-end) |
| `npm run typecheck` | Checagem de tipos dos dois projetos |
| `npm run build` | Build de produção dos dois projetos |
| `npm test -w backend` | Só os testes do back-end (inclui a regra financeira) |

### Configurando a integração com IA

1. Crie uma chave em https://console.anthropic.com/.
2. Copie `backend/.env.example` para `backend/.env` e preencha `ANTHROPIC_API_KEY=...`.
3. Reinicie `npm run dev`. O log da API mostra `Assistente: Claude` e as respostas na interface aparecem com o selo **IA (Claude)**.

| Variável | Padrão | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | _(vazia)_ | Sem ela, o assistente roda em **modo demonstrativo** |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Modelo usado |
| `ASSISTENTE_TIMEOUT_MS` | `30000` | Timeout da chamada ao LLM |
| `ASSISTENTE_LIMITE_REQUISICOES` | `10` | Máximo de perguntas ao assistente por IP na janela |
| `ASSISTENTE_LIMITE_JANELA_MS` | `60000` | Janela do limite (ms) |
| `ASSISTENTE_MODO` | — | `demonstrativo` força o modo local mesmo com chave |
| `TZ_NEGOCIO` | `America/Sao_Paulo` | Fuso usado para definir "hoje" na regra de vencimento |
| `PORT` | `3333` | Porta da API |

**Solução de problemas:** se toda pergunta retornar 503, veja o log da API — o motivo real (ex.: chave inválida, modelo indisponível na conta, parâmetro rejeitado) é registrado lá, sem expor a chave. A chamada usa `fallbacks: "default"` com o beta `server-side-fallback-2026-07-01`; se sua conta não aceitar esse beta, remova essas duas linhas em `backend/src/assistente/claude.ts`. Para testar a interface sem IA, use `ASSISTENTE_MODO=demonstrativo`.

> A chave existe **somente** em `backend/.env` (ignorado pelo git). Não há variáveis `VITE_*` com segredos — tudo que começa com `VITE_` é embutido no bundle do navegador.

---

## O que está implementado × demonstrado

| Item | Situação |
|---|---|
| API REST (`/api/alunos`, `/api/alunos/:id`, `/api/alunos/:id/financeiro`, `/api/assistente`) | ✅ Implementado |
| Validação (zod), envelope de erro único, 400/404/429/500/502/503/504 | ✅ Implementado |
| Limite de requisições no assistente (429 + `Retry-After`) | ✅ Implementado |
| CI no GitHub Actions (typecheck, testes e build em Node 22 e 24) | ✅ Implementado |
| Dados fictícios em memória (12 alunos) | ✅ Implementado |
| Regra de situação financeira + testes automatizados | ✅ Implementado |
| Integração real com Claude (SDK oficial, timeout, retry, tratamento de erros, recusa) | ✅ Implementado — **ativa quando `ANTHROPIC_API_KEY` está definida**. Validado com chave real (`claude-haiku-5-5`, respostas em ~1–2 s): perguntas do enunciado, resumo do aluno selecionado, pergunta sem aluno selecionado, dados inexistentes (CPF, notas, 2019 → responde que não há a informação) e tentativa de prompt injection (recusada). Também com SDK mockado (recusa, timeout, falha de conexão), chave inválida (→ 503) e timeout de 1 ms (→ 504) |
| Modo demonstrativo (sem chave) | ⚠️ **Demonstrativo**: não chama LLM. Reconhece algumas intenções por palavra-chave (inadimplentes, adimplentes, contagem por status de matrícula, resumo do aluno selecionado) e responde com os **dados reais**. Toda resposta vem com `modo: "demonstrativo"` e um selo na interface |
| Front-end: listagem, busca (nome/matrícula), detalhes, financeiro, assistente, loading/erro/vazio | ✅ Implementado |

Se o LLM falhar (timeout, chave inválida, indisponibilidade), a API **retorna erro** (503/504/502) e a interface mostra a mensagem — **não há fallback silencioso** para o modo demonstrativo, para que ninguém confunda uma resposta local com uma resposta da IA.

---

## API

Contrato completo em [`docs/API.md`](docs/API.md). Resumo:

| Método | Rota | Respostas |
|---|---|---|
| GET | `/api/alunos?busca=` | 200 · 400 (busca > 100 chars) |
| GET | `/api/alunos/:id` | 200 · 400 (id inválido) · 404 |
| GET | `/api/alunos/:id/financeiro` | 200 · 400 · 404 |
| POST | `/api/assistente` `{ pergunta, alunoId? }` | 200 · 400 · 404 · 429 (limite) · 502 (recusa) · 503 (IA indisponível) · 504 (timeout) |
| GET | `/api/saude` | 200 (modo do assistente e data de referência) |

Erros sempre no formato `{ "erro": { "codigo": "...", "mensagem": "..." } }`, sem stack trace.

---

## Decisões técnicas

- **Arquitetura em camadas no back-end:** `domain/` (regra financeira pura), `repositories/` (acesso aos dados em memória), `assistente/` (contexto + provedores de IA), `http/` (validação e erros), `app.ts` (rotas). `criarApp({ repo, assistente })` recebe as dependências, o que permite testar a API inteira com Supertest sem rede e com data fixa.
- **Situação financeira derivada, nunca armazenada.** É calculada a cada leitura a partir das parcelas (vencimento + valor pago). O front-end apenas exibe o que a API devolve.
- **"Hoje" injetado.** A regra recebe a data de referência como parâmetro (`hoje`), o servidor usa a data no fuso de negócio. Datas são strings `YYYY-MM-DD` comparadas lexicograficamente — evita bugs de fuso (`new Date("2026-10-10")` é dia 09 no Brasil).
- **Dinheiro em centavos (inteiros)** para evitar erros de ponto flutuante.
- **Seed com datas relativas:** uma parcela por mês (de 3 meses atrás a 1 mês à frente), ancorada 5 dias antes da data em que a API sobe — a parcela do mês corrente está sempre vencida e a do próximo mês sempre a vencer. Com datas fixas, em poucas semanas todos os alunos virariam inadimplentes e a demonstração perderia sentido. Um teste simula 2 anos de datas para garantir o comportamento estável.
- **Status de matrícula ≠ situação financeira.** `status` (ativa/trancada/cancelada/formada) e `situacaoFinanceira` (adimplente/inadimplente) são campos separados, tanto na API quanto no prompt da IA.
- **Busca no servidor**, sem acento e sem diferenciar maiúsculas (nome) ou por matrícula; o front usa debounce e cancela requisições obsoletas.
- **Provedor de IA abstrato** (`ProvedorAssistente`): Claude e modo demonstrativo implementam a mesma interface; trocar de LLM é trocar uma classe.

### IA com responsabilidade

- **Chave protegida:** só no back-end (`backend/.env`, ignorado pelo git); `.env.example` sem valores.
- **Minimização de dados:** o modelo recebe um contexto mínimo (`assistente/contexto.ts`): nome, matrícula, curso, status, situação financeira e totais vencidos. **Sem e-mail, ids internos ou campos legados.** Parcelas detalhadas só do aluno selecionado (quando o usuário seleciona um e pergunta sobre ele). Há teste garantindo isso.
- **Contra alucinação:** os fatos (contagens por status, situação de cada aluno, totais em reais já formatados) são **calculados no servidor** e enviados prontos; o system prompt manda responder **somente** com base em `<dados>` e dizer explicitamente quando a informação não existe. A pergunta do usuário vai delimitada em `<pergunta>` e é tratada como dado, não como instrução (mitiga prompt injection).
- **Falhas tratadas:** timeout → 504; falha de conexão, chave inválida, rate limit, erro 5xx → 503; recusa do modelo (`stop_reason: "refusal"`) → 502. Usa as classes de erro tipadas do SDK, `maxRetries: 1` e timeout configurável. Detalhes técnicos vão para o log do servidor, nunca para o cliente.
- **Recusa:** a chamada usa `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) — se um classificador de segurança recusar, a própria API re-executa em um modelo de fallback.
- **Custo/latência:** `output_config.effort: "low"` — perguntas factuais sobre poucos dados não precisam de raciocínio profundo.
- **Limite de uso:** o `/api/assistente` aceita no máximo 10 perguntas por minuto por IP (configurável). Acima disso responde `429 LIMITE_EXCEDIDO` com `Retry-After`, protegendo o custo do LLM contra abuso ou loops no cliente. O limite fica em memória — suficiente para uma instância; com várias instâncias, usaria um store compartilhado (ex.: Redis).

---

## Sustentação: "aluno com mensalidade em aberto aparece como adimplente"

### Possível causa-raiz

A situação financeira era tratada como um **dado armazenado ou inferido de um sinal errado**, e não derivada das parcelas. As causas mais prováveis (e que reproduzimos no seed — aluna **Carla Mendes Rocha**, matrícula `2023015`):

1. **Campo de status gravado e nunca recalculado** (`situacaoFinanceiraLegada: "adimplente"`): foi escrito quando o aluno estava em dia e não muda quando uma parcela vence sem pagamento.
2. **Regra olhando só o último pagamento / "existe algum pagamento?"**: a Carla pagou a parcela mais recente, mas tem uma parcela **mais antiga** vencida e em aberto — a regra "última parcela paga ⇒ adimplente" a classifica errado.
3. Fatores agravantes comuns: tratar **pagamento parcial** como quitação e comparar datas com `new Date()` em UTC (o dia "vira" no fuso errado).

### Como a correção foi implementada

- Uma **única função pura** — `calcularSituacaoFinanceira(parcelas, hoje)` em [`backend/src/domain/financeiro.ts`](backend/src/domain/financeiro.ts) — é a fonte de verdade:
  - parcela **paga** se `valorPago >= valor` (paga com atraso também conta como quitada);
  - parcela **vencida** se não quitada e `vencimento < hoje` (vencer **hoje** ainda não é atraso);
  - aluno **inadimplente** se existir **qualquer** parcela vencida, independentemente da ordem, do último pagamento ou de campos gravados.
- O repositório calcula a situação **a cada leitura**; o campo legado não é usado em regra nenhuma nem exposto pela API.
- O front-end **não recalcula** nada: exibe `situacaoFinanceira` / `parcela.situacao` vindos da API.

### Como validei

- **Testes unitários** da regra ([`backend/test/financeiro.test.ts`](backend/test/financeiro.test.ts)): cenário exato do bug (antiga em aberto + recente paga), pagamento parcial, pagamento com atraso, vencimento hoje × ontem, aluno sem parcelas, parcelas fora de ordem, passagem do tempo e data de referência inválida.
- **Teste de regressão na API** ([`backend/test/api.test.ts`](backend/test/api.test.ts)): a Carla, com o campo legado `adimplente`, aparece como **inadimplente** na listagem e no financeiro, e a parcela vencida mais recente dela está paga.
- **Verificação manual** na interface: a Carla aparece com o selo "Inadimplente" e a parcela vencida destacada.

### Como evitaria a reincidência

- **Fonte única de verdade:** status financeiro é sempre derivado (função pura, um lugar só), nunca persistido como verdade; se for necessário cache/denormalização, recalcular por evento (pagamento registrado, virada do dia) e reconciliar com job diário.
- **Testes de regressão** com o cenário do bug rodando no CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml): typecheck, testes e build a cada push e pull request). Com proteção de branch exigindo o CI verde, uma regressão não entra na `main`.
- **Contrato claro:** a API devolve a situação calculada; o front não tem lógica de negócio duplicada.
- **Datas sem horário e "hoje" injetável**, evitando bugs de fuso e tornando o comportamento testável.
- **Observabilidade:** um relatório/alerta comparando status persistido (legado) × status calculado ajudaria a detectar divergências em produção.

---

## Testes

```bash
npm test
```

Os mesmos comandos (`typecheck`, `test`, `build`) rodam no **GitHub Actions** a cada push e pull request, em Node 22 e 24.

- `backend/test/financeiro.test.ts` — regra financeira (9 cenários).
- `backend/test/api.test.ts` — endpoints, validações (incl. ids estritos: `1e1`, `0x3`, `true` → 400), 400/404/429/500/503, regressão do bug, modo demonstrativo.
- `backend/test/seed.test.ts` — garante que o seed relativo funciona em **qualquer dia** (2 anos simulados): competências únicas, nenhum pagamento no futuro e sempre os mesmos 6 inadimplentes.
- `backend/test/assistente.test.ts` — minimização do contexto enviado à IA, seleção de provedor, SDK mockado (resposta, recusa, timeout, falha de conexão). **Nenhum teste chama a API real.**
- `frontend/src/**/*.test.ts(x)` — formatação de moeda/data e componentes com `fetch` mockado.

---

## Estrutura

```
backend/
  src/
    domain/        regra financeira (pura) e utilitários de data
    data/seed.ts   alunos fictícios com datas relativas
    repositories/  acesso aos dados + busca
    assistente/    contexto mínimo, Claude, modo demonstrativo
    http/          validação (zod) e tratamento de erros
    app.ts         rotas Express
    server.ts      bootstrap
  test/
frontend/
  src/
    api/ hooks/ components/ utils/
docs/API.md        contrato da API
```

---

## Como usei ferramentas de IA no desenvolvimento

Usei o **Claude Code** como par de programação, com orquestração de sub-agentes:

1. **Leitura do enunciado e planejamento** — o agente principal leu o PDF, levantou os requisitos e definiu a arquitetura. Antes de dividir o trabalho, escrevi o **contrato da API** (`docs/API.md`) para que front e back não "adivinhassem" formatos.
2. **Back-end** — implementado pelo agente principal (regra financeira, API, integração com Claude, testes).
3. **Sub-agente de Front-end/UX/UI** — rodou em paralelo construindo o React a partir do contrato (um único agente para front e UX, para que dois agentes não editassem os mesmos arquivos).
4. **Sub-agente de QA** — depois que os dois lados existiam, executou os testes, exercitou a API (400/404/503/504) com `curl`, navegou pela interface no navegador e procurou chaves/segredos no repositório.

**Como validei o código gerado:** revisei cada arquivo, rodei typecheck/testes/build, testei os endpoints manualmente e a interface no navegador. As decisões de produto (regra "vencer hoje não é atraso", não haver fallback silencioso da IA, minimização dos dados enviados ao modelo, datas relativas no seed) foram tomadas e verificadas explicitamente — não aceitas às cegas.

---

> Todos os dados são fictícios. Nenhuma credencial, chave de API ou dado pessoal real está no repositório.
