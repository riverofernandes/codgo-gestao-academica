# Contrato da API

Base: `http://localhost:3333/api` (no front-end, acessada via proxy do Vite em `/api`).

Valores monetários são **inteiros em centavos** (`*Centavos`). Datas são strings `YYYY-MM-DD`.

## Tipos

```ts
type StatusMatricula = "ativa" | "trancada" | "cancelada" | "formada";
type SituacaoFinanceira = "adimplente" | "inadimplente";
type SituacaoParcela = "paga" | "em_aberto" | "vencida";

interface AlunoResumo {
  id: number;
  nome: string;
  matricula: string;          // ex.: "2024001"
  curso: string;
  status: StatusMatricula;
  situacaoFinanceira: SituacaoFinanceira; // sempre calculada no back-end
}

interface AlunoDetalhe extends AlunoResumo {
  email: string;              // fictício
  dataIngresso: string;       // YYYY-MM-DD
  periodo: number;            // semestre atual
}

interface Parcela {
  id: string;                 // ex.: "1-2026-08"
  competencia: string;        // "YYYY-MM"
  vencimento: string;         // YYYY-MM-DD
  valorCentavos: number;
  valorPagoCentavos: number;
  pagoEm: string | null;      // YYYY-MM-DD
  situacao: SituacaoParcela;  // calculada
}

interface Financeiro {
  alunoId: number;
  situacao: SituacaoFinanceira;
  mensalidadeCentavos: number;
  resumo: {
    totalPagoCentavos: number;
    totalEmAbertoCentavos: number;   // tudo que falta pagar (vencido + a vencer)
    totalVencidoCentavos: number;    // só o que já venceu e não foi quitado
    parcelasVencidas: number;
    proximoVencimento: string | null;
  };
  parcelas: Parcela[];               // ordenadas por vencimento asc
  calculadoEm: string;               // data de referência (hoje) usada no cálculo
}
```

## Envelope

Sucesso: `{ "dados": ... }`

Erro (todos os endpoints):

```json
{ "erro": { "codigo": "ALUNO_NAO_ENCONTRADO", "mensagem": "Aluno 99 não encontrado." } }
```

Códigos: `VALIDACAO` (400), `ALUNO_NAO_ENCONTRADO` (404), `ROTA_NAO_ENCONTRADA` (404),
`LIMITE_EXCEDIDO` (429), `IA_INDISPONIVEL` (503), `IA_TIMEOUT` (504), `IA_RECUSOU` (502), `ERRO_INTERNO` (500).

## Endpoints

### `GET /api/alunos?busca=<texto>`
Busca opcional (máx. 100 caracteres) por nome (sem acento/caixa) ou matrícula.
`200 → { dados: AlunoResumo[], total: number }`

### `GET /api/alunos/:id`
`200 → { dados: AlunoDetalhe }` · `400` id não numérico/≤0 · `404` inexistente

### `GET /api/alunos/:id/financeiro`
`200 → { dados: Financeiro }` · `400` · `404`

### `POST /api/assistente`
Body: `{ "pergunta": string (1–500 chars, trim), "alunoId"?: number }`

`alunoId` é o aluno selecionado na interface — usado em perguntas como "Resuma a situação financeira do aluno selecionado".

```json
{
  "dados": {
    "resposta": "texto",
    "modo": "llm" | "demonstrativo",
    "modelo": "claude-opus-5-5" | null,
    "alunoId": 3 | null
  }
}
```

Erros: `400 VALIDACAO`, `404 ALUNO_NAO_ENCONTRADO`, `429 LIMITE_EXCEDIDO` (padrão: 10 perguntas por minuto por IP; resposta traz `Retry-After`), `503 IA_INDISPONIVEL`, `504 IA_TIMEOUT`, `502 IA_RECUSOU`.
Não há fallback silencioso: se o LLM falhar, a API retorna erro; o modo demonstrativo só é usado quando não há chave configurada (e a resposta vem marcada com `modo: "demonstrativo"`).
