# Arquitetura

## Visão geral

```
src/
├── app/            Inicialização: QueryClient, router, handler global de sessão expirada
├── routes/         Rotas file-based do TanStack Router (finas: search params, guards, prefetch)
├── features/       Uma pasta por domínio: api.ts (Axios + Zod), queries.ts (TanStack Query), componentes
│   ├── catalog/    Início: hero, filtros, grade, paginação, promoções
│   ├── nft/        Detalhe: galeria, edições, quantidade
│   ├── favorites/  Favoritos (atualização otimista) e lista de interesse
│   ├── cart/       Carrinho, cupom, resumo (cotação)
│   ├── checkout/   Pagamento, conexão de carteira, revisão, pedido idempotente, recibo
│   ├── auth/       Login, cadastro, sessão
│   └── account/    Perfil, avatar, senha, carteiras
├── shared/
│   ├── contracts/  Schemas Zod: fonte única dos contratos REST e dos eventos
│   ├── api/        Axios, ApiError, query keys, sessão, prontidão do backend
│   ├── realtime/   Provider Socket.IO e reconciliação de eventos no cache
│   ├── ui/         Componentes shadcn/ui (Radix) adaptados ao Figma
│   ├── components/ Header, footer, tab bar mobile, live region, imagens
│   └── lib/        money (decimal.js), storage, labels, utils
└── mocks/          Backend simulado: db, fixtures, handlers MSW, servidor Socket.IO, cenários, painel
```

**Fluxo de dados** (cada camada só conhece a de baixo):

```
Componente → hook do TanStack Query → função de API (valida com Zod) → Axios → [rede] → handler MSW → db simulado
                         ↑                                                                       │
                         └──────── socket.io-client ← servidor Socket.IO simulado ← barramento ←─┘
```

Componentes, hooks e o cliente Axios não contêm respostas fictícias nem caminhos alternativos de negócio. Toda regra (validação de cupom, disponibilidade, cotação, idempotência, liquidação do pagamento) vive em `src/mocks`, atrás da rede.

## Contratos REST

Os schemas ficam em `src/shared/contracts`. O cliente valida cada resposta (`parseWith`) e os handlers usam os mesmos schemas para validar a entrada. Erros seguem um formato único:

```json
{ "error": { "code": "validation_error", "message": "…", "fields": { "email": "E-mail inválido" }, "details": {} } }
```

| Status               | `code`                                                                                                                                                            | Uso                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 400/422              | `validation_error`, `coupon_invalid`, `coupon_expired`, `invalid_password`                                                                                        | Validação (com `fields`)                     |
| 401                  | `unauthorized`, `invalid_credentials`, `session_expired`                                                                                                          | Sessão ausente/expirada                      |
| 403                  | `forbidden`, `wallet_rejected`                                                                                                                                    | Sem permissão (ex.: pedido de outro usuário) |
| 404                  | `not_found`                                                                                                                                                       | Recurso inexistente                          |
| 409                  | `conflict`, `email_taken`, `username_taken`, `insufficient_availability`, `edition_unavailable`, `quote_outdated`, `idempotency_conflict`, `wallet_not_connected` | Conflitos                                    |
| 5xx / rede / timeout | `service_unavailable`, `internal_error`                                                                                                                           | Falha transitória (repetida automaticamente) |

