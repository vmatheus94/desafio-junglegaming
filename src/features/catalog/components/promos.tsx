import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { NftImage } from '@/shared/components/nft-image'
import { notAvailable } from '@/shared/components/header'

export function Promos() {
  const cards = [
    {
      title: ['Lançamentos gênesis', 'de edição limitada'],
      text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
      image: '/assets/nfts/emerald-ape.png',
      search: { tab: 'new' as const },
    },
    {
      title: ['Arte digital selecionada', 'e muito mais'],
      text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
      image: '/assets/nfts/ivory-baron.png',
      search: { tab: 'trending' as const },
    },
  ]
  return (
    <section aria-label="Destaques da curadoria" className="grid gap-6 lg:grid-cols-2 lg:gap-7">
      {cards.map((c) => (
        <article key={c.title[0]} className="relative flex h-[250px] overflow-hidden rounded-[8px] bg-surface-card">
          <NftImage src={c.image} alt="" sizes="292px" size={292} className="h-full w-[45%] max-w-[292px] shrink-0 rounded-[18px]" />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-[106px] -left-[191px] size-64 rounded-full border border-primary/60"
          />
          <div className="flex min-w-0 flex-1 flex-col items-end pb-[46px] pl-4 pr-5 pt-[37px] text-right sm:pr-[30px]">
            <h3 className="text-[16px] font-bold leading-6 text-foreground sm:text-[18px]">
              {c.title[0]}
              <br />
              {c.title[1]}
            </h3>
            <p className="mt-3 line-clamp-3 max-w-[263px] text-[13px] leading-6 text-text-secondary sm:text-[14px]">{c.text}</p>
            <Link
              to="/"
              search={c.search}
              hash="catalogo"
              className="mt-auto flex h-10 min-h-10 w-[140px] shrink-0 items-center justify-center gap-1 rounded-[6px] bg-primary text-[14px] font-medium text-ink hover:bg-primary-hover"
            >
              Explorar <ArrowRight aria-hidden className="size-[18px]" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  {
    date: '12 de setembro',
    read: '6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/assets/nfts/emerald-ape.png',
  },
  {
    date: '13 de setembro',
    read: '2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/assets/nfts/sage-nomad.png',
  },
  {
    date: '15 de setembro',
    read: '3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/assets/nfts/ivory-baron.png',
  },
  {
    date: '15 de setembro',
    read: '2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/assets/nfts/golden-beat.png',
  },
]

export function Blog() {
  return (
    <section aria-labelledby="blog-title" className="flex flex-col gap-10">
      <header className="flex flex-col items-center gap-3">
        <h2 id="blog-title" className="text-[24px] font-bold leading-[37px] text-foreground md:text-[28px]">
          Diário da Cunhagem
        </h2>
        <p className="text-[14px] leading-[18px] text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((p) => (
          <li key={p.title} className="flex flex-col overflow-hidden rounded-[8px] bg-surface-card">
            <NftImage src={p.image} alt="" sizes="(min-width: 1024px) 268px, 50vw" size={268} className="h-[195px] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-[12px] leading-4 text-secondary">
                {p.date} | Leitura de {p.read}
              </p>
              <h3 className="text-[16px] font-bold leading-[21px] text-foreground">{p.title}</h3>
              <p className="flex-1 text-[13px] leading-4 text-text-secondary">{p.text}</p>
              <button
                type="button"
                onClick={() => notAvailable('O blog')}
                className="mt-2 w-fit text-[13px] font-bold text-text-accent hover:underline"
                aria-label={`Ler mais: ${p.title}`}
              >
                Ler mais <span aria-hidden>→</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
