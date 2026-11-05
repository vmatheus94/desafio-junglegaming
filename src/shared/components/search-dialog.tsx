import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/field'
import { Button } from '@/shared/ui/button'

export function SearchDialog({ trigger }: { trigger: ReactNode }) {
  const navigate = useNavigate()
  const [open, onOpenChange] = useState(false)
  const [term, setTerm] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onOpenChange(false)
    navigate({ to: '/', search: { q: term.trim() || undefined }, hash: 'catalogo' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="top-24 translate-y-0 p-6">
        <DialogTitle className="text-[17px] font-bold">Buscar NFTs</DialogTitle>
        <DialogDescription className="mt-1 text-[14px] text-text-secondary">
          Pesquise por nome, coleção, atributo ou criador.
        </DialogDescription>
        <form onSubmit={submit} role="search" className="mt-4 flex gap-2">
          <label htmlFor="global-search" className="sr-only">
            Termo de busca
          </label>
          <Input
            id="global-search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ex.: Ape, dourado, Nova Sato"
            maxLength={80}
          />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