| Recurso   | Endpoint                                                                                               | Observações                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Sessão    | `POST /api/auth/register` → 201 `{user, token, expiresAt}`                                             | 409 com `fields` em conflito                                                                                      |
|           | `POST /api/auth/login` → `{user, token, expiresAt}`                                                    | 401 `invalid_credentials`                                                                                         |
|           | `GET /api/session` → `{user, expiresAt}`                                                               | 401 `session_expired`                                                                                             |
|           | `POST /api/auth/logout` → 204                                                                          | Também derruba a conexão de carteira                                                                              |
| NFTs      | `GET /api/nfts?q&categories&networks&minPrice&maxPrice&tab&sort&page&pageSize`                         | Listas separadas por vírgula. Resposta: `items`, paginação, `facets`, `featured` e `applied` (eco dos parâmetros) |
|           | `GET /api/nfts/:id` → `{nft}`                                                                          | Edições com `available`, `price`, `maxPerOrder` e `version`                                                       |
| Favoritos | `GET /api/favorites` → `{nftIds, items}` · `PUT` / `DELETE /api/favorites/:nftId`                      | Autenticado                                                                                                       |
| Carrinho  | `GET /api/cart` · `POST /api/cart/items` · `PATCH`/`DELETE /api/cart/items/:id`                        | Visitante via header `X-Guest-Cart`; autenticado via token                                                        |
|           | `PUT`/`DELETE /api/cart/coupon` · `POST /api/cart/acknowledge-prices` · `POST /api/cart/merge`         | Merge incorpora o carrinho do visitante no login                                                                  |
| Cotação   | `POST /api/quote {network}` → `{quote}`                                                                | Subtotal, desconto, taxa de rede, total, `issues`, validade de 10 min                                             |
| Pedidos   | `POST /api/orders` + header `Idempotency-Key`                                                          | 201 novo / 200 mesmo pedido / 409 `idempotency_conflict` / 409 `quote_outdated` com `details.quote`               |
|           | `GET /api/orders?status=pending` · `GET /api/orders/:id`                                               | 403 para pedido de outro usuário                                                                                  |
| Perfil    | `GET`/`PATCH /api/profile` · `PUT`/`DELETE /api/profile/avatar` · `PUT /api/profile/password`          | Avatar em data URL (PNG/JPG/WEBP até 1,5 MB)                                                                      |
| Carteiras | `GET /api/wallets` · `POST /api/wallets` · `PATCH /api/wallets/:id`                                    | Slots `primary` e `secondary`                                                                                     |
|           | `GET`/`DELETE /api/wallets/connection` · `POST /api/wallets/:id/connect {network, provider, approved}` | Simulação de conexão, recusa e desconexão                                                                         |

**Valores em ETH** trafegam como strings decimais (`"1.19"`), e todo cálculo usa `decimal.js`, tanto nos mocks quanto na exibição. A interface nunca calcula subtotal, desconto ou total: exibe o que a cotação da API devolve. Quantidades são inteiras.

## Eventos (Socket.IO)

Envelope comum (`src/shared/contracts/events.ts`):

```ts
{ eventId: string, type, resource: { type, id }, version: number, occurredAt: string, data }
```

| Evento          | `data`                                                                | Destinatários                        |
| --------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `nft.updated`   | `{ nftId, price, soldOut, editions[{id, price, available}], reason }` | Todas as conexões                    |
| `order.updated` | `{ userId, order }` (snapshot completo)                               | Apenas conexões autenticadas do dono |

**Transporte nos mocks:** o MSW intercepta o WebSocket que o `socket.io-client` abre em `/socket.io/`, e o `@mswjs/socket.io-binding` codifica/decodifica o protocolo Engine.IO v4 / Socket.IO. O servidor simulado lê o token do pacote `CONNECT` (`auth.token`), envia ping a cada 20 s e publica o que o "banco" emite no barramento interno. Assim, uma mudança nos dados aparece tanto no REST quanto nos eventos.

**Limitações do transporte simulado:** apenas `websocket` (sem long-polling) e namespace `/`; sem rooms (o filtro por usuário é feito no servidor simulado); o "servidor" roda na própria aba, então eventos não cruzam abas.

## Reconciliação REST × Socket.IO

`src/shared/realtime/reconcile.ts`:

1. **Dedupe:** `eventId` já processado é descartado (memória LRU de 500 ids, zerada na troca de sessão).
2. **Versão:** compara `event.version` com a maior versão conhecida do recurso (eventos anteriores e dados REST em cache). Eventos com versão menor ou igual são ignorados, então nunca regridem o estado.
3. **Aplicação:** `nft.updated` atualiza via `setQueryData` o detalhe, as listas do catálogo e os "relacionados". Se o NFT está no carrinho, invalida carrinho e cotação (o servidor já tem os novos valores) e anuncia a mudança em `aria-live` e toast.
4. **Pedidos:** `order.updated` só é aplicado se `data.userId` for o usuário da sessão atual. Pedidos terminais (`confirmed`/`rejected`) não mudam mais. Ao terminar, invalida carrinho, cotação e pendentes.
5. **Reconexão:** no `connect` após uma queda, invalida (refetch ativo) catálogo, detalhe, carrinho, cotação e dados do usuário.
6. **Ciclo de vida:** um socket por sessão. Ao trocar de usuário, sair ou expirar a sessão, o socket é desconectado e todos os listeners removidos.
7. **Fallback:** a página do pedido pendente faz polling a cada 5 s enquanto o status é `pending`, e o banner "Você tem um pedido aguardando…" usa `GET /orders?status=pending`. O pedido é recuperado mesmo sem socket ou após refresh.

## Política de cache, retries e sincronização (TanStack Query)

