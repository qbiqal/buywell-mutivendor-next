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
    { key: 'site_logo_url',        value: '',                      category: 'general' },
    { key: 'maintenance_mode',     value: 'false',                 category: 'general' },

    // Payment gateways
    { key: 'payment_default_gateway', value: 'offline_qr',        category: 'payment' },
    { key: 'payment_offline_enabled', value: 'true',              category: 'payment' },
    { key: 'payment_razorpay_enabled',value: 'false',             category: 'payment' },
    { key: 'payment_stripe_enabled',  value: 'false',             category: 'payment' },
    { key: 'payment_qr_url',          value: '',                  category: 'payment' },
    { key: 'payment_upi_id',          value: '',                  category: 'payment' },
    { key: 'payment_company_name',    value: 'APRAS Naturals',    category: 'payment' },

    // Shipping
    { key: 'shipping_free_above',  value: '999',                  category: 'shipping' },
    { key: 'shipping_flat_rate',   value: '60',                   category: 'shipping' },
    { key: 'shipping_free_enabled', value: 'true',               category: 'shipping' },

    // WhatsApp
    { key: 'whatsapp_admin_number', value: '+919470309006',       category: 'whatsapp' },
    { key: 'whatsapp_enabled',      value: 'true',               category: 'whatsapp' },
    { key: 'whatsapp_order_notify', value: 'true',               category: 'whatsapp' },

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

    // Orders
    { key: 'orders_guest_checkout', value: 'true',               category: 'orders' },
    { key: 'orders_sample_enabled', value: 'true',               category: 'orders' },
    { key: 'orders_prefix',         value: 'AN',                  category: 'orders' },
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
