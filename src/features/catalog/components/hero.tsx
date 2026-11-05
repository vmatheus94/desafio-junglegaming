import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { NftImage } from '@/shared/components/nft-image'

const HERO_ART = '/assets/nfts/emerald-ape.png'
const HERO_SMALL = '/assets/nfts/sage-nomad.png'

function Dots() {
  return (
    <span aria-hidden className="flex gap-1.5">
      <span className="size-2 rounded-full bg-primary" />
      <span className="size-2 rounded-full bg-primary/80" />
      <span className="size-2 rounded-full bg-primary/80" />
    </span>
  )
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="hidden md:block">
      <div className="relative flex h-[450px] items-center overflow-hidden rounded-[24px] bg-[linear-gradient(110deg,#140d0a_0%,#1b110d_55%,#241612_100%)] pl-10">
        <div className="flex w-full items-center justify-between gap-8">
          <div className="flex w-[600px] max-w-full flex-col items-end gap-11">
            <div className="flex w-full flex-col gap-8">
              <div className="flex flex-col gap-1">
                <p className="text-[14px] font-medium leading-4 tracking-[1.4px] text-foreground">Bem-vindo à Kurio</p>
                <h1 id="hero-title" className="mt-2 text-[32px] font-bold leading-[52px] text-foreground lg:text-[43px] lg:leading-[70px]">
                  SEJA DONO DO FUTURO
                  <br />
                  DA ARTE DIGITAL
                </h1>
                <p className="max-w-[557px] text-[14px] leading-6 text-text-secondary">
                  Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma
                  parte da cultura da internet.
                </p>
              </div>
              <Link
                to="/"
                hash="catalogo"
                className="flex h-10 w-[140px] items-center justify-center rounded-[6px] bg-primary text-[16px] font-bold text-ink hover:bg-primary-hover"
              >
                EXPLORAR
              </Link>
            </div>
            <Dots />
          </div>
          <NftImage
            src={HERO_ART}
            alt="Emerald Ape #042: macaco de óculos redondos e jaqueta verde de colégio"
            sizes="450px"
            priority
            size={450}
            className="aspect-square w-[min(450px,40vw)] shrink-0 rounded-[24px]"
          />
        </div>
      </div>
    </section>
  )
}

export function HeroMobile() {
  return (
    <section aria-labelledby="hero-title-mobile" className="mb-4 md:hidden">
      <div className="relative flex h-[190px] flex-col items-center justify-center gap-4 overflow-hidden rounded-[12px] bg-surface-card p-4">
        <span aria-hidden className="absolute -left-20 -top-8 size-[248px] rounded-full bg-primary/10" />
        <span aria-hidden className="absolute left-[73px] -top-2.5 size-[248px] rounded-full bg-primary/[0.06]" />
        <div className="relative flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-[12px] font-medium leading-4 text-foreground">Bem-vindo à Kurio</p>
            <h1 id="hero-title-mobile" className="text-[18px] font-bold leading-[29px] text-foreground">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </h1>
            <p className="text-[12px] leading-[18px] text-text-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <Link to="/" hash="catalogo" className="flex items-center gap-2 text-[12px] font-bold leading-[14px] text-text-accent">
              EXPLORAR <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <div className="relative size-[138px] shrink-0">
            <NftImage src={HERO_ART} alt="Emerald Ape #042" sizes="138px" priority size={138} className="size-[138px] rounded-[16px]" />
            <NftImage
              src={HERO_SMALL}
              alt=""
              sizes="58px"
              size={58}
              className="absolute left-3.5 top-[88px] size-[58px] rounded-[16px] border-2 border-surface-card"
            />
          </div>
        </div>
        <Dots />
      </div>
    </section>
  )
}
