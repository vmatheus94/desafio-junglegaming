import { useEffect, useState } from 'react'

type Politeness = 'polite' | 'assertive'
type Listener = (msg: { text: string; politeness: Politeness; id: number }) => void
const listeners = new Set<Listener>()
let counter = 0

export function announce(text: string, politeness: Politeness = 'polite') {
  counter += 1
  const msg = { text, politeness, id: counter }
  listeners.forEach((l) => l(msg))
}

export function LiveRegion() {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')

  useEffect(() => {
    const l: Listener = ({ text, politeness }) => {
      const set = politeness === 'assertive' ? setAssertive : setPolite
      set('')
      requestAnimationFrame(() => set(text))
    }
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true" data-testid="live-assertive">
        {assertive}
      </div>
    </>
  )
}
