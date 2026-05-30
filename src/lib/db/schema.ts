import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

// ── ID helper ──────────────────────────────────────────────────────────────────
// Using text IDs with cuid2 for URL-safe, collision-resistant IDs
function cuid(): { $defaultFn: () => string } {
  // Runtime import to avoid build-time issues; replaced by actual cuid2 at runtime
  return { $defaultFn: () => crypto.randomUUID().replace(/-/g, "") };
}

// ── Users & Auth ───────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:          text("email").notNull().unique(),
  passwordHash:   text("password_hash").notNull(),
  firstName:      text("first_name").notNull(),
  lastName:       text("last_name"),
  phone:          text("phone"),
  role:           text("role").default("customer").notNull(), // customer | admin
  isActive:       boolean("is_active").default(true).notNull(),
  emailVerified:  boolean("email_verified").default(false).notNull(),
  avatarUrl:      text("avatar_url"),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});

export const addresses = pgTable("addresses", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:     text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  label:      text("label"),             // "Home", "Office"
  name:       text("name").notNull(),
  phone:      text("phone").notNull(),
  line1:      text("line1").notNull(),
  line2:      text("line2"),
  city:       text("city").notNull(),
  state:      text("state").notNull(),
  pincode:    text("pincode").notNull(),
  isDefault:  boolean("is_default").default(false).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

// ── Products ───────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:         text("name").notNull(),
  slug:         text("slug").notNull().unique(),
  category:     text("category").notNull(),      // honey | ghee | other
  subCategory:  text("sub_category"),            // tulsi | karanj | moringa | a2-bilona
  description:  text("description"),
  longDesc:     text("long_desc"),               // rich text HTML
  sku:          text("sku").notNull().unique(),
  isActive:     boolean("is_active").default(true).notNull(),
  isFeatured:   boolean("is_featured").default(false).notNull(),
  sortOrder:    integer("sort_order").default(0).notNull(),
  metaTitle:    text("meta_title"),
  metaDesc:     text("meta_desc"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const productVariants = pgTable("product_variants", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId:    text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  name:         text("name").notNull(),          // "500g", "1kg"
  priceInr:     integer("price_inr").notNull(),  // in paise (₹ × 100)
  mrpInr:       integer("mrp_inr"),
  weight:       text("weight"),                  // "500g", "1kg"
  stock:        integer("stock").default(0).notNull(),
  sku:          text("sku").notNull().unique(),
  isActive:     boolean("is_active").default(true).notNull(),
  sortOrder:    integer("sort_order").default(0).notNull(),
});

export const productImages = pgTable("product_images", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId:  text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url:        text("url").notNull(),
  alt:        text("alt"),
  isPrimary:  boolean("is_primary").default(false).notNull(),
  sortOrder:  integer("sort_order").default(0).notNull(),
});

