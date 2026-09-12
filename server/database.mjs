import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const dataDirectory = resolve(serverDirectory, '../data')
const databasePath = process.env.GALVEZ_DATABASE_PATH
  ? resolve(process.env.GALVEZ_DATABASE_PATH)
  : resolve(dataDirectory, 'galvez.sqlite3')

mkdirSync(dataDirectory, { recursive: true })

export const database = new DatabaseSync(databasePath)

database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'cubiertas',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    image_data BLOB NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_postal_code TEXT NOT NULL,
    total REAL NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending',
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    public_token TEXT,
    mp_collector_id TEXT,
    stock_deducted INTEGER NOT NULL DEFAULT 0 CHECK (stock_deducted IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE INDEX IF NOT EXISTS idx_product_images_product_id
    ON product_images(product_id);
`)

const productColumns = database.prepare('PRAGMA table_info(products)').all()
if (!productColumns.some(({ name }) => name === 'category')) {
  database.exec("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'cubiertas'")
}

const adminUserColumns = database.prepare('PRAGMA table_info(admin_users)').all()
const orderColumns = database.prepare('PRAGMA table_info(orders)').all()
if (!orderColumns.some(({ name }) => name === 'public_token')) database.exec('ALTER TABLE orders ADD COLUMN public_token TEXT')
if (!orderColumns.some(({ name }) => name === 'mp_collector_id')) database.exec('ALTER TABLE orders ADD COLUMN mp_collector_id TEXT')
if (!orderColumns.some(({ name }) => name === 'stock_deducted')) database.exec('ALTER TABLE orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0 CHECK (stock_deducted IN (0, 1))')
if (!orderColumns.some(({ name }) => name === 'updated_at')) database.exec('ALTER TABLE orders ADD COLUMN updated_at TEXT')
if (!adminUserColumns.some(({ name }) => name === 'is_active')) {
  database.exec('ALTER TABLE admin_users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))')
}
if (!productColumns.some(({ name }) => name === 'is_active')) {
  database.exec('ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))')
}
if (!productColumns.some(({ name }) => name === 'title')) {
  database.exec("ALTER TABLE products ADD COLUMN title TEXT NOT NULL DEFAULT ''")
}
if (!productColumns.some(({ name }) => name === 'is_deleted')) {
  database.exec('ALTER TABLE products ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1))')
}

database.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_category
    ON products(category);

  UPDATE products
  SET is_active = 0
  WHERE quantity = 0 AND is_active = 1;

  CREATE TRIGGER IF NOT EXISTS deactivate_product_without_stock
  AFTER UPDATE OF quantity ON products
  WHEN NEW.quantity = 0 AND NEW.is_active = 1
  BEGIN
    UPDATE products SET is_active = 0 WHERE id = NEW.id;
  END;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_token ON orders(public_token) WHERE public_token IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON orders(mp_payment_id) WHERE mp_payment_id IS NOT NULL;
`)

