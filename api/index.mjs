import { handleRequest } from '../server/index.mjs'

export const maxDuration = 30

export default function handler(request, response) {
  const url = new URL(request.url || '/api', `http://${request.headers.host || 'localhost'}`)
  const path = url.searchParams.get('path') || ''
  url.searchParams.delete('path')
  const query = url.searchParams.toString()
  request.url = `/api/${path}${query ? `?${query}` : ''}`
  return handleRequest(request, response)
}
