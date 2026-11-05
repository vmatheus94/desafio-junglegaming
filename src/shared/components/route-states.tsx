import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { StateMessage } from '@/shared/ui/misc'
import { errorMessage } from '@/shared/api/errors'

export function NotFound() {
  return (
    <main id="conteudo" className="container-page py-16">
      <title>Página não encontrada · Kurio</title>
      <StateMessage
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        }
      />
    </main>
  )
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main id="conteudo" className="container-page py-16">
      <StateMessage
        tone="error"
        title="Algo deu errado"
        description={errorMessage(error)}
        action={
          <Button
            onClick={() => {
              reset()
              router.invalidate()
            }}
          >
            Tentar novamente
          </Button>
        }
      />
    </main>
  )
}