const listProductsStatement = database.prepare(`
  SELECT id, category, title, description, price, quantity, is_active AS isActive,
         created_at AS createdAt
  FROM products
  WHERE is_active = 1 AND is_deleted = 0 AND quantity > 0
  ORDER BY id DESC
`)
const listProductsByCategoryStatement = database.prepare(`
  SELECT id, category, title, description, price, quantity, is_active AS isActive,
         created_at AS createdAt
  FROM products
  WHERE is_active = 1 AND is_deleted = 0 AND quantity > 0 AND category = ?
  ORDER BY id DESC
`)
const searchProductsStatement = database.prepare(`
  SELECT id, category, title, description, price, quantity, is_active AS isActive,
         created_at AS createdAt
  FROM products
  WHERE is_active = 1 AND is_deleted = 0 AND quantity > 0
    AND (title LIKE ? COLLATE NOCASE OR category LIKE ? COLLATE NOCASE)
  ORDER BY id DESC
`)
const searchProductSuggestionsStatement = database.prepare(`
  SELECT DISTINCT title
  FROM products
  WHERE is_active = 1 AND is_deleted = 0 AND quantity > 0 AND title <> '' AND title LIKE ? COLLATE NOCASE
  ORDER BY title COLLATE NOCASE
  LIMIT 6
`)
const listAdminProductsStatement = database.prepare(`
  SELECT id, category, title, description, price, quantity, is_active AS isActive,
         created_at AS createdAt
  FROM products
  WHERE is_deleted = 0
  ORDER BY id DESC
`)
const getAdminProductStatement = database.prepare(`
  SELECT id, category, title, description, price, quantity, is_active AS isActive,
         created_at AS createdAt
  FROM products
  WHERE id = ?
`)
const getProductStatement = database.prepare(`
  SELECT id, category, title, description, price, quantity, is_active AS isActive,
         created_at AS createdAt
  FROM products
  WHERE id = ? AND is_active = 1 AND is_deleted = 0 AND quantity > 0
`)
const listImagesStatement = database.prepare(`
  SELECT mime_type AS mimeType, image_data AS imageData
  FROM product_images WHERE product_id = ? ORDER BY sort_order, id
`)
const insertProductStatement = database.prepare(`
  INSERT INTO products (category, title, description, price, quantity, is_active)
  VALUES (?, ?, ?, ?, ?, ?)
`)
const insertImageStatement = database.prepare(`
  INSERT INTO product_images (product_id, mime_type, image_data, sort_order)
  VALUES (?, ?, ?, ?)
`)
const deactivateProductStatement = database.prepare(`
  UPDATE products SET is_active = 0 WHERE id = ? AND is_active = 1 AND is_deleted = 0
`)
const activateProductStatement = database.prepare(`
  UPDATE products
  SET price = ?, quantity = ?, is_active = 1
  WHERE id = ? AND is_active = 0 AND is_deleted = 0
`)
const deleteProductStatement = database.prepare(`
  UPDATE products SET is_active = 0, is_deleted = 1 WHERE id = ? AND is_deleted = 0
`)
const findAdminUserStatement = database.prepare(`
  SELECT id, username, password_hash AS passwordHash, password_salt AS passwordSalt,
         is_active AS isActive, created_at AS createdAt
  FROM admin_users
  WHERE username = ? COLLATE NOCASE
`)
const listAdminUsersStatement = database.prepare(`
  SELECT id, username, is_active AS isActive, created_at AS createdAt
  FROM admin_users ORDER BY username COLLATE NOCASE
`)
const setAdminUserActiveStatement = database.prepare('UPDATE admin_users SET is_active = ? WHERE id = ?')
const deleteAdminUserStatement = database.prepare('DELETE FROM admin_users WHERE id = ?')
const getCheckoutProductStatement = database.prepare(`
  SELECT id, title, description, price, quantity
  FROM products WHERE id = ? AND is_active = 1 AND is_deleted = 0 AND quantity > 0
`)
const insertOrderItemStatement = database.prepare(`
  INSERT INTO order_items (order_id, product_id, title, unit_price, quantity)
  VALUES (?, ?, ?, ?, ?)
`)
const setOrderPreferenceStatement = database.prepare('UPDATE orders SET mp_preference_id = ?, mp_collector_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
const getOrderForPaymentStatement = database.prepare(`SELECT id, total, status, public_token AS publicToken,
  mp_payment_id AS mpPaymentId, mp_collector_id AS mpCollectorId, stock_deducted AS stockDeducted FROM orders WHERE id = ?`)
const getPublicOrderStatement = database.prepare(`SELECT id, total, status, mp_payment_id AS paymentId,
  created_at AS createdAt, updated_at AS updatedAt FROM orders WHERE id = ? AND public_token = ?`)
const getOrderItemsStatement = database.prepare('SELECT product_id AS productId, title, unit_price AS unitPrice, quantity FROM order_items WHERE order_id = ? ORDER BY id')
const updateOrderPaymentStatement = database.prepare(`UPDATE orders SET status = ?, mp_payment_id = ?, stock_deducted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
const decrementStockStatement = database.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?')
const insertAdminUserStatement = database.prepare(`
  INSERT INTO admin_users (username, password_hash, password_salt)
  VALUES (?, ?, ?)
`)

const serializeProduct = (product) => ({
  ...product,
  images: listImagesStatement.all(product.id).map(
    ({ mimeType, imageData }) =>
      `data:${mimeType};base64,${Buffer.from(imageData).toString('base64')}`,
  ),
})

export const listProducts = (category) => (
  category ? listProductsByCategoryStatement.all(category) : listProductsStatement.all()
).map(serializeProduct)
export const searchProducts = (query, categoryQuery) => searchProductsStatement
  .all(`%${query}%`, `%${categoryQuery}%`)
  .map(serializeProduct)
export const searchProductSuggestions = (query) => searchProductSuggestionsStatement
  .all(`%${query}%`)
  .map(({ title }) => title)
export const getProduct = (id) => {
  const product = getProductStatement.get(id)
  return product ? serializeProduct(product) : null
}
export const listAdminProducts = () => listAdminProductsStatement.all().map(serializeProduct)

export const deactivateProduct = (id) => deactivateProductStatement.run(id).changes > 0
export const deleteProduct = (id) => deleteProductStatement.run(id).changes > 0
export const activateProduct = (id, { price, quantity }) => {
  if (activateProductStatement.run(price, quantity, id).changes === 0) return null
  const product = getAdminProductStatement.get(id)
  return product ? serializeProduct(product) : null
}
export const findAdminUser = (username) => findAdminUserStatement.get(username)
export const listAdminUsers = () => listAdminUsersStatement.all()
export const setAdminUserActive = (id, active) => setAdminUserActiveStatement.run(active ? 1 : 0, id).changes > 0
export const deleteAdminUser = (id) => deleteAdminUserStatement.run(id).changes > 0

export const prepareOrderItems = (requestedItems) => requestedItems.map(({ id, quantity }) => {
  const product = getCheckoutProductStatement.get(id)
  if (!product) throw new Error(`El producto #${id} no está disponible`)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.quantity) {
    throw new Error(`Stock insuficiente para ${product.title || `producto #${id}`}`)
  }
  return { ...product, orderQuantity: quantity }
})