| Dado           | Query key                                        | staleTime | Observações                                                                                                          |
| -------------- | ------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------- |
| Catálogo       | `['catalog', params]`                            | 30 s      | `keepPreviousData`; o `AbortSignal` cancela a requisição anterior; a key por parâmetros descarta respostas obsoletas |
| Detalhe        | `['nft', id]`                                    | 15 s      | Prefetch no loader da rota                                                                                           |
| Carrinho       | `['cart', 'user:<id>' \| 'guest:<id>']`          | 10 s      | `setQueryData` com a resposta das mutations                                                                          |
| Cotação        | `['quote', owner, network, cartVersion, coupon]` | 15 s      | Nova cotação a cada versão do carrinho                                                                               |
| Dados privados | `['user', userId, …]`                            | 30 s      | Favoritos, perfil, carteiras, conexão e pedidos isolados por usuário                                                 |

- **Retry:** apenas para erros transitórios (rede, timeout, 5xx), até 2 vezes com backoff exponencial. Validação, 401/403/404/409 nunca são repetidos. Mutations não têm retry automático.
- **Pedido:** retry próprio (até 3 tentativas) com a **mesma** `Idempotency-Key`; o servidor devolve o mesmo pedido.
- **Otimista:** favoritos (`onMutate` → `setQueryData`; `onError` → rollback + toast/aria-live; `onSettled` → invalidate).
- **Invalidação:** mutations de carrinho gravam a resposta e invalidam a cotação; conexão de carteira atualiza a key de conexão; perfil atualiza perfil + sessão; pedidos terminais invalidam carrinho e pendentes.
- **Isolamento:** logout, expiração e troca de usuário chamam `clearPrivateData` (cancela e remove `['user']`, `['cart']`, `['quote']`, `['session']`).

## Sessão

- Login/cadastro devolvem um token opaco com expiração (2 h; 45 s no cenário `short-session`). O token fica no `localStorage` (`kurio:session`) para sobreviver ao refresh. A senha nunca é armazenada no cliente; no backend simulado só há hash + salt.
- No carregamento, `GET /session` valida o token salvo.
- **Expiração:** qualquer 401 em requisição autenticada com o token atual dispara o handler global: encerra a sessão, limpa os dados privados, mostra o aviso e leva a `/entrar?redirect=<rota atual>&reason=expired`. Após o login, o usuário volta exatamente para onde estava.
- **Checkout:** o formulário de pagamento é salvo como rascunho no `sessionStorage` por usuário (`kurio:checkout-draft:<id>`) e restaurado após o novo login.
- **Rotas protegidas:** layout `_auth` (pagamento, pedidos, perfil, carteiras, favoritos) redireciona para o login preservando o destino. O redirect só aceita caminhos internos (sem open redirect).

## Estado do carrinho

- O carrinho é **do servidor** (simulado), não do cliente. Visitante: identificado por `X-Guest-Cart` (uuid em `localStorage`). Autenticado: carrinho do usuário.
- Ao autenticar, `POST /cart/merge` incorpora os itens do visitante, limitados à disponibilidade, e o id de visitante é renovado.
- Cada item guarda `acceptedUnitPrice`. Se o preço atual difere, a UI mostra o preço riscado e o aviso, e o checkout fica bloqueado até "Aceitar novos preços" (`POST /cart/acknowledge-prices`).
- Disponibilidade é validada em toda mutation (409 com o máximo permitido) e reportada na cotação (`issues`: `sold_out`, `insufficient_availability`, `coupon_expired`…).
- Na confirmação do pagamento, o servidor baixa o estoque, publica `nft.updated` e **remove do carrinho só as quantidades compradas**. Em falha ou recusa, o carrinho não muda.

## Checkout, idempotência e pedidos

1. "Confirmar compra" valida o formulário. Se a carteira escolhida não está conectada na rede escolhida, abre a simulação da extensão (_Aprovar_ / _Recusar_).
2. Diálogo de **revisão** com a cotação atual. Se uma cotação nova (evento em tempo real ou resposta 409 `quote_outdated`) difere da revisada, a confirmação some e o usuário precisa _Aceitar novos valores_.
3. `POST /orders` com `Idempotency-Key` gerada por tentativa (conteúdo do pedido) e guardada no `sessionStorage`. Cliques repetidos, retries e refresh reutilizam a chave; conteúdo diferente gera chave nova. No servidor: mesma chave e mesmo conteúdo devolvem o mesmo pedido; mesma chave com outro conteúdo devolve 409.
4. O servidor revalida preço, disponibilidade, cupom, taxa, validade da cotação e conexão da carteira antes de criar o pedido `pending`.
5. A liquidação simulada ocorre após `paymentDelayMs` (por cenário), com checagem final de estoque. O resultado chega por `order.updated` e pelo REST. A tela de confirmação só aparece com `status === 'confirmed'`.
6. O **recibo é o snapshot** gravado no pedido (linhas, preços, taxa, total, carteira, rede); mudanças posteriores no catálogo não o alteram. Hash da transação e link do explorer são simulados.

