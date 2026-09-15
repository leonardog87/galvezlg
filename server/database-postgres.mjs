import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada')

const sql = neon(process.env.DATABASE_URL)

const ready = sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'cubiertas', title TEXT NOT NULL,
    description TEXT NOT NULL, price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE, is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  sql`CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL, image_data BYTEA NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  sql`CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  sql`CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL, shipping_address TEXT NOT NULL, shipping_city TEXT NOT NULL,
    shipping_postal_code TEXT NOT NULL, total DOUBLE PRECISION NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending', mp_preference_id TEXT, mp_payment_id TEXT,
    public_token TEXT UNIQUE, mp_collector_id TEXT, stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  sql`CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id), title TEXT NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0)
  )`,
  sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
  sql`CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON orders(mp_payment_id)
    WHERE mp_payment_id IS NOT NULL`,
])

const query = async (text, params = []) => {
  await ready
  return sql(text, params)
}

const serializeProducts = async (products) => {
  if (!products.length) return []
  const ids = products.map(({ id }) => id)
  const images = await query(`SELECT product_id AS "productId", mime_type AS "mimeType",
    encode(image_data, 'base64') AS data FROM product_images WHERE product_id = ANY($1::bigint[])
    ORDER BY sort_order, id`, [ids])
  return products.map((product) => ({
    ...product,
    images: images.filter((image) => String(image.productId) === String(product.id))
      .map((image) => `data:${image.mimeType};base64,${image.data}`),
  }))
}

const productSelect = `SELECT id::int, category, title, description, price, quantity,
  is_active AS "isActive", created_at AS "createdAt" FROM products`

export const listProducts = async (category) => serializeProducts(await query(
  `${productSelect} WHERE is_active AND NOT is_deleted AND quantity > 0${category ? ' AND category = $1' : ''} ORDER BY id DESC`,
  category ? [category] : [],
))

export const searchProducts = async (search, category) => serializeProducts(await query(
  `${productSelect} WHERE is_active AND NOT is_deleted AND quantity > 0
   AND (title ILIKE $1 OR category ILIKE $2) ORDER BY id DESC`, [`%${search}%`, `%${category}%`],
))

export const searchProductSuggestions = async (search) => (await query(
  `SELECT DISTINCT title FROM products WHERE is_active AND NOT is_deleted AND quantity > 0
   AND title <> '' AND title ILIKE $1 ORDER BY title LIMIT 6`, [`%${search}%`],
)).map(({ title }) => title)

export const getProduct = async (id) => {
  const rows = await query(`${productSelect} WHERE id = $1 AND is_active AND NOT is_deleted AND quantity > 0`, [id])
  return rows.length ? (await serializeProducts(rows))[0] : null
}

export const listAdminProducts = async () => serializeProducts(await query(
  `${productSelect} WHERE NOT is_deleted ORDER BY id DESC`,
))

export const deactivateProduct = async (id) => (await query(
  'UPDATE products SET is_active = FALSE WHERE id = $1 AND is_active AND NOT is_deleted RETURNING id', [id],
)).length > 0
export const deleteProduct = async (id) => (await query(
  'UPDATE products SET is_active = FALSE, is_deleted = TRUE WHERE id = $1 AND NOT is_deleted RETURNING id', [id],
)).length > 0
export const activateProduct = async (id, { price, quantity }) => {
  const updated = await query(`UPDATE products SET price = $1, quantity = $2, is_active = TRUE
    WHERE id = $3 AND NOT is_active AND NOT is_deleted
    RETURNING id::int, category, title, description, price, quantity,
    is_active AS "isActive", created_at AS "createdAt"`, [price, quantity, id])
  if (!updated.length) return null
  return (await serializeProducts(updated))[0]
}

export const findAdminUser = async (username) => (await query(`SELECT id::int, username,
  password_hash AS "passwordHash", password_salt AS "passwordSalt", is_active AS "isActive",
  created_at AS "createdAt" FROM admin_users WHERE lower(username) = lower($1)`, [username]))[0]
export const listAdminUsers = async () => query(`SELECT id::int, username, is_active AS "isActive",
  created_at AS "createdAt" FROM admin_users ORDER BY lower(username)`)
export const setAdminUserActive = async (id, active) => (await query(
  'UPDATE admin_users SET is_active = $1 WHERE id = $2 RETURNING id', [active, id],
)).length > 0
export const deleteAdminUser = async (id) => (await query(
  'DELETE FROM admin_users WHERE id = $1 RETURNING id', [id],
)).length > 0

export const prepareOrderItems = async (requestedItems) => {
  const items = []
  for (const { id, quantity } of requestedItems) {
    const product = (await query(`SELECT id::int, title, description, price, quantity FROM products
      WHERE id = $1 AND is_active AND NOT is_deleted AND quantity > 0`, [id]))[0]
    if (!product) throw new Error(`El producto #${id} no está disponible`)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.quantity) {
      throw new Error(`Stock insuficiente para ${product.title || `producto #${id}`}`)
    }
    items.push({ ...product, orderQuantity: quantity })
  }
  return items
}

