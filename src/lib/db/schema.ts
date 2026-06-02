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
  categoryId:   text("category_id"),
  subCategory:  text("sub_category"),            // tulsi | karanj | moringa | a2-bilona
  description:  text("description"),
  longDesc:     text("long_desc"),               // rich text HTML
  sku:          text("sku").notNull().unique(),
  isActive:     boolean("is_active").default(true).notNull(),
  isFeatured:   boolean("is_featured").default(false).notNull(),
  sortOrder:    integer("sort_order").default(0).notNull(),
  metaTitle:    text("meta_title"),
  metaDesc:     text("meta_desc"),
  seoKeywords:  text("seo_keywords").array(),
  ogImageUrl:   text("og_image_url"),
  canonicalUrl: text("canonical_url"),
  noIndex:      boolean("no_index").default(false).notNull(),
  noFollow:     boolean("no_follow").default(false).notNull(),
  tags:         text("tags").array(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const productCategories = pgTable("product_categories", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:           text("name").notNull(),
  slug:           text("slug").notNull().unique(),
  parentId:       text("parent_id"),
  color:          text("color").default("#2D7D46"),
  description:    text("description"),
  seoTitle:       text("seo_title"),
  seoDescription: text("seo_description"),
  sortOrder:      integer("sort_order").default(0).notNull(),
  isActive:       boolean("is_active").default(true).notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
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
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:           text("name").notNull(),
  slug:           text("slug").notNull().unique(),
  parentId:       text("parent_id"),
  color:          text("color").default("#D97706"), // hex
  description:    text("description"),
  seoTitle:       text("seo_title"),
  seoDescription: text("seo_description"),
  sortOrder:      integer("sort_order").default(0).notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
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
  seoKeywords:  text("seo_keywords").array(),
  canonicalUrl: text("canonical_url"),
  ogImageUrl:   text("og_image_url"),
  noIndex:      boolean("no_index").default(false).notNull(),
  noFollow:     boolean("no_follow").default(false).notNull(),
  tags:         text("tags").array(),
  viewCount:    integer("view_count").default(0).notNull(),
  isFeatured:   boolean("is_featured").default(false).notNull(),
  sortOrder:    integer("sort_order").default(0).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const contentTags = pgTable("content_tags", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:       text("name").notNull(),
  slug:       text("slug").notNull().unique(),
  moduleKey:  text("module_key").notNull(), // blog | product | cms | seo
  color:      text("color").default("#D97706").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

export const blogComments = pgTable("blog_comments", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId:      text("post_id").references(() => blogPosts.id, { onDelete: "cascade" }).notNull(),
  parentId:    text("parent_id"),
  userId:      text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  body:        text("body").notNull(),
  status:      text("status").default("pending").notNull(), // pending | approved | rejected | spam
  likeCount:   integer("like_count").default(0).notNull(),
  moderatedBy: text("moderated_by").references(() => users.id, { onDelete: "set null" }),
  moderatedAt: timestamp("moderated_at"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const blogCommentLikes = pgTable("blog_comment_likes", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  commentId: text("comment_id").references(() => blogComments.id, { onDelete: "cascade" }).notNull(),
  userId:    text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const cmsPages = pgTable("cms_pages", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:           text("title").notNull(),
  slug:            text("slug").notNull().unique(),
  excerpt:         text("excerpt"),
  content:         text("content").notNull(),
  status:          text("status").default("draft").notNull(), // draft | published | archived
  template:        text("template").default("standard").notNull(),
  moduleKey:       text("module_key").default("cms").notNull(),
  policyType:      text("policy_type"),
  metaTitle:       text("meta_title"),
  metaDescription: text("meta_description"),
  keywords:        text("keywords").array(),
  canonicalUrl:    text("canonical_url"),
  ogImageUrl:      text("og_image_url"),
  noIndex:         boolean("no_index").default(false).notNull(),
  noFollow:        boolean("no_follow").default(false).notNull(),
  sortOrder:       integer("sort_order").default(0).notNull(),
  createdBy:       text("created_by").references(() => users.id, { onDelete: "set null" }),
  publishedAt:     timestamp("published_at"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

// ── Reviews, Refunds, Compliance ─────────────────────────────────────────────

export const productReviews = pgTable("product_reviews", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId:    text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  userId:       text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  orderId:      text("order_id").references(() => orders.id, { onDelete: "set null" }),
  rating:       integer("rating").notNull(),
  title:        text("title"),
  body:         text("body").notNull(),
  status:       text("status").default("pending").notNull(), // pending | approved | rejected | spam
  likeCount:    integer("like_count").default(0).notNull(),
  mediaUrl:     text("media_url"),
  moderatedBy:  text("moderated_by").references(() => users.id, { onDelete: "set null" }),
  moderatedAt:  timestamp("moderated_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const productReviewLikes = pgTable("product_review_likes", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reviewId:  text("review_id").references(() => productReviews.id, { onDelete: "cascade" }).notNull(),
  userId:    text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refundRequests = pgTable("refund_requests", {
  id:                 text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:            text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  userId:             text("user_id").references(() => users.id, { onDelete: "set null" }),
  requestedAmountInr: integer("requested_amount_inr").notNull(),
  approvedAmountInr:  integer("approved_amount_inr"),
  reason:             text("reason").notNull(),
  customerNote:       text("customer_note"),
  adminNote:          text("admin_note"),
  status:             text("status").default("requested").notNull(),
  // requested | under_review | approved | rejected | processed | cancelled
  refundMethod:       text("refund_method"),
  refundReference:    text("refund_reference"),
  proofUrl:           text("proof_url"),
  requestedAt:        timestamp("requested_at").defaultNow().notNull(),
  processedAt:        timestamp("processed_at"),
  createdAt:          timestamp("created_at").defaultNow().notNull(),
  updatedAt:          timestamp("updated_at").defaultNow().notNull(),
});

export const refundEvents = pgTable("refund_events", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  refundId:  text("refund_id").references(() => refundRequests.id, { onDelete: "cascade" }).notNull(),
  status:    text("status").notNull(),
  note:      text("note"),
  changedBy: text("changed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complianceChecks = pgTable("compliance_checks", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  complianceKey: text("compliance_key").notNull(), // gdpr | dpdp
  moduleKey:     text("module_key").default("core").notNull(),
  parameterKey:  text("parameter_key").notNull(),
  title:         text("title").notNull(),
  description:   text("description"),
  status:        text("status").default("partial").notNull(), // fulfilled | partial | missing | not_applicable
  evidence:      text("evidence"),
  policyPageId:  text("policy_page_id").references(() => cmsPages.id, { onDelete: "set null" }),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

export const cmsMenus = pgTable("cms_menus", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  menuKey:   text("menu_key").notNull().unique(), // landing_header | site_header | footer
  label:     text("label").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cmsMenuItems = pgTable("cms_menu_items", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  menuId:      text("menu_id").references(() => cmsMenus.id, { onDelete: "cascade" }).notNull(),
  label:       text("label").notNull(),
  href:        text("href").notNull(),
  itemType:    text("item_type").default("external").notNull(), // cms_page | blog_index | blog_post | shop_index | product | landing_anchor | external
  pageId:      text("page_id").references(() => cmsPages.id, { onDelete: "set null" }),
  blogPostId:  text("blog_post_id").references(() => blogPosts.id, { onDelete: "set null" }),
  productId:   text("product_id").references(() => products.id, { onDelete: "set null" }),
  opensNewTab: boolean("opens_new_tab").default(false).notNull(),
  isEnabled:   boolean("is_enabled").default(true).notNull(),
  sortOrder:   integer("sort_order").default(0).notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const seoPageOverrides = pgTable("seo_page_overrides", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  routePath:       text("route_path").notNull().unique(),
  title:           text("title"),
  description:     text("description"),
  keywords:        text("keywords").array(),
  canonicalUrl:    text("canonical_url"),
  ogImageUrl:      text("og_image_url"),
  robots:          text("robots").default("index,follow").notNull(),
  structuredData:  jsonb("structured_data"),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

export const seoSearchSubmissions = pgTable("seo_search_submissions", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  engine:      text("engine").notNull(), // google | bing | yandex | other
  endpoint:    text("endpoint"),
  sitemapUrl:  text("sitemap_url").notNull(),
  status:      text("status").default("pending").notNull(), // pending | submitted | failed
  response:    text("response"),
  submittedAt: timestamp("submitted_at"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const seoInternalLinks = pgTable("seo_internal_links", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourcePath: text("source_path").notNull(),
  targetPath: text("target_path").notNull(),
  anchorText: text("anchor_text").notNull(),
  context:    text("context"),
  isEnabled:  boolean("is_enabled").default(true).notNull(),
  sortOrder:  integer("sort_order").default(0).notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

export const trafficEvents = pgTable("traffic_events", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventType: text("event_type").default("page_view").notNull(),
  path:      text("path").notNull(),
  referrer:  text("referrer"),
  source:    text("source"),
  medium:    text("medium"),
  campaign:  text("campaign"),
  visitorId: text("visitor_id"),
  sessionId: text("session_id"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const notificationDeliveries = pgTable("notification_deliveries", {
  id:                text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  notificationId:    text("notification_id").references(() => notifications.id, { onDelete: "set null" }),
  userId:            text("user_id").references(() => users.id, { onDelete: "set null" }),
  channel:           text("channel").notNull(), // email | sms | whatsapp | telegram | push | in_app
  provider:          text("provider").notNull(), // resend | local | meta | future provider key
  recipient:         text("recipient").notNull(),
  subject:           text("subject"),
  body:              text("body"),
  status:            text("status").notNull(), // sent | skipped | failed
  providerMessageId: text("provider_message_id"),
  error:             text("error"),
  metadata:          jsonb("metadata"),
  createdAt:         timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:     text("user_id").references(() => users.id, { onDelete: "cascade" }),
  purpose:    text("purpose").notNull(), // email_verification | password_reset | login
  channel:    text("channel").default("email").notNull(),
  target:     text("target").notNull(),
  codeHash:   text("code_hash").notNull(),
  attempts:   integer("attempts").default(0).notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  metadata:   jsonb("metadata"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint:  text("endpoint").notNull().unique(),
  p256dh:    text("p256dh").notNull(),
  auth:      text("auth").notNull(),
  provider:  text("provider").default("web_push").notNull(),
  isActive:  boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whatsappLogs = pgTable("whatsapp_logs", {
  id:                text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:           text("order_id").references(() => orders.id, { onDelete: "set null" }),
  templateKey:       text("template_key").notNull(),
  recipientPhone:    text("recipient_phone").notNull(),
  recipientName:     text("recipient_name"),
  message:           text("message").notNull(),
  status:            text("status").notNull(), // sent | skipped | failed
  providerMessageId: text("provider_message_id"),
  error:             text("error"),
  sentBy:            text("sent_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:         timestamp("created_at").defaultNow().notNull(),
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
export type ProductCategory   = typeof productCategories.$inferSelect;
export type ProductVariant    = typeof productVariants.$inferSelect;
export type ProductImage      = typeof productImages.$inferSelect;
export type Order             = typeof orders.$inferSelect;
export type NewOrder          = typeof orders.$inferInsert;
export type OrderItem         = typeof orderItems.$inferSelect;
export type OrderStatusHistory= typeof orderStatusHistory.$inferSelect;
export type BlogPost          = typeof blogPosts.$inferSelect;
export type BlogCategory      = typeof blogCategories.$inferSelect;
export type ContentTag        = typeof contentTags.$inferSelect;
export type BlogComment       = typeof blogComments.$inferSelect;
export type BlogCommentLike   = typeof blogCommentLikes.$inferSelect;
export type Media             = typeof media.$inferSelect;
export type SiteConfig        = typeof siteConfig.$inferSelect;
export type CmsSection        = typeof cmsSections.$inferSelect;
export type CmsPage           = typeof cmsPages.$inferSelect;
export type NewCmsPage        = typeof cmsPages.$inferInsert;
export type CmsMenu           = typeof cmsMenus.$inferSelect;
export type CmsMenuItem       = typeof cmsMenuItems.$inferSelect;
export type SeoPageOverride   = typeof seoPageOverrides.$inferSelect;
export type SeoSearchSubmission = typeof seoSearchSubmissions.$inferSelect;
export type SeoInternalLink   = typeof seoInternalLinks.$inferSelect;
export type TrafficEvent      = typeof trafficEvents.$inferSelect;
export type ProductReview     = typeof productReviews.$inferSelect;
export type ProductReviewLike = typeof productReviewLikes.$inferSelect;
export type RefundRequest     = typeof refundRequests.$inferSelect;
export type RefundEvent       = typeof refundEvents.$inferSelect;
export type ComplianceCheck   = typeof complianceChecks.$inferSelect;
export type Testimonial       = typeof testimonials.$inferSelect;
export type Notification      = typeof notifications.$inferSelect;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type OtpCode           = typeof otpCodes.$inferSelect;
export type PushSubscription  = typeof pushSubscriptions.$inferSelect;
export type WhatsappLog       = typeof whatsappLogs.$inferSelect;