## Mocks

- `src/mocks/db`: estado em memória persistido em `localStorage` (`kurio:mock-db`) após cada mutação. O reset reconstrói tudo a partir das fixtures.
- `src/mocks/fixtures`: 36 NFTs determinísticos (os 9 primeiros reproduzem a grade do Figma), 9 categorias, 3 redes, 4 edições por NFT, 2 usuários, 3 carteiras e 3 cupons.
- `src/mocks/scenarios`: latência com gerador de números de semente fixa, falhas e comportamentos por cenário (ver README).
- `src/mocks/control.ts`: API `window.__kurioMock`, usada pelo painel e pelos testes. Toda ação passa pelo "banco" e chega ao app via REST/Socket.IO.
- A camada é ativada por `VITE_ENABLE_MOCKS` e incluída no build publicado. Ela inicia em paralelo com a renderização: o Axios e o socket aguardam a promessa `waitForBackend()`, então nada sai antes do MSW estar ativo e o LCP não espera o Service Worker.

## Interface, responsividade e acessibilidade

- Tokens do Figma (cores `color/*`, fonte Roboto Mono) em `src/styles.css` (`@theme` do Tailwind v4). Fontes servidas localmente via `@fontsource` (subset latin).
- Breakpoints: mobile < 768 px (frames mobile: busca + filtros em drawer, tab bar inferior, detalhe com barra de compra fixa, login/cadastro em tela cheia); tablet 768–1023 px (header desktop, grade com 3 colunas, filtros em drawer); desktop ≥ 1024 px (sidebar de filtros 310 px; a 1440 px o conteúdo tem 1200 px, como no Figma). Verificado em 390, 768 e 1440 px sem overflow horizontal.
- Skeletons com shimmer no catálogo, detalhe, carrinho/resumo, checkout, perfil e carteiras, com as dimensões do conteúdo final (sem CLS). `prefers-reduced-motion` desliga o shimmer e as transições.
- Acessibilidade: link "Pular para o conteúdo"; foco visível; diálogos e drawers Radix (foco preso, Esc, retorno do foco); labels e `aria-describedby` nos erros; `aria-invalid`; `aria-current` na navegação e paginação; `aria-pressed` em favoritos; tabs com setas; região `aria-live` global para mutations e eventos em tempo real; textos alternativos nas artes; estados não dependem só de cor (✓ nos filtros, preço riscado, mensagens textuais).

### Ajustes de acessibilidade em relação ao layout

