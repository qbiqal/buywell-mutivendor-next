# APRAS Naturals — Development Blueprint Part 2
## Database Schema, Cache Strategy & Feature Specifications

> Continuation of Part 1. All schema uses Drizzle ORM. Redis namespace: `an:`
> PostgreSQL DB: `apras_naturals_db` on 178.104.158.232 via PgBouncer :6432

---

## 1. DATABASE SCHEMA (Drizzle ORM)

### 1.1 — Users & Auth

```typescript
// users
export const users = pgTable("users", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  email:         text("email").notNull().unique(),
  passwordHash:  text("password_hash").notNull(),
  firstName:     text("first_name").notNull(),
  lastName:      text("last_name"),
  phone:         text("phone"),
  role:          text("role").default("customer").notNull(), // customer | admin
  isActive:      boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

// addresses
export const addresses = pgTable("addresses", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  userId:     text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  label:      text("label"),           // "Home", "Office"
  name:       text("name").notNull(),
  phone:      text("phone").notNull(),
  line1:      text("line1").notNull(),
  line2:      text("line2"),
  city:       text("city").notNull(),
  state:      text("state").notNull(),
  pincode:    text("pincode").notNull(),
  isDefault:  boolean("is_default").default(false),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});
```

### 1.2 — Products & Inventory

```typescript
// products
export const products = pgTable("products", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  name:         text("name").notNull(),
  slug:         text("slug").notNull().unique(),
  category:     text("category").notNull(),      // honey | ghee | other
  subCategory:  text("sub_category"),            // tulsi | karanj | moringa | a2-bilona
  description:  text("description"),
  longDesc:     text("long_desc"),               // rich text HTML
  sku:          text("sku").notNull().unique(),
  isActive:     boolean("is_active").default(true).notNull(),
  isFeatured:   boolean("is_featured").default(false).notNull(),
  sortOrder:    integer("sort_order").default(0),
  metaTitle:    text("meta_title"),
  metaDesc:     text("meta_desc"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

// product_variants (500g, 1kg, etc.)
export const productVariants = pgTable("product_variants", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  productId:    text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  name:         text("name").notNull(),          // "500g", "1kg"
  priceInr:     integer("price_inr").notNull(),  // in paise (×100)
  mrpInr:       integer("mrp_inr"),
  weight:       text("weight"),                  // "500g"
  stock:        integer("stock").default(0).notNull(),
  sku:          text("sku").notNull().unique(),
  isActive:     boolean("is_active").default(true).notNull(),
  sortOrder:    integer("sort_order").default(0),
});

// product_images
export const productImages = pgTable("product_images", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  productId:  text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url:        text("url").notNull(),
  alt:        text("alt"),
  isPrimary:  boolean("is_primary").default(false),
  sortOrder:  integer("sort_order").default(0),
});
```

### 1.3 — Orders

```typescript
// orders
export const orders = pgTable("orders", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  orderNumber:    text("order_number").notNull().unique(),  // AN-2024-0001
  userId:         text("user_id").references(() => users.id),  // nullable for guest
  guestName:      text("guest_name"),
  guestEmail:     text("guest_email"),
  guestPhone:     text("guest_phone"),
  status:         text("status").default("pending").notNull(),
  // pending | payment_pending | payment_uploaded | payment_verified |
  // confirmed | processing | shipped | delivered | cancelled | refunded
  paymentStatus:  text("payment_status").default("pending").notNull(),
  // pending | uploaded | verified | rejected
  paymentMethod:  text("payment_method").default("upi_qr"),
  paymentProofUrl:text("payment_proof_url"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  paymentVerifiedBy: text("payment_verified_by"),  // admin user id
  subtotalInr:    integer("subtotal_inr").notNull(),  // in paise
  shippingInr:    integer("shipping_inr").default(0).notNull(),
  discountInr:    integer("discount_inr").default(0).notNull(),
  totalInr:       integer("total_inr").notNull(),
  addressId:      text("address_id").references(() => addresses.id),
  addressSnapshot:jsonb("address_snapshot"),  // frozen at order time
  notes:          text("notes"),
  adminNotes:     text("admin_notes"),
  trackingNumber: text("tracking_number"),
  trackingUrl:    text("tracking_url"),
  courier:        text("courier"),
  estimatedDelivery: date("estimated_delivery"),
  whatsappSentAt: timestamp("whatsapp_sent_at"),
  isSampleRequest:boolean("is_sample_request").default(false).notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});

// order_items
export const orderItems = pgTable("order_items", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  orderId:    text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  variantId:  text("variant_id").references(() => productVariants.id).notNull(),
  productSnapshot: jsonb("product_snapshot").notNull(),  // name, variant, price at order time
  quantity:   integer("quantity").notNull(),
  unitPriceInr: integer("unit_price_inr").notNull(),
  totalInr:   integer("total_inr").notNull(),
});

// order_status_history
export const orderStatusHistory = pgTable("order_status_history", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  orderId:    text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  status:     text("status").notNull(),
  note:       text("note"),
  changedBy:  text("changed_by"),  // admin user id or "system"
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});
```

