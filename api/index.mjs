export const maxDuration = 30

export default async function handler(request, response) {
  try {
    const { handleRequest } = await import('../server/index.mjs')
    const url = new URL(request.url || '/api', `http://${request.headers.host || 'localhost'}`)
    const path = url.searchParams.get('path') || ''
    url.searchParams.delete('path')
    const query = url.searchParams.toString()
    request.url = `/api/${path}${query ? `?${query}` : ''}`
    await handleRequest(request, response)
  } catch (error) {
    console.error('Error no controlado en la API:', error)
    if (!response.headersSent) {
      response.statusCode = 500
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: 'El servidor no pudo procesar la solicitud.' }))
    } else if (!response.writableEnded) {
      response.end()
    }
  }
}
