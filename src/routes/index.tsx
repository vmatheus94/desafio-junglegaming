import { createFileRoute } from '@tanstack/react-router'
import { catalogSearchSchema, toCatalogQuery } from '@/features/catalog/search'
import { catalogQuery } from '@/features/catalog/queries'
import { Hero } from '@/features/catalog/components/hero'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { Blog, Promos } from '@/features/catalog/components/promos'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toCatalogQuery(search),
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(catalogQuery(deps))
  },
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  return (
    <main id="conteudo" className="container-page mt-6 flex flex-col gap-10 md:mt-8 md:gap-24">
      <title>Kurio · Marketplace de NFTs</title>
      <Hero />
      <CatalogSection search={search} />
      <div className="hidden md:flex md:flex-col md:gap-24">
        <Promos />
        <Blog />
      </div>
    </main>
  )
}
