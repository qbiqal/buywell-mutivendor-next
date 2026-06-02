import { pool } from "./index";

const indexes = [
  // Orders
  `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_is_sample ON orders(is_sample_request)`,
  // Order items
  `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id)`,
  // Products
  `CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
  `CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured)`,
  `CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`,
  // Blog
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured ON blog_posts(is_featured)`,
  // Media
  `CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder)`,
  `CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by)`,
  `CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC)`,
  // Notifications
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id ON notification_deliveries(notification_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id ON notification_deliveries(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel ON notification_deliveries(channel)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status)`,
  `CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at ON notification_deliveries(created_at DESC)`,
  // OTP / push
  `CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose_target ON otp_codes(purpose, target)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_codes_consumed_at ON otp_codes(consumed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active ON push_subscriptions(is_active)`,
  // WhatsApp logs
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_order_id ON whatsapp_logs(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at DESC)`,
  // Addresses
  `CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id)`,
  // Testimonials
  `CREATE INDEX IF NOT EXISTS idx_testimonials_is_featured ON testimonials(is_featured)`,
  `CREATE INDEX IF NOT EXISTS idx_testimonials_is_approved ON testimonials(is_approved)`,
  // CMS pages and menus
  `CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status)`,
  `CREATE INDEX IF NOT EXISTS idx_cms_pages_updated_at ON cms_pages(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_cms_menus_menu_key ON cms_menus(menu_key)`,
  `CREATE INDEX IF NOT EXISTS idx_cms_menu_items_menu_id ON cms_menu_items(menu_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cms_menu_items_sort_order ON cms_menu_items(sort_order)`,
  // SEO and traffic
  `CREATE INDEX IF NOT EXISTS idx_seo_page_overrides_route_path ON seo_page_overrides(route_path)`,
  `CREATE INDEX IF NOT EXISTS idx_seo_internal_links_source_path ON seo_internal_links(source_path)`,
  `CREATE INDEX IF NOT EXISTS idx_traffic_events_created_at ON traffic_events(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_traffic_events_path ON traffic_events(path)`,
  `CREATE INDEX IF NOT EXISTS idx_traffic_events_visitor_id ON traffic_events(visitor_id)`,
];

async function createIndexes() {
  const client = await pool.connect();
  try {
    for (const sql of indexes) {
      await client.query(sql);
      console.log(`✓ ${sql.match(/idx_\w+/)?.[0] ?? "index"}`);
    }
    console.log(`\n✓ ${indexes.length} indexes created.`);
  } finally {
    client.release();
    await pool.end();
  }
}

createIndexes().catch((err) => {
  console.error("Failed to create indexes:", err);
  process.exit(1);
});
