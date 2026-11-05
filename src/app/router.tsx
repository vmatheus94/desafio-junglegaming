import { createRouter, defaultParseSearch, defaultStringifySearch } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { routeTree } from '@/routeTree.gen'
import { NotFound } from '@/shared/components/route-states'

export interface RouterContext {
  queryClient: QueryClient
}

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
    stringifySearch: (search) =>
      defaultStringifySearch(Object.fromEntries(Object.entries(search).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]))),
    parseSearch: defaultParseSearch,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