export const createOrder = ({ customer, items, publicToken }) => {
  const total = items.reduce((sum, item) => sum + item.price * item.orderQuantity, 0)
  database.exec('BEGIN')
  try {
    const result = database.prepare(`INSERT INTO orders
      (customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_postal_code, total, public_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      customer.name, customer.email, customer.phone, customer.address, customer.city, customer.postalCode, total,
      publicToken,
    )
    const orderId = Number(result.lastInsertRowid)
    items.forEach((item) => insertOrderItemStatement.run(
      orderId, item.id, item.title || `Producto #${item.id}`, item.price, item.orderQuantity,
    ))
    database.exec('COMMIT')
    return { id: orderId, total, publicToken }
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export const setOrderPreference = (orderId, preferenceId, collectorId) => setOrderPreferenceStatement.run(preferenceId, collectorId || null, orderId)
export const getOrderForPayment = (orderId) => getOrderForPaymentStatement.get(orderId)
export const getPublicOrder = (orderId, publicToken) => {
  const order = getPublicOrderStatement.get(orderId, publicToken)
  return order ? { ...order, items: getOrderItemsStatement.all(orderId) } : null
}
export const applyOrderPayment = (orderId, status, paymentId) => {
  database.exec('BEGIN IMMEDIATE')
  try {
    const order = getOrderForPaymentStatement.get(orderId)
    if (!order) throw new Error('Orden inexistente')
    if (order.mpPaymentId && order.mpPaymentId !== paymentId) throw new Error('La orden ya está asociada a otro pago')
    let stockDeducted = Boolean(order.stockDeducted)
    if (status === 'approved' && !stockDeducted) {
      for (const item of getOrderItemsStatement.all(orderId)) {
        if (decrementStockStatement.run(item.quantity, item.productId, item.quantity).changes !== 1) {
          throw new Error(`Stock insuficiente para ${item.title}`)
        }
      }
      stockDeducted = true
    }
    const protectedStatus = order.status === 'approved' && !['refunded', 'charged_back'].includes(status) ? 'approved' : status
    updateOrderPaymentStatement.run(protectedStatus, paymentId, stockDeducted ? 1 : 0, orderId)
    database.exec('COMMIT')
    return { status: protectedStatus, stockDeducted }
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
export const createAdminUser = ({ username, passwordHash, passwordSalt }) => {
  const result = insertAdminUserStatement.run(username, passwordHash, passwordSalt)
  return { id: Number(result.lastInsertRowid), username }
}

export const createProduct = ({ category, title, description, price, quantity, images }) => {
  database.exec('BEGIN')
  try {
    const isActive = quantity > 0 ? 1 : 0
    const result = insertProductStatement.run(category, title, description, price, quantity, isActive)
    const productId = Number(result.lastInsertRowid)

    images.forEach((image, index) => {
      const match = image.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) throw new Error('Formato de imagen inválido')
      insertImageStatement.run(
        productId,
        match[1],
        Buffer.from(match[2], 'base64'),
        index,
      )
    })

    database.exec('COMMIT')
    return serializeProduct({
      id: productId,
      category,
      title,
      description,
      price,
      quantity,
      isActive,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