// ── Orders ─────────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber:    text("order_number").notNull().unique(), // AN-2024-0001
  userId:         text("user_id").references(() => users.id),  // null = guest
  guestName:      text("guest_name"),
  guestEmail:     text("guest_email"),
  guestPhone:     text("guest_phone"),
  // Order lifecycle status
  status:         text("status").default("pending").notNull(),
  // pending | payment_pending | payment_uploaded | payment_verified
  // confirmed | processing | shipped | delivered | cancelled | refunded
  paymentStatus:  text("payment_status").default("pending").notNull(),
  // pending | uploaded | verified | rejected
  paymentGateway: text("payment_gateway").default("offline_qr").notNull(),
  paymentMethod:  text("payment_method"),          // upi | bank_transfer | cod
  paymentProofUrl:text("payment_proof_url"),
  paymentProofOriginalName: text("payment_proof_original_name"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  paymentVerifiedBy: text("payment_verified_by"),  // admin user id
  paymentRef:     text("payment_ref"),             // gateway transaction ref
  // Amounts — all in paise (INR × 100)
  subtotalInr:    integer("subtotal_inr").notNull(),
  shippingInr:    integer("shipping_inr").default(0).notNull(),
  discountInr:    integer("discount_inr").default(0).notNull(),
  totalInr:       integer("total_inr").notNull(),
  // Shipping
  addressId:      text("address_id").references(() => addresses.id),
  addressSnapshot:jsonb("address_snapshot"),       // frozen copy at order time
  notes:          text("notes"),
  adminNotes:     text("admin_notes"),
  trackingNumber: text("tracking_number"),
  trackingUrl:    text("tracking_url"),
  courier:        text("courier"),
  estimatedDelivery: date("estimated_delivery"),
  // Notifications
  whatsappSentAt: timestamp("whatsapp_sent_at"),
  emailSentAt:    timestamp("email_sent_at"),
  // Flags
  isSampleRequest:boolean("is_sample_request").default(false).notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:      text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  variantId:    text("variant_id").references(() => productVariants.id).notNull(),
  productSnapshot: jsonb("product_snapshot").notNull(), // name, variant, price at order time
  quantity:     integer("quantity").notNull(),
  unitPriceInr: integer("unit_price_inr").notNull(),
  totalInr:     integer("total_inr").notNull(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:    text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  status:     text("status").notNull(),
  note:       text("note"),
  changedBy:  text("changed_by"),               // admin user id or "system"
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

// ── Blog ───────────────────────────────────────────────────────────────────────

export const blogCategories = pgTable("blog_categories", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:       text("name").notNull(),
  slug:       text("slug").notNull().unique(),
  color:      text("color").default("#D97706"), // hex
  sortOrder:  integer("sort_order").default(0).notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:        text("title").notNull(),
  slug:         text("slug").notNull().unique(),
  excerpt:      text("excerpt"),
  content:      text("content").notNull(),       // rich text HTML
  coverImageUrl:text("cover_image_url"),
  categoryId:   text("category_id").references(() => blogCategories.id),
  authorId:     text("author_id").references(() => users.id).notNull(),
  status:       text("status").default("draft").notNull(), // draft | published | archived
  publishedAt:  timestamp("published_at"),
  readTime:     integer("read_time"),            // estimated minutes
  metaTitle:    text("meta_title"),
  metaDesc:     text("meta_desc"),
  tags:         text("tags").array(),
  viewCount:    integer("view_count").default(0).notNull(),
  isFeatured:   boolean("is_featured").default(false).notNull(),
  sortOrder:    integer("sort_order").default(0).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

// ── Media Library ──────────────────────────────────────────────────────────────

export const media = pgTable("media", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  filename:     text("filename").notNull(),
  originalName: text("original_name").notNull(),
  url:          text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  mimeType:     text("mime_type").notNull(),
  sizeBytes:    integer("size_bytes").notNull(),
  width:        integer("width"),
  height:       integer("height"),
  alt:          text("alt"),
  folder:       text("folder").default("general").notNull(),
  storage:      text("storage").default("local").notNull(), // local | r2
  uploadedBy:   text("uploaded_by").references(() => users.id),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── CMS / Site Config ──────────────────────────────────────────────────────────

export const siteConfig = pgTable("site_config", {
  key:       text("key").primaryKey(),
  value:     text("value"),
  category:  text("category").default("general").notNull(),
  label:     text("label"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsSections = pgTable("cms_sections", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sectionKey: text("section_key").notNull().unique(),
  // hero | marquee | promise | purity | products | ghee | gallery
  // leadership | testimonials | how_it_works | mission | faq | cta
  isEnabled:  boolean("is_enabled").default(true).notNull(),
  sortOrder:  integer("sort_order").default(0).notNull(),
  config:     jsonb("config"),            // section-specific JSON
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

// ── Testimonials ───────────────────────────────────────────────────────────────

export const testimonials = pgTable("testimonials", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:       text("name").notNull(),
  location:   text("location"),
  content:    text("content").notNull(),
  rating:     integer("rating").default(5).notNull(),
  mediaUrl:   text("media_url"),         // video or image
  mediaType:  text("media_type"),        // video | image
  isApproved: boolean("is_approved").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  sortOrder:  integer("sort_order").default(0).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

// ── Notifications ──────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:     text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type:       text("type").notNull(),
  // order_placed | order_confirmed | order_shipped | order_delivered
  // payment_verified | payment_rejected | sample_approved
  title:      text("title").notNull(),
  body:       text("body").notNull(),
  link:       text("link"),
  isRead:     boolean("is_read").default(false).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

// ── Order Sequence ─────────────────────────────────────────────────────────────
// Generates sequential order numbers per year: AN-2024-0001

export const orderSequence = pgTable("order_sequence", {
  year:   integer("year").primaryKey(),
  lastId: integer("last_id").default(0).notNull(),
});

// ── Type Exports ───────────────────────────────────────────────────────────────

export type User              = typeof users.$inferSelect;
export type NewUser           = typeof users.$inferInsert;
export type Address           = typeof addresses.$inferSelect;
export type Product           = typeof products.$inferSelect;
export type ProductVariant    = typeof productVariants.$inferSelect;
export type ProductImage      = typeof productImages.$inferSelect;
export type Order             = typeof orders.$inferSelect;
export type NewOrder          = typeof orders.$inferInsert;
export type OrderItem         = typeof orderItems.$inferSelect;
export type OrderStatusHistory= typeof orderStatusHistory.$inferSelect;
export type BlogPost          = typeof blogPosts.$inferSelect;
export type BlogCategory      = typeof blogCategories.$inferSelect;
export type Media             = typeof media.$inferSelect;
export type SiteConfig        = typeof siteConfig.$inferSelect;
export type CmsSection        = typeof cmsSections.$inferSelect;
export type Testimonial       = typeof testimonials.$inferSelect;
export type Notification      = typeof notifications.$inferSelect;
