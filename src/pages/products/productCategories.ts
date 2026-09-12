export type ProductCategory = { name: string; slug: string }

export const productCategories: readonly ProductCategory[] = [
  { name: 'ACEITES Y LUBRICANTES', slug: 'aceites-y-lubricantes' },
  { name: 'BUJÍAS', slug: 'bujias' },
  { name: 'FLUIDOS', slug: 'fluidos' },
  { name: 'ACCESORIOS', slug: 'accesorios' },
  { name: 'MOTOCROSS', slug: 'motocross' },
  { name: 'TRANSMISIONES', slug: 'transmisiones' },
  { name: 'BATERÍAS', slug: 'baterias' },
  { name: 'CÁMARAS', slug: 'camaras' },
  { name: 'CUBIERTAS', slug: 'cubiertas' },
  { name: 'FILTROS DE AIRE', slug: 'filtros-de-aire' },
  { name: 'PASTILLAS Y ZAPATAS DE FRENO', slug: 'pastillas-y-zapatas-de-freno' },
  { name: 'FILTROS DE ACEITE', slug: 'filtros-de-aceite' },
  { name: 'KIT SERVICE', slug: 'kit-service' },
  { name: 'ESCAPES', slug: 'escapes' },
  { name: 'CABLES DE EMBRAGUE', slug: 'cables-de-embrague' },
]

export const findProductCategory = (pathname: string) => {
  const slug = pathname.match(/^\/productos\/([^/]+)\/?$/)?.[1]
  return productCategories.find((category) => category.slug === slug)
}
