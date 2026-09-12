import { ProductsPage } from './ProductsPage'
import type { ProductCategory } from './productCategories'

type ProductCategoryPageProps = {
  category: ProductCategory
}

export function ProductCategoryPage({ category }: ProductCategoryPageProps) {
  return <ProductsPage category={category} />
}