### 1.4 — Blog

```typescript
// blog_categories
export const blogCategories = pgTable("blog_categories", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  name:       text("name").notNull(),
  slug:       text("slug").notNull().unique(),
  color:      text("color"),  // hex color for badge
  sortOrder:  integer("sort_order").default(0),
});

// blog_posts
export const blogPosts = pgTable("blog_posts", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  title:        text("title").notNull(),
  slug:         text("slug").notNull().unique(),
  excerpt:      text("excerpt"),
  content:      text("content").notNull(),  // rich text HTML
  coverImageUrl:text("cover_image_url"),
  categoryId:   text("category_id").references(() => blogCategories.id),
  authorId:     text("author_id").references(() => users.id).notNull(),
  status:       text("status").default("draft").notNull(),  // draft | published | archived
  publishedAt:  timestamp("published_at"),
  readTime:     integer("read_time"),  // minutes
  metaTitle:    text("meta_title"),
  metaDesc:     text("meta_desc"),
  tags:         text("tags").array(),
  viewCount:    integer("view_count").default(0).notNull(),
  isFeatured:   boolean("is_featured").default(false),
  sortOrder:    integer("sort_order").default(0),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});
```

### 1.5 — Media Library

```typescript
// media
export const media = pgTable("media", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  filename:     text("filename").notNull(),
  originalName: text("original_name").notNull(),
  url:          text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  mimeType:     text("mime_type").notNull(),
  size:         integer("size").notNull(),  // bytes
  width:        integer("width"),
  height:       integer("height"),
  alt:          text("alt"),
  folder:       text("folder").default("general"),
  uploadedBy:   text("uploaded_by").references(() => users.id),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});
```

### 1.6 — CMS / Site Config

```typescript
// site_config (key-value store — same pattern as StockSense appConfig)
export const siteConfig = pgTable("site_config", {
  key:       text("key").primaryKey(),
  value:     text("value"),
  category:  text("category").default("general"),
  label:     text("label"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// cms_sections (landing page sections config)
export const cmsSections = pgTable("cms_sections", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  sectionKey: text("section_key").notNull().unique(),  // hero | promise | products | about | faq | cta
  isEnabled:  boolean("is_enabled").default(true).notNull(),
  sortOrder:  integer("sort_order").default(0).notNull(),
  config:     jsonb("config"),  // section-specific JSON config (headings, texts, colors)
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});
```

### 1.7 — Testimonials & Reviews

```typescript
export const testimonials = pgTable("testimonials", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  name:       text("name").notNull(),
  location:   text("location"),
  content:    text("content").notNull(),
  rating:     integer("rating").default(5),
  mediaUrl:   text("media_url"),      // video or image testimonial
  mediaType:  text("media_type"),     // video | image
  isApproved: boolean("is_approved").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  sortOrder:  integer("sort_order").default(0),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});
```

### 1.8 — Notifications

