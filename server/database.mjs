const implementation = process.env.DATABASE_URL
  ? await import('./database-postgres.mjs')
  : await import('./database-sqlite.mjs')

export const database = implementation.database
export const activateProduct = implementation.activateProduct
export const applyOrderPayment = implementation.applyOrderPayment
export const createAdminUser = implementation.createAdminUser
export const createOrder = implementation.createOrder
export const createProduct = implementation.createProduct
export const deactivateProduct = implementation.deactivateProduct
export const deleteAdminUser = implementation.deleteAdminUser
export const deleteProduct = implementation.deleteProduct
export const findAdminUser = implementation.findAdminUser
export const getOrderForPayment = implementation.getOrderForPayment
export const getProduct = implementation.getProduct
export const getPublicOrder = implementation.getPublicOrder
export const listAdminProducts = implementation.listAdminProducts
export const listAdminUsers = implementation.listAdminUsers
export const listProducts = implementation.listProducts
export const prepareOrderItems = implementation.prepareOrderItems
export const searchProductSuggestions = implementation.searchProductSuggestions
export const searchProducts = implementation.searchProducts
export const setAdminUserActive = implementation.setAdminUserActive
export const setOrderPreference = implementation.setOrderPreference
