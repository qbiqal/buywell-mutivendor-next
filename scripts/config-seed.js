// config-seed.js — runs on every container start via startup.js
// Uses ON CONFLICT DO NOTHING so it never overwrites admin-configured values.
'use strict';

const { Pool } = require('pg');

module.exports = async function seedConfig() {
  if (!process.env.DATABASE_URL) return;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5000,
  });

  const defaults = [
    // Site identity
    { key: 'site_name',            value: 'APRAS Naturals',       category: 'general' },
    { key: 'site_tagline',         value: 'Pure Prakvedaa Honey & A2 Bilona Ghee', category: 'general' },
    { key: 'site_email',           value: 'aprasnaturals@gmail.com', category: 'general' },
    { key: 'site_phone',           value: '+919470309006',         category: 'general' },
    { key: 'site_address',         value: 'Ranchi – 834005, Jharkhand, India', category: 'general' },
    { key: 'admin_logo_url',       value: '',                      category: 'general' },
    { key: 'site_logo_url',        value: '',                      category: 'general' },
    { key: 'maintenance_mode',     value: 'false',                 category: 'general' },

    // Module flags
    { key: 'module_core_enabled',      value: 'true',              category: 'modules' },
    { key: 'module_cms_enabled',       value: 'true',              category: 'modules' },
    { key: 'module_seo_enabled',       value: 'true',              category: 'modules' },
    { key: 'module_ecommerce_enabled', value: 'true',              category: 'modules' },
    { key: 'module_blog_enabled',      value: 'true',              category: 'modules' },

    // Payment gateways
    { key: 'payment_default_gateway', value: 'offline_qr',        category: 'payment' },
    { key: 'payment_offline_enabled', value: 'true',              category: 'payment' },
    { key: 'payment_offline_qr_enabled', value: 'true',           category: 'payment' },
    { key: 'payment_razorpay_enabled',value: 'false',             category: 'payment' },
    { key: 'payment_razorpay_key_id', value: '',                  category: 'payment' },
    { key: 'payment_razorpay_key_secret', value: '',              category: 'payment' },
    { key: 'payment_stripe_enabled',  value: 'false',             category: 'payment' },
    { key: 'payment_stripe_publishable_key', value: '',           category: 'payment' },
    { key: 'payment_stripe_secret_key', value: '',                category: 'payment' },
    { key: 'payment_stripe_webhook_secret', value: '',            category: 'payment' },
    { key: 'payment_qr_url',          value: '',                  category: 'payment' },
    { key: 'payment_upi_id',          value: '',                  category: 'payment' },
    { key: 'payment_company_name',    value: 'APRAS Naturals',    category: 'payment' },

    // Shipping
    { key: 'shipping_free_above',  value: '99900',                category: 'shipping' },
    { key: 'shipping_flat_rate',   value: '6000',                 category: 'shipping' },
    { key: 'shipping_free_enabled', value: 'true',               category: 'shipping' },

    // Notification gateway control plane
    { key: 'notification_in_app_enabled', value: 'true',          category: 'notification' },
    { key: 'notification_email_enabled', value: 'true',           category: 'notification' },
    { key: 'notification_email_provider', value: 'resend',        category: 'notification' },
    { key: 'notification_email_from', value: 'APRAS Naturals <aprasnaturals@gmail.com>', category: 'notification' },
    { key: 'notification_resend_enabled', value: 'true',          category: 'notification' },
    { key: 'notification_resend_api_key', value: '',              category: 'notification' },
    { key: 'notification_sms_enabled', value: 'false',            category: 'notification' },
    { key: 'notification_sms_provider', value: '',                category: 'notification' },
    { key: 'notification_sms_api_key', value: '',                 category: 'notification' },
    { key: 'notification_sms_sender_id', value: '',               category: 'notification' },
    { key: 'notification_sms_auth_token', value: '',              category: 'notification' },
    { key: 'notification_whatsapp_enabled', value: 'true',        category: 'notification' },
    { key: 'notification_telegram_enabled', value: 'false',       category: 'notification' },
    { key: 'notification_telegram_bot_token', value: '',          category: 'notification' },
    { key: 'notification_telegram_chat_id', value: '',            category: 'notification' },
    { key: 'notification_push_enabled', value: 'false',           category: 'notification' },
    { key: 'notification_push_provider', value: 'web_push',       category: 'notification' },
    { key: 'notification_push_vapid_public_key', value: '',       category: 'notification' },
    { key: 'notification_push_vapid_private_key', value: '',      category: 'notification' },
    { key: 'notification_push_vapid_subject', value: '',          category: 'notification' },

    // OTP / auth recovery
    { key: 'otp_email_enabled', value: 'true',                    category: 'otp' },
    { key: 'otp_email_verification_enabled', value: 'true',       category: 'otp' },
    { key: 'otp_password_reset_enabled', value: 'true',           category: 'otp' },
    { key: 'otp_email_verification_ttl_minutes', value: '60',     category: 'otp' },
    { key: 'otp_password_reset_ttl_minutes', value: '30',         category: 'otp' },
    { key: 'otp_max_attempts', value: '5',                        category: 'otp' },

    // WhatsApp
    { key: 'whatsapp_admin_number', value: '+919470309006',       category: 'whatsapp' },
    { key: 'whatsapp_enabled',      value: 'true',               category: 'whatsapp' },
    { key: 'whatsapp_order_notify', value: 'true',               category: 'whatsapp' },
    { key: 'whatsapp_phone_number_id', value: '',                category: 'whatsapp' },
    { key: 'whatsapp_access_token', value: '',                   category: 'whatsapp' },
    { key: 'whatsapp_template_manual', value: 'Hi {{customerName}},\\n\\n{{message}}\\n\\n- APRAS Naturals', category: 'whatsapp' },
    { key: 'whatsapp_template_order_confirmed', value: 'Hi {{customerName}},\\n\\nYour order {{orderNumber}} has been confirmed. We will ship within 24-48 hours.\\n\\nThank you for choosing APRAS Naturals.', category: 'whatsapp' },
    { key: 'whatsapp_template_order_shipped', value: 'Hi {{customerName}},\\n\\nYour order {{orderNumber}} has been shipped.{{trackingLine}}{{deliveryLine}}\\n\\nThank you for choosing APRAS Naturals.', category: 'whatsapp' },
    { key: 'whatsapp_template_payment_rejected', value: 'Hi {{customerName}},\\n\\nWe could not verify payment for order {{orderNumber}}.{{reasonLine}}\\n\\nPlease upload a clear payment screenshot or contact us.', category: 'whatsapp' },
    { key: 'whatsapp_template_admin_new_order', value: 'New order {{orderNumber}}\\nCustomer: {{customerName}} ({{customerPhone}})\\nItems: {{items}}\\nTotal: {{totalFormatted}}\\nView: {{orderUrl}}', category: 'whatsapp' },

    // Blog
    { key: 'blog_enabled',         value: 'true',                 category: 'blog' },
    { key: 'blog_title',           value: 'APRAS Naturals Journal', category: 'blog' },
    { key: 'blog_subtitle',        value: 'Stories of purity, tradition & wellness', category: 'blog' },
    { key: 'blog_layout',          value: 'grid',                 category: 'blog' },
    { key: 'blog_posts_per_page',  value: '9',                    category: 'blog' },
    { key: 'blog_show_author',     value: 'true',                 category: 'blog' },
    { key: 'blog_show_read_time',  value: 'true',                 category: 'blog' },
    { key: 'blog_show_related',    value: 'true',                 category: 'blog' },
    { key: 'blog_related_count',   value: '3',                    category: 'blog' },

    // Media
    { key: 'media_max_size_mb',    value: '10',                   category: 'media' },
    { key: 'media_storage',        value: 'local',                category: 'media' }, // local | r2
    { key: 'media_r2_account_id',  value: '',                     category: 'media' },
    { key: 'media_r2_access_key_id', value: '',                   category: 'media' },
    { key: 'media_r2_secret_access_key', value: '',               category: 'media' },
    { key: 'media_r2_bucket_name', value: '',                     category: 'media' },
    { key: 'media_r2_public_url',  value: '',                     category: 'media' },

    // Orders
    { key: 'orders_guest_checkout', value: 'true',               category: 'orders' },
    { key: 'orders_sample_enabled', value: 'true',               category: 'orders' },
    { key: 'orders_prefix',         value: 'AN',                  category: 'orders' },

    // Localization and currency
    { key: 'locale_default',       value: 'en',                   category: 'localization' },
    { key: 'locales_enabled',      value: 'en,hi',                category: 'localization' },
    { key: 'currency_default',     value: 'INR',                  category: 'localization' },
    { key: 'currencies_enabled',   value: 'INR',                  category: 'localization' },
    { key: 'currency_rates_json',  value: '{"INR":1}',            category: 'localization' },

    // Observability
    { key: 'sentry_enabled',       value: 'false',                category: 'observability' },
    { key: 'sentry_dsn',           value: '',                     category: 'observability' },
    { key: 'sentry_environment',   value: 'production',           category: 'observability' },

    // SEO and analytics
    { key: 'seo_default_title', value: 'APRAS Naturals — Pure Prakvedaa Honey & A2 Bilona Ghee', category: 'seo' },
    { key: 'seo_title_template', value: '%s | APRAS Naturals', category: 'seo' },
    { key: 'seo_default_description', value: 'APRAS Naturals is the authorized partner of Prakvedaa. Discover pure mono-floral raw honey and authentic A2 Bilona Ghee sourced ethically from India.', category: 'seo' },
    { key: 'seo_default_keywords', value: 'honey,A2 ghee,Prakvedaa,organic honey,Jharkhand,raw honey,bilona ghee', category: 'seo' },
    { key: 'seo_canonical_base_url', value: process.env.NEXT_PUBLIC_APP_URL || 'https://aprasnaturals.com', category: 'seo' },
    { key: 'seo_default_og_image_url', value: '', category: 'seo' },
    { key: 'seo_indexing_enabled', value: 'true', category: 'seo' },
    { key: 'seo_google_site_verification', value: '', category: 'seo' },
    { key: 'seo_bing_site_verification', value: '', category: 'seo' },
    { key: 'seo_yandex_site_verification', value: '', category: 'seo' },
    { key: 'seo_gtm_id', value: '', category: 'seo' },
    { key: 'seo_ga_measurement_id', value: '', category: 'seo' },
    { key: 'seo_meta_pixel_id', value: '', category: 'seo' },
    { key: 'seo_first_party_analytics_enabled', value: 'true', category: 'seo' },
    { key: 'seo_robots_extra_disallow', value: '', category: 'seo' },
    { key: 'seo_sitemap_change_frequency', value: 'weekly', category: 'seo' },
    { key: 'seo_sitemap_priority_default', value: '0.7', category: 'seo' },
    { key: 'seo_submission_google_endpoint', value: '', category: 'seo' },
    { key: 'seo_submission_bing_endpoint', value: '', category: 'seo' },
  ];

  for (const row of defaults) {
    await pool.query(
      `INSERT INTO site_config (key, value, category, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO NOTHING`,
      [row.key, row.value, row.category]
    ).catch(() => {}); // table may not exist yet on very first boot — startup handles migrations first
  }

  await pool.end();
};