- **Borda dos campos:** `color/border` (#3F2319) tem contraste ~1,4:1 com o fundo. Os campos usam `#80583D` (≥ 3:1, WCAG 1.4.11); divisórias mantêm a cor original.
- **Filtros:** o Figma mostra apenas texto. Mantive o visual, mas cada item é um checkbox acessível (visualmente oculto) com ✓ e negrito quando ativo.
- **Rótulos ocultos:** login/cadastro usam placeholder como no Figma, com `<label>` visualmente oculto.

## Desvios do Figma e decisões de UX

- **Assets:** imagens e ícones exportados do Figma (`public/assets`). As artes são servidas em WebP 320/640/960 com `srcset`. Ícones de UI menores (menu da conta, tab bar mobile, lixeira, setas, estrelas) usam `lucide-react` com traço equivalente. O conector do Figma atingiu o limite do plano gratuito no meio da extração; as telas Login, Cadastro, Perfil, Carteiras e as mobile de Detalhe, Carrinho, Pagamento, Login e Cadastro foram implementadas a partir da estrutura extraída (textos, posições, dimensões) e dos tokens.
- **Botões sociais** (login/cadastro): o texto das instâncias não foi extraído; usei "Continuar com Google/Apple". São ações fora do escopo e informam isso em vez de simular sucesso.
- **Itens fora do escopo** (Criadores, Aprenda, blog, atividade, ofertas, downloads, suporte, newsletter, recuperação de senha, avaliações): visíveis como no layout, mas avisam que não fazem parte da demonstração.
- **Pagamento:** os campos de carteira vêm da carteira cadastrada (endereço somente leitura; edição em Carteiras). "Usar outra carteira?" alterna para a secundária. "Carteira e rede" escolhe o provedor usado na conexão simulada. Adicionei uma etapa de **revisão** (diálogo) antes do envio, exigida pelo enunciado.
- **Mobile do pagamento:** o frame mostra cartões de carteira e provedores; o formulário "Perfil do colecionador" aparece abaixo, em seção recolhível já preenchida.
- **COMPRAR (desktop) / Comprar NFT (mobile)** adicionam ao carrinho e levam ao carrinho; o botão com ícone de carrinho (mobile) só adiciona.
- **Confirmação:** a rota `/pedidos/:id` mostra o estado pendente, recusado ou o recibo (modal do Figma).
- **Botão central da tab bar** (ícone de leitura) abre a busca "Explorar coleções".
- **Lista de interesse** (`/favoritos`): página adicional para consultar os favoritos (coração da tab bar mobile e item da sidebar).

## Performance

Medição: `pnpm build && pnpm lighthouse` (config em `lighthouse/config.mjs`; relatórios e `summary.md` em `lighthouse/reports/<data>/`).

Otimizações aplicadas:

- Code splitting por rota (`autoCodeSplitting` do TanStack Router); o cliente Socket.IO e a camada de mocks são carregados sob demanda.
- O MSW inicia em paralelo com a renderização; a imagem do hero (LCP) é pré-carregada com `fetchpriority="high"`.
- Artes em WebP com `srcset`/`sizes`, `width`/`height` declarados e lazy loading fora da dobra.
- Fontes locais (subset latin, woff2), sem requisições de terceiros.

### Resultado da auditoria (mediana de 3 execuções)

Execução em `lighthouse/reports/2026-11-05T05-51-26/` (Lighthouse 12.8.2, Node 24.13.0, HeadlessChrome 157, Windows 11 x64, AMD Ryzen 5 5500, throttling simulado padrão), com as artes finais do Figma:

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Início | mobile | 78 | 100 | 100 | 100 | 4,4 s | 0 | 87 ms |
| Início | desktop | 99 | 100 | 100 | 100 | 0,9 s | 0,001 | 0 ms |
| Detalhe | mobile | 81 | 100 | 100 | 100 | 3,8 s | 0 | 79 ms |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 0,8 s | 0 | 0 ms |

**Abaixo da meta: Performance no perfil mobile (78 e 81 vs 90), puxada pelo LCP (3,8–4,4 s).** CLS e TBT estão dentro das metas em todos os perfis. Causas identificadas nos relatórios:

1. **Volume de JavaScript sob CPU 4× e 4G lento:** ~225 KB gzip do app (React, TanStack Router/Query, Zod, Radix) mais ~110 KB gzip da camada de mocks (MSW, `tough-cookie`/`tldts` usados internamente pelo MSW, fixtures e servidor Socket.IO simulado). Sob a CPU 4× simulada, esse JavaScript precisa ser baixado e executado antes do primeiro conteúdo com dados, o que atrasa o LCP (o TBT ficou em 79–87 ms).
2. **LCP dependente de dados:** a imagem do LCP só pode ser desenhada depois que o JS executa, o Service Worker do MSW é ativado e a API responde. Na decomposição do LCP (medida sem throttling, onde o total fica em ~0,6 s), quase todo o tempo está nessa espera: no Início mobile a arte já foi pré-carregada e o tempo fica em "Element Render Delay" (~630 ms de ~650 ms); no Detalhe a arte só é descoberta após a resposta da API e o tempo fica em "Resource Load Delay" (~570 ms de ~620 ms). Com a CPU 4× e o 4G lento simulados, a mesma cadeia resulta nos 3,8–4,4 s da tabela.
3. **O que já foi feito:** MSW inicia em paralelo com a renderização; chunks dos mocks pré-carregados (`modulepreload`); code splitting por rota; Socket.IO sob demanda; imagens WebP responsivas com preload alinhado ao `srcset`; fontes locais; CLS zerado (skeletons com altura reservada).
4. **Com backend real:** a camada de mocks sairia do bundle (`VITE_ENABLE_MOCKS=false`), eliminando ~110 KB gzip e a ativação do Service Worker. Os próximos passos seriam pré-renderizar o "shell" do Início e adotar `zod/mini` nos contratos.

A auditoria mantém a carga dos mocks de propósito: o enunciado exige o build de demonstração com mocks funcionando, sem simplificações feitas só para melhorar a nota.