```typescript
export const notifications = pgTable("notifications", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  userId:     text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type:       text("type").notNull(),  // order_confirmed | order_shipped | payment_verified | etc.
  title:      text("title").notNull(),
  body:       text("body").notNull(),
  link:       text("link"),
  isRead:     boolean("is_read").default(false).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});
```

---

## 2. POSTGRESQL INDEXES

```sql
-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Blog
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);

-- Media
CREATE INDEX idx_media_folder ON media(folder);
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

---

## 3. THREE-LAYER CACHE SYSTEM (Event-Based Invalidation)

### Architecture

```
L1 — Page/Component Cache  (Redis TTL: 1 hour)
     Key pattern: an:page:{pageKey}:{params}
     Example: an:page:products, an:page:blog:list:1, an:page:cms:landing

L2 — Query Cache  (Redis TTL: 15 minutes)
     Key pattern: an:query:{resource}:{params}
     Example: an:query:products:active, an:query:blog:featured

L3 — DB  (source of truth — no cache)

Invalidation events trigger cache busting at all layers.
```

### Cache Implementation

```typescript
// src/lib/cache.ts

export const CACHE_TTL = {
  PAGE:     3600,    // 1 hour
  QUERY:    900,     // 15 minutes
  SESSION:  86400,   // 24 hours
  CONFIG:   1800,    // 30 minutes
} as const;

// Event-based invalidation keys
export const CACHE_TAGS = {
  PRODUCTS:     "an:tag:products",
  ORDERS:       "an:tag:orders",
  BLOG:         "an:tag:blog",
  CMS:          "an:tag:cms",
  TESTIMONIALS: "an:tag:testimonials",
} as const;

export async function invalidateTag(tag: string) {
  // Get all keys with this tag pattern and delete them
  const keys = await redis.keys(`an:*:${tag}:*`);
  if (keys.length > 0) await redis.del(...keys);
}

// Simpler approach: prefix-based invalidation
export async function invalidateByPrefix(prefix: string) {
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length > 0) await redis.del(...keys);
}

// Usage: when admin updates a product, call:
// await invalidateByPrefix("an:page:products");
// await invalidateByPrefix("an:query:products");
// await invalidateByPrefix("an:page:cms:landing"); // if product featured on landing
```

### Cache Events

| Admin Action | Invalidates |
|-------------|-------------|
| Update product | `an:query:products:*`, `an:page:shop:*`, `an:page:cms:landing` |
| Update CMS section | `an:page:cms:landing`, `an:query:cms:*` |
| Publish blog post | `an:page:blog:*`, `an:query:blog:*` |
| Update testimonial | `an:query:testimonials:*`, `an:page:cms:landing` |
| Update site config | `an:query:config:*`, `an:page:cms:landing` |

---

## 4. FEATURE SPECS — ORDER FLOW

### Customer Journey

```
1. Browse shop → Add to cart (localStorage)
2. Checkout form → Enter name, phone, address
3. Order placed → Status: "pending"
4. Payment page → Company QR displayed
   - Customer scans QR
   - Customer uploads payment screenshot
   - Status: "payment_uploaded"
5. WhatsApp notification → Admin receives order details + proof
6. Admin verifies in admin panel → Status: "payment_verified" → "confirmed"
7. Admin sends WhatsApp to customer: "Order confirmed, will ship in 24-48 hours"
8. Admin updates tracking → Status: "shipped"
9. Customer sees tracking in portal → Status: "delivered"
```

### Order Number Format

```
AN-YYYY-NNNN  →  AN-2024-0001
Generated server-side with sequence + year prefix
```

### QR Code Payment

```
- Admin uploads company UPI QR in admin settings
- Stored in siteConfig: payment_qr_url
- Checkout page fetches and displays this QR
- Upload field accepts JPG/PNG (max 5MB)
- Preview shown to customer after upload
- Admin sees proof image in order detail panel
```

---

## 5. FEATURE SPECS — MEDIA UPLOADER COMPONENT

```typescript
// components/media/MediaUploader/index.tsx
// Drag & drop + auto-crop using dnd-kit + react-image-crop

