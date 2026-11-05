import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, X } from 'lucide-react'
import type { Cart } from '@/shared/contracts'
import { queryKeys } from '@/shared/api/query-keys'
import { mockControl } from './control'
import type { ScenarioId } from './scenarios'

export default function MockPanel() {
  const [hidden] = useState(() => {
    try {
      return localStorage.getItem('kurio:mock-panel') === 'hidden'
    } catch {
      return false
    }
  })
  const [open, setOpen] = useState(false)
  const [scenario, setScenario] = useState<ScenarioId>(mockControl.getScenario())
  const [log, setLog] = useState<string | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!log) return
    const t = setTimeout(() => setLog(null), 4000)
    return () => clearTimeout(t)
  }, [log])

  if (hidden) return null

  const firstCartItem = () => {
    for (const [, cart] of qc.getQueriesData<Cart>({ queryKey: queryKeys.cartAll })) {
      if (cart?.items[0]) return cart.items[0]
    }
    return null
  }

  const btn = 'rounded-[4px] border border-border-soft px-2 py-1.5 text-left text-[12px] hover:border-primary hover:text-text-accent'
  const current = mockControl.scenarios.find((s) => s.id === scenario)

  return (
    <div className="fixed bottom-28 left-3 z-[70] md:bottom-4" data-testid="mock-panel">
      {open ? (
        <section
          aria-label="Controles de simulação"
          className="w-[300px] rounded-[8px] border border-border-soft bg-surface-card p-3 text-foreground shadow-2xl"
        >
          <header className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-text-accent">Simulação (MSW)</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar painel de simulação"
              className="grid size-7 place-items-center"
            >
              <X aria-hidden className="size-4" />
            </button>
          </header>
          <label htmlFor="mock-scenario" className="text-[12px] text-secondary">
            Cenário
          </label>
          <select
            id="mock-scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value as ScenarioId)}
            className="mt-1 h-9 w-full rounded-[4px] border border-input-border bg-ink px-2 text-[12px]"
          >
            {mockControl.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] leading-4 text-text-secondary">{current?.description}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={btn}
              onClick={() => {
                mockControl.setScenario(scenario)
                window.location.reload()
              }}
            >
              Aplicar cenário
            </button>
            <button
              type="button"
              className={btn}
              onClick={async () => {
                await mockControl.reset()
                window.location.assign('/')
              }}
            >
              Resetar dados
            </button>
          </div>

          <p className="mt-3 text-[12px] text-secondary">Eventos em tempo real</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={btn}
              onClick={() => {
                const item = firstCartItem()
                if (!item) return setLog('Adicione um item ao carrinho primeiro.')
                mockControl.changePrice(item.nftId, item.editionId)
                setLog(`Preço de ${item.name} alterado.`)
              }}
            >
              Alterar preço (carrinho)
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                const item = firstCartItem()
                if (!item) return setLog('Adicione um item ao carrinho primeiro.')
                mockControl.changeAvailability(item.nftId, item.editionId, 0)
                setLog(`${item.name} esgotado.`)
              }}
            >
              Esgotar edição (carrinho)
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setLog(mockControl.realtime.replayLast() ? 'Último evento reenviado.' : 'Nenhum evento ainda.')}
            >
              Reenviar último evento
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                const item = firstCartItem()
                mockControl.realtime.sendStaleNftEvent(item?.nftId ?? 'emerald-ape-042')
                setLog('Evento antigo enviado (deve ser ignorado).')
              }}
            >
              Enviar evento antigo
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                const blocked = !mockControl.realtime.isBlocked()
                mockControl.realtime.setBlocked(blocked)
                setLog(blocked ? 'Socket desconectado (bloqueado).' : 'Socket liberado: reconectando.')
              }}
            >
              Derrubar/religar socket
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                mockControl.settleOrdersNow()
                setLog('Pagamentos pendentes liquidados.')
              }}
            >
              Liquidar pagamentos
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                mockControl.expireSessions()
                setLog('Sessões expiradas: a próxima requisição autenticada falhará.')
              }}
            >
              Expirar sessão
            </button>
          </div>
          {log && (
            <p role="status" className="mt-2 text-[11px] text-text-accent">
              {log}
            </p>
          )}
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-card/95 px-3 py-2 text-[12px] text-text-secondary shadow-lg hover:text-text-accent"
          aria-label="Abrir painel de simulação"
        >
          <FlaskConical aria-hidden className="size-4" /> Mocks
        </button>
      )}
    </div>
  )
}