export const createOrder = async ({ customer, items, publicToken }) => {
  const total = items.reduce((sum, item) => sum + item.price * item.orderQuantity, 0)
  const rows = await query(`WITH new_order AS (
    INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address,
      shipping_city, shipping_postal_code, total, public_token)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
  ), inserted_items AS (
    INSERT INTO order_items (order_id, product_id, title, unit_price, quantity)
    SELECT new_order.id, item.id, item.title, item.price, item.quantity
    FROM new_order, jsonb_to_recordset($9::jsonb) AS item(id bigint, title text, price float8, quantity int)
  ) SELECT id::int FROM new_order`, [customer.name, customer.email, customer.phone, customer.address,
    customer.city, customer.postalCode, total, publicToken, JSON.stringify(items.map((item) => ({
      id: item.id, title: item.title || `Producto #${item.id}`, price: item.price, quantity: item.orderQuantity,
    })))])
  return { id: rows[0].id, total, publicToken }
}

export const setOrderPreference = async (orderId, preferenceId, collectorId) => query(
  `UPDATE orders SET mp_preference_id=$1, mp_collector_id=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3`,
  [preferenceId, collectorId || null, orderId],
)
export const getOrderForPayment = async (id) => (await query(`SELECT id::int, total, status,
  public_token AS "publicToken", mp_payment_id AS "mpPaymentId", mp_collector_id AS "mpCollectorId",
  stock_deducted AS "stockDeducted" FROM orders WHERE id=$1`, [id]))[0]
export const getPublicOrder = async (id, token) => {
  const order = (await query(`SELECT id::int, total, status, mp_payment_id AS "paymentId",
    created_at AS "createdAt", updated_at AS "updatedAt" FROM orders WHERE id=$1 AND public_token=$2`, [id, token]))[0]
  if (!order) return null
  order.items = await query(`SELECT product_id::int AS "productId", title, unit_price AS "unitPrice",
    quantity FROM order_items WHERE order_id=$1 ORDER BY id`, [id])
  return order
}

export const applyOrderPayment = async (orderId, status, paymentId) => {
  const rows = await query(`WITH locked_order AS MATERIALIZED (
      SELECT * FROM orders WHERE id=$1 FOR UPDATE
    ), availability AS MATERIALIZED (
      SELECT COUNT(*) FILTER (WHERE p.quantity < oi.quantity)::int AS unavailable
      FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=$1
    ), changed AS (
      UPDATE products p SET quantity=p.quantity-oi.quantity,
        is_active=(p.quantity-oi.quantity)>0
      FROM order_items oi, locked_order o, availability a
      WHERE oi.order_id=$1 AND p.id=oi.product_id AND $2='approved'
        AND NOT o.stock_deducted AND a.unavailable=0
        AND (o.mp_payment_id IS NULL OR o.mp_payment_id=$3)
      RETURNING p.id
    ), updated AS (
      UPDATE orders o SET
        status=CASE WHEN o.status='approved' AND $2 NOT IN ('refunded','charged_back') THEN 'approved' ELSE $2 END,
        mp_payment_id=$3, stock_deducted=o.stock_deducted OR $2='approved',
        updated_at=CURRENT_TIMESTAMP
      FROM locked_order lo, availability a
      WHERE o.id=lo.id AND (lo.mp_payment_id IS NULL OR lo.mp_payment_id=$3)
        AND ($2<>'approved' OR lo.stock_deducted OR a.unavailable=0)
      RETURNING o.status, o.stock_deducted AS "stockDeducted"
    ) SELECT EXISTS(SELECT 1 FROM locked_order) AS exists,
      EXISTS(SELECT 1 FROM locked_order WHERE mp_payment_id IS NOT NULL AND mp_payment_id<>$3) AS conflict,
      (SELECT unavailable FROM availability) AS unavailable,
      (SELECT status FROM updated) AS status,
      (SELECT "stockDeducted" FROM updated) AS "stockDeducted"`, [orderId, status, paymentId])
  const result = rows[0]
  if (!result.exists) throw new Error('Orden inexistente')
  if (result.conflict) throw new Error('La orden ya está asociada a otro pago')
  if (status === 'approved' && result.unavailable > 0) throw new Error('Stock insuficiente para completar la orden')
  return { status: result.status, stockDeducted: result.stockDeducted }
}

export const createAdminUser = async ({ username, passwordHash, passwordSalt }) => {
  const rows = await query(`INSERT INTO admin_users (username,password_hash,password_salt)
    VALUES ($1,$2,$3) RETURNING id::int, username`, [username, passwordHash, passwordSalt])
  return rows[0]
}

export const createProduct = async ({ category, title, description, price, quantity, images }) => {
  const payload = images.map((image, index) => {
    const match = image.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) throw new Error('Formato de imagen inválido')
    return { mimeType: match[1], data: match[2], sortOrder: index }
  })
  const rows = await query(`WITH new_product AS (
    INSERT INTO products (category,title,description,price,quantity,is_active)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
  ), inserted_images AS (
    INSERT INTO product_images (product_id,mime_type,image_data,sort_order)
    SELECT new_product.id, image.mime_type, decode(image.data,'base64'), image.sort_order
    FROM new_product, jsonb_to_recordset($7::jsonb) AS image(mime_type text,data text,sort_order int)
  ) SELECT id::int, category,title,description,price,quantity,is_active AS "isActive",
    created_at AS "createdAt" FROM new_product`, [category, title, description, price, quantity,
    quantity > 0, JSON.stringify(payload.map((x) => ({ mime_type: x.mimeType, data: x.data, sort_order: x.sortOrder })))])
  return { ...rows[0], images }
}
