import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { FigmaIcon, type FigmaIconName } from './icons'
import { notAvailable } from './header'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const SOCIAL: Array<{ icon: FigmaIconName; label: string; href: string }> = [
  { icon: 'social-1', label: 'Facebook', href: 'https://www.facebook.com' },
  { icon: 'social-2', label: 'Instagram', href: 'https://www.instagram.com' },
  { icon: 'social-3', label: 'Twitter', href: 'https://twitter.com' },
  { icon: 'social-4', label: 'LinkedIn', href: 'https://www.linkedin.com' },
  { icon: 'social-5', label: 'YouTube', href: 'https://www.youtube.com' },
]

function FooterLinkButton({ children }: { children: string }) {
  return (
    <li>
      <button type="button" onClick={() => notAvailable(children)} className="text-left leading-[30px] hover:text-text-accent">
        {children}
      </button>
    </li>
  )
}

export function Footer() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const subscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Digite um e-mail válido.')
      return
    }
    setError(null)
    notAvailable('A newsletter')
  }

  return (
    <footer className="container-page mt-16 pb-28 md:mt-24 md:pb-6" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Rodapé
      </h2>
      <div className="bg-surface-card p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[1fr_auto_265px_auto_265px_auto_357px] xl:gap-0">
          {FEATURES.map((f, i) => (
            <div key={f.letter} className="contents">
              {i > 0 && <span aria-hidden className="hidden w-px bg-primary xl:block" />}
              <div className="flex flex-col gap-3 xl:px-4">
                <span aria-hidden className="grid size-[74px] place-items-center rounded-full bg-primary text-[24px] font-bold text-ink">
                  {f.letter}
                </span>
                <p className="text-[17px] font-bold leading-4 text-foreground">{f.title}</p>
                <p className="max-w-[204px] text-[14px] leading-[22px] text-text-secondary">{f.text}</p>
              </div>
            </div>
          ))}
          <span aria-hidden className="hidden w-px bg-primary xl:block" />
          <form onSubmit={subscribe} noValidate className="flex flex-col gap-3 xl:px-4">
            <label htmlFor="newsletter-email" className="text-[18px] font-bold leading-5 text-foreground">
              Antecipe-se ao próximo lançamento
            </label>
            <div className="flex h-10 items-center rounded-[6px] bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]">
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="digite seu e-mail..."
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'newsletter-error' : 'newsletter-hint'}
                className="h-full min-w-0 flex-1 bg-transparent pl-3 text-[14px] text-foreground placeholder:text-secondary focus-visible:outline-none"
              />
              <button type="submit" className="h-10 w-[85px] rounded-r-[6px] bg-primary text-[18px] font-bold text-ink">
                Enviar
              </button>
            </div>
            {error ? (
              <p id="newsletter-error" role="alert" className="text-[12px] text-danger">
                {error}
              </p>
            ) : (
              <p id="newsletter-hint" className="text-[13px] leading-[22px] text-text-secondary">
                Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-surface-dark px-6 py-6 text-[14px] leading-[22px] text-foreground md:flex-row md:items-center md:gap-8 md:px-8 xl:h-[88px] xl:gap-[92px] xl:py-0">
        <Link to="/" className="flex-1 font-bold tracking-[1.4px]">
          KURIO
        </Link>
        <p className="flex-1">
          Feito para colecionadores,
          <br className="hidden xl:block" /> criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="flex-1 hover:text-text-accent">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="xl:w-[228px] hover:text-text-accent">
          +55 11 4002 8922
        </a>
      </div>

      <div className="bg-surface-card px-6 py-8 md:px-8">
        <div className="grid grid-cols-2 gap-8 text-[14px] text-foreground md:grid-cols-4 xl:grid-cols-[1fr_1fr_1fr_228px] xl:gap-[124px]">
          <nav aria-labelledby="footer-profile" className="flex flex-col gap-2">
            <p id="footer-profile" className="text-[18px] font-bold leading-4">
              Meu perfil
            </p>
            <ul>
              <li>
                <Link to="/perfil" className="leading-[30px] hover:text-text-accent">
                  Meu perfil
                </Link>
              </li>
              <FooterLinkButton>Minha coleção</FooterLinkButton>
              <FooterLinkButton>Atividade</FooterLinkButton>
              <FooterLinkButton>Estúdio do criador</FooterLinkButton>
              <FooterLinkButton>Lista de interesse</FooterLinkButton>
            </ul>
          </nav>
          <nav aria-labelledby="footer-help" className="flex flex-col gap-2">
            <p id="footer-help" className="text-[18px] font-bold leading-4">
              Central de ajuda
            </p>
            <ul>
              <FooterLinkButton>Central de ajuda</FooterLinkButton>
              <FooterLinkButton>Como comprar NFTs</FooterLinkButton>
              <FooterLinkButton>Carteira e segurança</FooterLinkButton>
              <FooterLinkButton>Política do mercado</FooterLinkButton>
              <FooterLinkButton>Denunciar item</FooterLinkButton>
            </ul>
          </nav>
          <nav aria-labelledby="footer-collections" className="flex flex-col gap-2">
            <p id="footer-collections" className="text-[18px] font-bold leading-4">
              Coleções
            </p>
            <ul className="leading-[30px]">
              {(
                [
                  ['Arte digital', 'digital-art'],
                  ['Fotografia', 'photography'],
                  ['Música', 'music'],
                  ['Arte 3D', '3d-art'],
                  ['Utilidade', 'utility'],
                ] as const
              ).map(([label, id]) => (
                <li key={id}>
                  <Link to="/" search={{ categories: [id] }} hash="catalogo" className="hover:text-text-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-span-2 flex flex-col gap-8 md:col-span-1">
            <div className="flex flex-col gap-5">
              <p className="text-[18px] font-bold leading-4">Redes sociais</p>
              <ul className="flex gap-2.5">
                {SOCIAL.map((s) => (
                  <li key={s.icon}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (abre em nova aba)`}>
                      <FigmaIcon name={s.icon} size={32} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[18px] font-bold leading-4">Carteiras compatíveis</p>
              <p className="flex h-[26px] items-center justify-center whitespace-pre rounded-[6px] border border-border-soft bg-surface-dark text-[9px] font-bold tracking-[0.1px] text-text-accent">
                {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[14px] leading-[30px] text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
