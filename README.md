# Kurio · Marketplace de NFTs

Implementação do desafio frontend da Jungle Gaming: marketplace de NFTs com descoberta, compra e conta do colecionador, nas versões desktop e mobile, seguindo o layout do Figma. Toda a integração (REST + tempo real) roda contra um backend simulado com **MSW**, inclusive no build publicado.

**Stack:** React 19 · TypeScript · TanStack Router · TanStack Query · Axios · Socket.IO (client) · Tailwind CSS v4 · shadcn/ui (Radix) · MSW 2 + `@mswjs/socket.io-binding` · Zod · React Hook Form · decimal.js · Playwright · Lighthouse · Vite.

> Decisões, contratos, política de cache, sessão, carrinho e reconciliação REST × Socket.IO estão em [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Setup

Pré-requisitos: **Node.js 20.19+** (testado com 22 e 24) e **pnpm 10** (`npm i -g pnpm`).

```bash
pnpm install
# Somente na primeira vez: baixa as imagens e os ícones do Figma (Windows/PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/baixar-assets-figma.ps1
pnpm images            # gera as versões WebP (320/640/960) das artes dos NFTs
pnpm dev               # http://localhost:5173 (mocks ativos)
```

> Depois da primeira execução, versione `public/assets/` (artes PNG/WebP e ícones SVG). Assim o projeto roda a partir de um checkout limpo, sem depender do Figma, e o script não precisa rodar de novo.

## 2. Comandos

| Comando                | O que faz                                               |
| ---------------------- | ------------------------------------------------------- |
| `pnpm dev`             | Desenvolvimento com mocks (MSW + Socket.IO simulado)    |
| `pnpm build`           | Verificação de tipos do app + build otimizado (`dist/`) |
| `pnpm preview`         | Serve o build em `http://localhost:4173` (mocks ativos) |
| `pnpm typecheck`       | Verificação de tipos de app, testes e configs           |
| `pnpm lint`            | ESLint                                                  |
| `pnpm test:e2e`        | Playwright (builda, sobe o preview e roda E2E + visual) |
| `pnpm test:e2e:update` | Regera as baselines de regressão visual                 |
| `pnpm test:e2e:report` | Abre o relatório HTML (traces das falhas incluídos)     |
| `pnpm lighthouse`      | Auditoria Lighthouse (rodar após `pnpm build`)          |
| `pnpm images`          | Gera WebP responsivos das artes                         |

Primeira execução dos testes: `pnpm exec playwright install chromium`.

## 3. Variáveis de ambiente

Definidas em `.env` (copie de `.env.example`). Todas têm valor padrão funcional.

| Variável               | Padrão    | Descrição                                                          |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| `VITE_ENABLE_MOCKS`    | `true`    | Liga a camada MSW (REST + Socket.IO). Obrigatória na demonstração. |
| `VITE_API_BASE_URL`    | `/api`    | Prefixo das rotas REST.                                            |
| `VITE_SOCKET_URL`      | _(vazio)_ | Origem do Socket.IO. Vazio = mesma origem.                         |
| `VITE_HTTP_TIMEOUT_MS` | `8000`    | Timeout do Axios.                                                  |
| `VITE_MOCK_SCENARIO`   | `default` | Cenário inicial dos mocks (opcional).                              |

## 4. Credenciais fictícias

| Usuário    | E-mail            | Senha        | Observações                                                                              |
| ---------- | ----------------- | ------------ | ---------------------------------------------------------------------------------------- |
| Ana Souza  | `ana@kurio.dev`   | `Kurio@2026` | Carteira principal (MetaMask/Ethereum) e secundária (WalletConnect/Polygon); 2 favoritos |
| Bruno Lima | `bruno@kurio.dev` | `Kurio@2026` | Somente carteira principal (Coinbase); 1 favorito                                        |

Cupons: `KURIO10` (10%), `GENESIS20` (20%), `VERAO25` (**expirado**). Qualquer outro código é inválido.

As senhas ficam no backend simulado apenas como hash SHA-256 com salt (1000 rodadas).

## 5. Cenários dos mocks

Há três formas de escolher o cenário:

1. **Painel "Mocks"** (canto inferior esquerdo): selecione e clique em _Aplicar cenário_.
2. **URL:** `?scenario=<id>`, por exemplo `http://localhost:5173/?scenario=slow`. O cenário fica salvo para as próximas cargas.
3. **Console:** `window.__kurioMock.setScenario('payment-declined')`.

| Id                         | Comportamento                                                                   |
| -------------------------- | ------------------------------------------------------------------------------- |
| `default`                  | Latência realista (150–450 ms), fluxos com sucesso                              |
| `instant`                  | Sem latência (testes)                                                           |
| `slow`                     | Toda resposta leva ~2,5 s (skeletons)                                           |
| `variable-latency`         | Catálogo alterna 1,6 s / 0,2 s → respostas fora de ordem                        |
| `empty-catalog`            | Listagem vazia                                                                  |
| `offline`                  | Toda chamada REST falha com erro de rede                                        |
| `flaky`                    | 1ª chamada de cada recurso responde 503; o retry funciona                       |
| `server-error`             | Catálogo e detalhe respondem 500                                                |
| `short-session`            | Sessões expiram 45 s após o login                                               |
| `favorites-failure`        | Incluir/remover favorito responde 500 (rollback otimista)                       |
| `price-change-at-checkout` | Na 1ª confirmação o preço sobe e o pedido exige reconfirmação                   |
| `sold-out-at-checkout`     | Na 1ª confirmação a edição esgota                                               |
| `order-timeout`            | O pedido é criado, mas a 1ª resposta nunca chega (recuperação por idempotência) |
| `payment-declined`         | Pagamentos são recusados                                                        |
| `payment-slow`             | Pagamento fica pendente por 20 s (queda de conexão e retomada)                  |

**Reset:** botão _Resetar dados_ no painel (ou `await window.__kurioMock.reset()`) restaura fixtures, sessões, carrinhos, pedidos e o storage do app.

## 6. Reproduzindo os fluxos de falha

Use `ana@kurio.dev` / `Kurio@2026`.

| Fluxo                                | Passos                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preço muda com o carrinho aberto     | Adicione um NFT, abra o carrinho, painel → _Alterar preço (carrinho)_. Aparece o aviso, o resumo é atualizado e "Conectar e finalizar" fica bloqueado até _Aceitar novos preços_.                            |
| Cotação desatualizada no checkout    | No pagamento, _Confirmar compra_ → aprovar a carteira → no diálogo de revisão, painel → _Alterar preço_. A confirmação é bloqueada até _Aceitar novos valores_. Ou use o cenário `price-change-at-checkout`. |
| Edição esgotada                      | Painel → _Esgotar edição (carrinho)_, ou cenário `sold-out-at-checkout`.                                                                                                                                     |
| Pagamento recusado                   | Cenário `payment-declined` → comprar. O carrinho é preservado.                                                                                                                                               |
| Recusa da carteira                   | No diálogo "Conectar…", clique em _Recusar_.                                                                                                                                                                 |
| Clique repetido                      | Clique várias vezes em _Confirmar e pagar_: um único pedido (mesma `Idempotency-Key`).                                                                                                                       |
| Timeout + idempotência               | Cenário `order-timeout` → comprar. Após o timeout de 8 s o app repete com a mesma chave e recupera o mesmo pedido.                                                                                           |
| Queda de conexão com pedido pendente | Cenário `payment-slow` → comprar → painel _Derrubar/religar socket_ → recarregue a página → religue → o pedido é retomado. _Liquidar pagamentos_ conclui na hora.                                            |
| Eventos duplicados/antigos           | Painel → _Reenviar último evento_ / _Enviar evento antigo_: ignorados (dedupe por `eventId` e versão).                                                                                                       |
| Sessão expirada                      | Painel → _Expirar sessão_ e navegue (ou cenário `short-session`). O app leva ao login e volta ao ponto anterior, inclusive no checkout (rascunho preservado).                                                |
| Falhas de rede/HTTP                  | Cenários `offline`, `server-error`, `flaky`: mensagens de erro e botão "Tentar novamente".                                                                                                                   |
| Favorito com falha                   | Cenário `favorites-failure`: o coração muda e volta (rollback), com aviso.                                                                                                                                   |

## 7. Testes

- **E2E** (`tests/e2e`): os 12 grupos do enunciado, em Chromium desktop (1440×900) e mobile (390×844). Testes marcados com `@desktop` rodam só no desktop.
- **Regressão visual** (`tests/visual`): início, detalhe, carrinho e pagamento, nos dois viewports. Baselines em `tests/visual/__screenshots__/<projeto>/<nome>-<plataforma>.png`. A fonte renderiza diferente entre sistemas operacionais, por isso há uma baseline por plataforma (`-linux`, `-win32`). Na primeira execução em uma plataforma nova, rode `pnpm test:e2e:update`.
- Cada teste usa um contexto isolado (storage vazio = banco simulado recém-semeado) e o cenário `instant`. Relógio, latência e eventos são controlados por `page.clock` e pela API `window.__kurioMock`. Eventos de tempo real sempre passam pelo `socket.io-client` e o REST pelos handlers MSW.
- Relatório HTML em `playwright-report/`; traces, vídeos e screenshots das falhas em `test-results/`.

## 8. Lighthouse

```bash
pnpm build && pnpm lighthouse
```

Audita `/` e `/nft/emerald-ape-042` em mobile e desktop, 3 execuções cada, e grava em `lighthouse/reports/<data>/`: os relatórios HTML/JSON, `summary.json` e `summary.md` (mediana por categoria, LCP/CLS/TBT, versões e ambiente). Configuração em `lighthouse/config.mjs`. Resultados e análise em [ARCHITECTURE.md](./ARCHITECTURE.md#performance).

## 9. Deploy

Build estático (Vite) com `vercel.json`: rewrites de SPA (acesso direto e refresh em qualquer rota) e o `mockServiceWorker.js` servido sem cache. Na Vercel, importe o repositório, framework **Vite**, build `pnpm build`, saída `dist`. Nenhuma variável é obrigatória (o `.env` versionado já liga os mocks).