interface MediaUploaderProps {
  accept: string[];          // ["image/jpeg", "image/png", "video/mp4"]
  maxSize: number;           // bytes
  maxFiles: number;
  aspectRatio?: number;      // e.g. 16/9, 1/1, 4/3 — triggers auto-crop
  recommendedDimensions?: {  // shown as hint in UI
    width: number;
    height: number;
    label: string;           // "Recommended: 1200×800px"
  };
  onUpload: (files: UploadedFile[]) => void;
  folder?: string;
  multiple?: boolean;
}

// Usage throughout admin:
// <MediaUploader 
//   accept={["image/jpeg", "image/png"]}
//   maxSize={5 * 1024 * 1024}
//   aspectRatio={4/3}
//   recommendedDimensions={{ width: 1200, height: 900, label: "Product images: 1200×900px" }}
//   onUpload={handleUpload}
//   folder="products"
// />
```

**Where MediaUploader is used:**

| Location | Accept | Aspect | Recommended Size |
|----------|--------|--------|-----------------|
| Product images | JPG/PNG | 4:3 | 1200×900px |
| Blog cover | JPG/PNG | 16:9 | 1600×900px |
| Testimonial photo | JPG | 1:1 | 400×400px |
| Payment QR | JPG/PNG | 1:1 | 800×800px |
| CMS hero background | JPG/PNG | 16:9 | 1920×1080px |
| Admin avatar | JPG/PNG | 1:1 | 200×200px |
| Payment proof (customer) | JPG/PNG | free | Max 5MB |

---

## 6. FEATURE SPECS — BLOG SYSTEM

### Blog Workflow (Admin)

```
1. Admin → /admin/blog → Blog posts list (grid or list view toggle)
2. Create post → Rich text editor with:
   - Title, slug (auto-generated, editable)
   - Category (select or create inline)
   - Tags (multi-input)
   - Cover image (MediaUploader, 16:9, 1600×900 recommended)
   - Content editor (custom WYSIWYG or contenteditable with toolbar)
   - Excerpt (auto-generated from content, editable)
   - SEO: meta title, meta description
   - Featured toggle
   - Status: Draft → Published → Archived
3. Publish → Appears in /blog (public)
4. Cache invalidation → an:page:blog:* cleared on publish/update

Blog listing view options (admin toggle):
  - Grid view: 3-column cards with cover image
  - List view: compact rows

Blog public pages:
  /blog          → Grid of published posts (3 col), pagination
  /blog/[slug]   → Full post detail with related posts
```

### Blog Config (admin-configurable)

```
siteConfig keys:
  blog_enabled:      true/false
  blog_title:        "APRAS Naturals Journal"
  blog_subtitle:     "Stories of purity, tradition & wellness"
  blog_layout:       grid | list
  blog_posts_per_page: 9
  blog_show_author:  true/false
  blog_show_read_time: true/false
  blog_show_related: true/false
  blog_related_count: 3
```

---

## 7. FEATURE SPECS — CMS / LANDING PAGE

### CMS Sections (all configurable from admin)

| Section Key | Configurable Fields |
|-------------|-------------------|
| `hero` | heading, subheading, badge text, CTA buttons, video URL, show/hide |
| `marquee` | items array (text + icon), speed, show/hide |
| `promise` | eyebrow, heading, subheading, cards (icon, title, body) × 3 |
| `purity` | eyebrow, heading, bullets × 3, image |
| `products` | eyebrow, heading, show variants, featured products (select) |
| `ghee` | eyebrow, heading, subheading, bullets × 4, images × 3 |
| `gallery` | eyebrow, heading, images × N (MediaUploader) |
| `leadership` | eyebrow, heading, body text, badge text |
| `testimonials` | eyebrow, heading, featured testimonials (select) |
| `how_it_works` | eyebrow, heading, steps × 3 |
| `mission` | quote text, attribution |
| `faq` | eyebrow, heading, faqs array (question, answer) |
| `cta` | heading, subheading, primary button, secondary button |

### CMS Config Storage

```typescript
// cmsSections table: one row per section
// config column is jsonb with section-specific fields

