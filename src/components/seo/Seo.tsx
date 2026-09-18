import { useEffect } from 'react'

type StructuredData = Record<string, unknown>

type SeoProps = {
  title: string
  description: string
  canonicalPath?: string
  noindex?: boolean
  type?: 'website' | 'product'
  image?: string
  structuredData?: StructuredData
}

const setMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value))
}

export function Seo({ title, description, canonicalPath, noindex = false, type = 'website', image, structuredData }: SeoProps) {
  useEffect(() => {
    const canonicalUrl = new URL(canonicalPath || window.location.pathname, window.location.origin).toString()
    document.title = title
    setMeta('meta[name="description"]', { name: 'description', content: description })
    setMeta('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    setMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' })
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    if (image) {
      const absoluteImage = new URL(image, window.location.origin).toString()
      setMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteImage })
      setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteImage })
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    const setAlternate = (language: string) => {
      let alternate = document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${language}"]`)
      if (!alternate) {
        alternate = document.createElement('link')
        alternate.rel = 'alternate'
        alternate.hreflang = language
        document.head.appendChild(alternate)
      }
      alternate.href = canonicalUrl
    }
    setAlternate('es-AR')
    setAlternate('x-default')

    const scriptId = 'page-structured-data'
    document.getElementById(scriptId)?.remove()
    if (structuredData) {
      const script = document.createElement('script')
      script.id = scriptId
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(structuredData).replaceAll('<', '\\u003c')
      document.head.appendChild(script)
    }
  }, [canonicalPath, description, image, noindex, structuredData, title, type])

  return null
}
