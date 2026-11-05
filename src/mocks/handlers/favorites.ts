import { db, persist, toSummary } from '../db'
import { API, apiError, authenticate, http, HttpResponse, scenario } from './utils'

export const favoritesHandlers = [
  http.get(
    `${API}/favorites`,
    scenario('favorites', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const nftIds = db().favorites[auth.user.id] ?? []
      const items = nftIds
        .map((id) => db().nfts[id])
        .filter(Boolean)
        .map(toSummary)
      return HttpResponse.json({ nftIds, items })
    }),
  ),

  http.put(
    `${API}/favorites/:nftId`,
    scenario('favorites', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const id = String(params.nftId)
      if (!db().nfts[id]) return apiError(404, 'not_found', 'NFT não encontrado.')
      const list = (db().favorites[auth.user.id] ??= [])
      if (!list.includes(id)) list.push(id)
      persist()
      return HttpResponse.json({ nftIds: list })
    }),
  ),

  http.delete(
    `${API}/favorites/:nftId`,
    scenario('favorites', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const id = String(params.nftId)
      db().favorites[auth.user.id] = (db().favorites[auth.user.id] ?? []).filter((f) => f !== id)
      persist()
      return HttpResponse.json({ nftIds: db().favorites[auth.user.id] })
    }),
  ),
]