// Example hero config:
{
  "heading": "Nature's Liquid Gold",
  "subheading": "Uncompromised. Unprocessed. Unadulterated.",
  "badgeText": "Authorized Partner of Prakvedaa",
  "primaryCta": { "label": "Explore Collection", "href": "/shop" },
  "secondaryCta": { "label": "Request Free Sample", "href": "/checkout?sample=true" },
  "videoUrl": "/videos/APRUS.mp4"
}

// Admin edits via form → PUT /api/admin/cms/{sectionKey}
// → Updates cmsSections.config
// → Invalidates an:page:cms:landing cache
```

---

## 8. WHATSAPP INTEGRATION (Meta Cloud API)

### Order Notification Template

```
When order placed (payment_uploaded):
→ Admin receives WhatsApp:
  "🆕 New Order: AN-2024-0001
   Customer: Rahul Sharma (+91-9876543210)
   Items: Tulsi Honey 500g ×2, Karanj Honey 1kg ×1
   Total: ₹1,399
   Payment: Proof uploaded ✅
   [View Order → link]"

When admin confirms:
→ Customer receives WhatsApp:
  "✅ Order Confirmed!
   Your order AN-2024-0001 has been confirmed.
   We'll ship within 24-48 hours. Thank you for choosing APRAS Naturals! 🍯"

When shipped:
→ Customer receives:
  "📦 Your order is on its way!
   Order: AN-2024-0001
   Tracking: [number]
   Courier: [name]
   Expected: [date]"
```

---

## 9. CUSTOMER PORTAL — UI/UX

**Layout**: Top navigation (exactly like StockSense member layout)

```
Header (64px fixed):
  [🍯 APRAS Logo]  [Orders]  [Profile]  [Logout]  |  [User name] avatar

Pages:
  /orders          → Order list (cards with status badges)
  /orders/[id]     → Order detail + timeline roadmap
  /profile         → Name, phone, email, saved addresses
```

### Order Detail Roadmap Component

```
Visual timeline showing order stages:
  ● Order Placed     → [date]
  ● Payment Uploaded → [date]  
  ● Payment Verified → [date]  ← admin action
  ● Order Confirmed  → [date]
  ● Processing       → [date]
  ○ Shipped          → [tracking info]
  ○ Delivered        → [expected date]

Stages are filled/unfilled based on current status.
Current stage pulsing amber indicator.
```

---

## 10. ADMIN PANEL — UI/UX

**Layout**: Left sidebar (exactly like StockSense admin layout)

```
Sidebar (240px dark amber):
  [🍯 APRAS Admin]
  ─────────────────
  📊 Dashboard
  📦 Orders
  🛍️  Products
  👥 Customers
  📝 Blog
  🖼️  Media
  🎨 CMS / Appearance
  📣 WhatsApp
  📈 Analytics
  ⚙️  Settings

Content area: remaining width, bg var(--bg-primary)
```

### Admin Dashboard Widgets

```
Row 1 (4 cols):
  - Total Orders (today) | trend vs yesterday
  - Revenue (this month) | trend
  - Pending Verification (orders) | action required
  - New Customers (this week)

Row 2 (2 cols):
  - Recent Orders table (last 10) with status badges
  - Order Status Distribution (simple bar chart)

Row 3:
  - Quick Actions: New Product | New Blog | View Pending Orders
```

### Order Management Features

```
Orders list:
  - Filter by: status, date range, payment status
  - Search by: order number, customer name, phone
  - Bulk actions: verify payment, export CSV

Order detail:
  - Customer info + address
  - Items with images
  - Payment proof image (full preview on click)
  - Status update dropdown
  - Admin notes text area
  - WhatsApp send buttons (confirm / shipped notifications)
  - Tracking number + courier input
  - Status history timeline
```
