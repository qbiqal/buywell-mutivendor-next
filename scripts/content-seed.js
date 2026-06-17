// content-seed.js - production-safe CMS/compliance defaults.
// Runs on every container start after migrations. It inserts missing public
// policy pages, default nested menus, and compliance checklist rows without
// running the local bootstrap seed.
'use strict';

const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const POLICY_PAGES = [
  {
    title: 'Terms and Conditions',
    slug: 'terms-and-conditions',
    policyType: 'terms',
    moduleKey: 'core',
    excerpt: 'Terms governing use of BuyWell Marketplace, orders, accounts, product information, and customer responsibilities.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>Welcome to BuyWell Marketplace. These Terms and Conditions govern your access to our website, account features, product catalogue, CMS pages, blog content, ecommerce checkout, order support, reviews, refunds, and related services. BuyWell Marketplace offers a wide range of quality products across fashion, electronics, health, home and more as an Buywell Online Shopping India Pvt Ltd.</p>',
      '<h2>Using Our Website</h2>',
      '<p>You agree to use the website only for lawful personal, household, or permitted business purchase purposes. You must not misuse the platform, interfere with security, scrape data, impersonate another person, upload harmful content, or attempt unauthorized access to admin, customer, payment, notification, or media systems.</p>',
      '<h2>Accounts and Accuracy</h2>',
      '<p>You are responsible for keeping account credentials confidential and for providing accurate name, phone, email, billing, delivery, and order information. BuyWell Marketplace may suspend or restrict access where account activity appears fraudulent, abusive, unlawful, or harmful to customers, staff, partners, or platform integrity.</p>',
      '<h2>Products and Information</h2>',
      '<p>We aim to present product descriptions, ingredients, sizes, prices, images, availability, and educational content accurately. Natural products such as raw honey and ghee may vary in colour, aroma, texture, crystallization, and batch character. Product information is not medical advice and should not replace professional health guidance.</p>',
      '<h2>Orders, Pricing, and Payment</h2>',
      '<p>Order acceptance depends on product availability, serviceability, payment confirmation, fraud screening, and operational checks. Prices, offers, taxes, shipping fees, and free sample availability may change. If an obvious pricing or listing error occurs, we may cancel, refund, or contact you before processing the order.</p>',
      '<h2>Shipping, Returns, Refunds, and Cancellations</h2>',
      '<p>Shipping, replacement, cancellation, and refund requests are governed by the dedicated policies linked from this website. Food and consumable items may have safety-based return restrictions, especially once opened, consumed, damaged after delivery, or handled outside recommended storage conditions.</p>',
      '<h2>Reviews, Comments, and User Content</h2>',
      '<p>Members may post reviews or blog comments where enabled. Content must be honest, relevant, non-abusive, non-infringing, and lawful. We may moderate, reject, edit display formatting, or remove content that contains spam, hate, abuse, personal data of others, unsafe claims, or misleading statements.</p>',
      '<h2>Intellectual Property</h2>',
      '<p>The BuyWell Marketplace brand, product presentation, website design, photographs, text, graphics, and software are protected by applicable intellectual property laws. You may not copy, reproduce, resell, or exploit the website content without written permission, except for ordinary personal use and sharing website links.</p>',
      '<h2>Limitation of Liability</h2>',
      '<p>To the maximum extent permitted by law, BuyWell Marketplace is not liable for indirect, incidental, consequential, punitive, or special losses arising from website use, delayed delivery, unavailable products, third-party services, network issues, or customer misuse. Nothing in these terms excludes liability that cannot legally be excluded.</p>',
      '<h2>Changes and Contact</h2>',
      '<p>We may update these terms to reflect operational, legal, security, or service changes. The current version will be published on this page. For questions, contact BuyWell Marketplace at support@buywell.in or +91 9999999999.</p>',
    ].join(''),
  },
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    policyType: 'privacy',
    moduleKey: 'core',
    excerpt: 'How BuyWell Marketplace collects, uses, shares, stores, and protects personal data under DPDP and GDPR readiness principles.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>This Privacy Policy explains how BuyWell Marketplace collects and processes personal data when you browse the website, create an account, place orders, request samples, submit reviews or comments, contact support, receive notifications, or interact with our marketing and analytics features.</p>',
      '<h2>Who We Are</h2>',
      '<p>BuyWell Marketplace operates from Bheemanpadi, Kottayam West, Kottayam, Kerala – 686003 and offers quality products across multiple categories as an Buywell Online Shopping India Pvt Ltd. For privacy, consent, grievance, and data-rights requests, contact support@buywell.in or +91 9999999999.</p>',
      '<h2>Personal Data We Collect</h2>',
      '<p>Depending on how you use the platform, we may collect identity details, contact details, account credentials, addresses, order history, payment reference details, refund requests, customer support messages, review or comment content, notification preferences, device/browser data, cookie identifiers, analytics events, and fraud-prevention or security logs.</p>',
      '<h2>Why We Process Data</h2>',
      '<p>We process data to create accounts, authenticate users, fulfil orders, deliver products, process refunds, provide customer support, send order and service notifications, maintain website security, prevent misuse, measure traffic, improve products and content, comply with legal obligations, and manage customer consent and preferences.</p>',
      '<h2>DPDP Notice and Consent</h2>',
      '<p>For Indian users, we process digital personal data for lawful purposes connected with the services you request, including purchase fulfilment, support, notifications, security, analytics where configured, and compliance. Where consent is used, it should be specific, informed, clear, and capable of withdrawal through the contact and preference paths we provide.</p>',
      '<h2>GDPR Readiness Basis</h2>',
      '<p>Where GDPR applies, our processing may rely on contract performance, consent, legal obligation, legitimate interests such as platform security and service improvement, or another applicable lawful basis. You may request information about the basis used for a specific processing activity.</p>',
      '<h2>Sharing and Processors</h2>',
      '<p>We may share data with delivery partners, payment providers, notification providers, analytics tools, hosting infrastructure, security services, professional advisers, and authorities where legally required. Service providers are expected to process data only for instructed purposes and with suitable safeguards.</p>',
      '<h2>Retention</h2>',
      '<p>We keep personal data only as long as reasonably needed for the purpose collected, customer relationship, support, fraud prevention, tax/accounting records, legal claims, or applicable law. When the purpose is no longer served and retention is not legally required, records should be deleted, anonymized, or restricted according to operational capability.</p>',
      '<h2>Security</h2>',
      '<p>We use technical and organizational safeguards such as authentication, role-based admin access, encrypted sensitive configuration, logging, access controls, and operational review. No online service can guarantee absolute security, but we work to prevent unauthorized access, disclosure, alteration, loss, or misuse.</p>',
      '<h2>Your Rights</h2>',
      '<p>Depending on your location and applicable law, you may request access, correction, completion, deletion, grievance redressal, consent withdrawal, portability, restriction, objection, or information about processing. We may need to verify identity before acting on a request, and some rights may be limited by legal, safety, fraud-prevention, or transaction-completion requirements.</p>',
      '<h2>Children</h2>',
      '<p>Our ecommerce services are intended for users who can lawfully enter transactions. We do not knowingly target children with behavioural advertising. If a parent or lawful guardian believes a child has provided personal data, they may contact us for review.</p>',
      '<h2>Updates</h2>',
      '<p>We may update this policy as the platform, law, analytics configuration, or business operations change. The latest version will be published here.</p>',
    ].join(''),
  },
  {
    title: 'Data Protection and Consent Policy',
    slug: 'data-protection-consent-policy',
    policyType: 'data_protection',
    moduleKey: 'core',
    excerpt: 'How BuyWell Marketplace handles consent, DPDP/GDPR data rights, grievance intake, retention, and breach readiness.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>This policy supplements the Privacy Policy and describes how BuyWell Marketplace manages consent, data-rights requests, grievance intake, security evidence, and breach-response readiness for DPDP and GDPR compliance operations.</p>',
      '<h2>Consent Management</h2>',
      '<p>Consent requests should describe the personal data involved, the purpose of processing, and the way a user can withdraw consent. Withdrawal requests can be sent to support@buywell.in. Withdrawal does not affect processing already completed before withdrawal and may affect our ability to provide requested services that require the data.</p>',
      '<h2>Data-Rights Request Workflow</h2>',
      '<p>Users may request access, correction, completion, update, deletion, withdrawal, grievance support, and, where GDPR applies, portability, restriction, objection, or review of automated decisions. BuyWell Marketplace should verify identity, record the request, assign an owner, assess legal exceptions, respond within the applicable timeline, and keep evidence in the admin compliance panel.</p>',
      '<h2>Grievance Redressal</h2>',
      '<p>Privacy grievances should include the user name, contact detail, order number if relevant, request type, and supporting context. The support owner should acknowledge, investigate, resolve or escalate, and record the outcome. Users may also use statutory complaint channels where applicable.</p>',
      '<h2>Breach Readiness</h2>',
      '<p>A suspected personal data breach should be escalated immediately to the admin owner. The response should identify affected systems, data categories, users, containment steps, processor involvement, notification obligations, user impact, and corrective action. Evidence should be tracked in the compliance panel.</p>',
      '<h2>Retention and Deletion</h2>',
      '<p>Data should be retained only for service, legal, accounting, support, fraud-prevention, security, or dispute-resolution needs. Deletion requests should be assessed against active orders, refunds, tax records, chargeback risk, and legal holds before fulfilment.</p>',
      '<h2>Processor and Vendor Review</h2>',
      '<p>Processors such as hosting, payment, delivery, email, SMS, WhatsApp, analytics, and storage providers should be reviewed for purpose limitation, access control, security, retention, and incident support before production use.</p>',
    ].join(''),
  },
  {
    title: 'Refund Policy',
    slug: 'refund-policy',
    policyType: 'refund',
    moduleKey: 'ecommerce',
    excerpt: 'Refund eligibility, review, approval, and processing timelines.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>BuyWell Marketplace wants every customer to receive authentic, safe, and properly packed natural products. Refunds are reviewed through the ecommerce refund workflow against order status, payment confirmation, product condition, delivery evidence, and customer notes.</p>',
      '<h2>Eligible Refund Situations</h2>',
      '<p>A refund may be considered if the order was prepaid but cancelled before dispatch, the product was unavailable, the wrong product was delivered, the package was damaged in transit, the product arrived unusable, duplicate payment was confirmed, or the support team approves a refund after investigation.</p>',
      '<h2>Non-Refundable Situations</h2>',
      '<p>Refunds may be declined where a consumable product has been opened or consumed without verified defect, damage occurred after delivery, storage instructions were not followed, the request is outside the support window, evidence is insufficient, or the issue is caused by incorrect customer information.</p>',
      '<h2>How to Request</h2>',
      '<p>Members can submit refund requests from order details where enabled or contact support with order number, product name, issue description, photos/video of packaging and product, delivery date, and preferred resolution.</p>',
      '<h2>Review and Processing</h2>',
      '<p>Approved refunds are processed to the original payment method or another approved route according to payment provider capability. Bank, gateway, and settlement timelines may vary. Refund status is visible to admins in the refund workflow.</p>',
    ].join(''),
  },
  {
    title: 'Shipping Policy',
    slug: 'shipping-policy',
    policyType: 'shipping',
    moduleKey: 'ecommerce',
    excerpt: 'Shipping coverage, charges, tracking, and delivery estimates.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>BuyWell Marketplace ships eligible honey, A2 Bilona Ghee, samples, and natural products to serviceable areas using available courier and fulfilment partners.</p>',
      '<h2>Dispatch and Delivery</h2>',
      '<p>Dispatch timelines depend on stock, payment confirmation, packaging readiness, courier pickup, holidays, weather, and serviceability. Estimated delivery timelines shown during checkout or support communication are indicative and may change due to courier or regional conditions.</p>',
      '<h2>Shipping Fees</h2>',
      '<p>Shipping charges, free-shipping thresholds, COD availability, and special handling fees may vary by order value, location, courier, product weight, and campaign rules. Final charges are shown before order confirmation where ecommerce checkout is enabled.</p>',
      '<h2>Tracking and Failed Delivery</h2>',
      '<p>Tracking details may be sent by email, SMS, WhatsApp, or displayed in order details when available. Customers must provide complete address and reachable phone number. Failed delivery due to incorrect address, unavailable recipient, or repeated failed attempts may require re-shipping fees.</p>',
      '<h2>Damaged or Missing Items</h2>',
      '<p>If a shipment arrives damaged, leaking, broken, or incomplete, contact support promptly with order number and photos/video of the outer package, label, inner packaging, and product condition.</p>',
    ].join(''),
  },
  {
    title: 'Cookie Policy',
    slug: 'cookie-policy',
    policyType: 'cookie',
    moduleKey: 'seo',
    excerpt: 'Cookies and analytics technologies used on the website.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>This Cookie Policy explains how BuyWell Marketplace may use cookies, local storage, pixels, tags, analytics scripts, and similar technologies to operate the website, keep users signed in, protect sessions, remember preferences, understand traffic, and improve content.</p>',
      '<h2>Cookie Types</h2>',
      '<p><strong>Essential cookies</strong> support login, cart, checkout, security, and admin functions. <strong>Analytics cookies or tags</strong> help measure page traffic, campaign performance, and user journeys where configured. <strong>Marketing tags</strong> may support remarketing or conversion measurement only when enabled by admins.</p>',
      '<h2>Google Tag Manager and Analytics</h2>',
      '<p>The SEO module can store Google Tag Manager and analytics-related settings. If enabled, third-party scripts may set their own cookies subject to their provider terms. Admins should enable only the tools that match the published privacy and consent approach.</p>',
      '<h2>Managing Cookies</h2>',
      '<p>You can block or delete cookies through browser settings. Some essential features, including login, cart, checkout, and admin functions, may not work correctly if essential storage is disabled.</p>',
      '<h2>Updates</h2>',
      '<p>We may update this policy when analytics providers, tag settings, cookie categories, or consent controls change.</p>',
    ].join(''),
  },
  {
    title: 'Return and Replacement Policy',
    slug: 'return-replacement-policy',
    policyType: 'returns',
    moduleKey: 'ecommerce',
    excerpt: 'Return and replacement conditions for damaged, wrong, defective, or unsafe deliveries.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>Because BuyWell Marketplace sells consumable natural products, returns and replacements are handled carefully for customer safety, product integrity, and hygiene.</p>',
      '<h2>Replacement Eligibility</h2>',
      '<p>Replacement may be approved for wrong item delivered, damaged jar or bottle, leakage in transit, missing item, verified manufacturing or packing defect, or other support-approved issue. Evidence such as package photos, product photos, unboxing video, invoice, and order number may be required.</p>',
      '<h2>Return Restrictions</h2>',
      '<p>Opened, consumed, tampered, improperly stored, or customer-damaged consumables may not be returnable unless a verified defect or safety issue is established. Natural crystallization of raw honey is not a defect.</p>',
      '<h2>Return Pickup or Self-Ship</h2>',
      '<p>Where return pickup is available, support will provide instructions. If self-shipping is approved, the item must be packed securely to avoid leakage or breakage. Refund or replacement decisions may be made after inspection.</p>',
    ].join(''),
  },
  {
    title: 'Cancellation Policy',
    slug: 'cancellation-policy',
    policyType: 'cancellation',
    moduleKey: 'ecommerce',
    excerpt: 'Order cancellation rules before dispatch, after dispatch, and for unavailable products.',
    content: [
      '<p><strong>Last reviewed:</strong> 2 June 2026</p>',
      '<p>Customers may request cancellation before dispatch by contacting BuyWell Marketplace support with the order number. Once the order is packed, dispatched, or handed to courier, cancellation may no longer be possible and the refund or return workflow may apply instead.</p>',
      '<h2>Pre-Dispatch Cancellation</h2>',
      '<p>If cancellation is accepted before dispatch, prepaid amounts are refunded through the approved refund route after payment verification.</p>',
      '<h2>Post-Dispatch Orders</h2>',
      '<p>For dispatched orders, customers should wait for delivery and then follow the refund, return, or replacement policy if eligible. Courier return-to-origin charges may apply where delivery fails due to incorrect address or recipient unavailability.</p>',
      '<h2>Cancellation by BuyWell Marketplace</h2>',
      '<p>We may cancel orders due to product unavailability, payment failure, serviceability limits, suspected fraud, listing error, operational constraints, or legal restriction. Approved prepaid cancellations are refunded.</p>',
    ].join(''),
  },
];

const DEFAULT_MENUS = [
  {
    menuKey: 'landing_header',
    label: 'Landing Page Header',
    items: [
      { label: 'Shop', href: '/shop', itemType: 'shop_index', sortOrder: 1 },
      { label: 'Blog', href: '/blog', itemType: 'blog_index', sortOrder: 2 },
      { label: 'Promise', href: '/#promise', itemType: 'landing_anchor', sortOrder: 3 },
      { label: 'Policies', href: '/privacy-policy', itemType: 'cms_page', policyType: 'privacy', sortOrder: 4 },
      { label: 'Terms', href: '/terms-and-conditions', itemType: 'cms_page', policyType: 'terms', parentLabel: 'Policies', sortOrder: 5 },
      { label: 'Data Protection', href: '/data-protection-consent-policy', itemType: 'cms_page', policyType: 'data_protection', parentLabel: 'Policies', sortOrder: 6 },
      { label: 'Refunds', href: '/refund-policy', itemType: 'cms_page', policyType: 'refund', parentLabel: 'Policies', sortOrder: 7 },
      { label: 'Shipping', href: '/shipping-policy', itemType: 'cms_page', policyType: 'shipping', parentLabel: 'Policies', sortOrder: 8 },
      { label: 'Contact', href: '/#contact', itemType: 'landing_anchor', sortOrder: 9 },
    ],
  },
  {
    menuKey: 'site_header',
    label: 'Other Pages Header',
    items: [
      { label: 'Home', href: '/', itemType: 'landing_anchor', sortOrder: 1 },
      { label: 'Shop', href: '/shop', itemType: 'shop_index', sortOrder: 2 },
      { label: 'Blog', href: '/blog', itemType: 'blog_index', sortOrder: 3 },
      { label: 'Policies', href: '/privacy-policy', itemType: 'cms_page', policyType: 'privacy', sortOrder: 4 },
      { label: 'Terms', href: '/terms-and-conditions', itemType: 'cms_page', policyType: 'terms', parentLabel: 'Policies', sortOrder: 5 },
      { label: 'Data Protection', href: '/data-protection-consent-policy', itemType: 'cms_page', policyType: 'data_protection', parentLabel: 'Policies', sortOrder: 6 },
      { label: 'Returns', href: '/return-replacement-policy', itemType: 'cms_page', policyType: 'returns', parentLabel: 'Policies', sortOrder: 7 },
      { label: 'Refunds', href: '/refund-policy', itemType: 'cms_page', policyType: 'refund', parentLabel: 'Policies', sortOrder: 8 },
      { label: 'Contact', href: '/#contact', itemType: 'landing_anchor', sortOrder: 9 },
    ],
  },
  {
    menuKey: 'footer',
    label: 'Footer Menu',
    items: [
      { label: 'Blog', href: '/blog', itemType: 'blog_index', sortOrder: 1 },
      { label: 'Our Promise', href: '/#promise', itemType: 'landing_anchor', sortOrder: 2 },
      { label: 'Community', href: '/#gallery', itemType: 'landing_anchor', sortOrder: 3 },
      { label: 'Policies', href: '/privacy-policy', itemType: 'cms_page', policyType: 'privacy', sortOrder: 4 },
      { label: 'Terms and Conditions', href: '/terms-and-conditions', itemType: 'cms_page', policyType: 'terms', parentLabel: 'Policies', sortOrder: 5 },
      { label: 'Data Protection', href: '/data-protection-consent-policy', itemType: 'cms_page', policyType: 'data_protection', parentLabel: 'Policies', sortOrder: 6 },
      { label: 'Cookie Policy', href: '/cookie-policy', itemType: 'cms_page', policyType: 'cookie', parentLabel: 'Policies', sortOrder: 7 },
      { label: 'Refund Policy', href: '/refund-policy', itemType: 'cms_page', policyType: 'refund', parentLabel: 'Policies', sortOrder: 8 },
      { label: 'Return and Replacement', href: '/return-replacement-policy', itemType: 'cms_page', policyType: 'returns', parentLabel: 'Policies', sortOrder: 9 },
      { label: 'Cancellation Policy', href: '/cancellation-policy', itemType: 'cms_page', policyType: 'cancellation', parentLabel: 'Policies', sortOrder: 10 },
      { label: 'Shipping Policy', href: '/shipping-policy', itemType: 'cms_page', policyType: 'shipping', parentLabel: 'Policies', sortOrder: 11 },
      { label: 'Free Sample', href: '/#contact', itemType: 'landing_anchor', sortOrder: 12 },
    ],
  },
];

const COMPLIANCE_ITEMS = [
  ['gdpr', 'core', 'transparent_notice', 'Transparent privacy notice', 'Privacy information is published in clear language, names BuyWell Marketplace contact details, and is reachable from nested public policy menus.', 'privacy', 'Privacy Policy page seeded with DPDP/GDPR-ready notice; legal owner should approve final publication wording.'],
  ['gdpr', 'core', 'lawful_basis_register', 'Lawful basis and processing purpose register', 'Each processing activity should identify contract, consent, legal obligation, legitimate interest, or another applicable basis.', 'privacy', 'Privacy Policy describes typical lawful bases; maintain activity-level evidence in admin compliance notes.'],
  ['gdpr', 'core', 'data_subject_requests', 'Data subject request handling', 'Admin process covers access, rectification, erasure, restriction, portability, objection, and automated-decision review requests.', 'data_protection', 'Data Protection and Consent Policy defines intake workflow; connect request intake to support operations.'],
  ['gdpr', 'seo', 'analytics_consent', 'Analytics and tag transparency', 'Analytics, Google Tag Manager, and cookie/tag use are documented and controlled from the SEO module.', 'cookie', 'SEO analytics settings and Cookie Policy page are available.'],
  ['gdpr', 'core', 'retention_minimisation', 'Data minimisation and retention', 'Personal data should be limited to service purposes and retained only while needed for business, legal, security, or dispute requirements.', 'privacy', 'Privacy Policy includes retention language; operational retention jobs and deletion evidence should be maintained.'],
  ['gdpr', 'core', 'processor_governance', 'Processor and vendor governance', 'Hosting, payment, courier, email, SMS, WhatsApp, media, and analytics processors should be reviewed for purpose limitation and safeguards.', 'data_protection', 'Vendor review requirement is published; add processor contracts and review dates as evidence.'],
  ['gdpr', 'core', 'security_measures', 'Security measures', 'Role-based access, encrypted secrets, authentication, logging, and operational safeguards are tracked.', 'data_protection', 'Application has role-based admin controls and encrypted config; complete infra evidence and review cadence.'],
  ['gdpr', 'core', 'breach_notification', 'Breach response tracking', 'Internal evidence records cover breach response ownership and notification readiness.', 'data_protection', 'Data Protection and Consent Policy includes breach readiness; assign owner, escalation timeline, and drill evidence.'],
  ['gdpr', 'core', 'cross_border_transfer_review', 'Cross-border transfer review', 'Any overseas hosting, analytics, notification, or payment processing should be assessed before enablement.', 'privacy', 'Policy describes processors; admin must document transfer safeguards for enabled vendors.'],
  ['dpdp', 'core', 'lawful_purpose_notice', 'Lawful purpose and notice', 'Data processing notice states lawful purpose, requested data, and user rights.', 'privacy', 'Privacy Policy includes lawful purpose, contact path, data categories, and rights summary.'],
  ['dpdp', 'core', 'clear_consent', 'Clear consent request', 'Consent should be free, specific, informed, unambiguous, clear, and tied to the specified purpose.', 'data_protection', 'Consent requirements are published; confirm all production consent UI copy and storage evidence.'],
  ['dpdp', 'core', 'consent_withdrawal', 'Consent withdrawal and grievance path', 'Users can identify how to withdraw consent and raise grievances.', 'data_protection', 'Data Protection and Consent Policy gives withdrawal and grievance contact path.'],
  ['dpdp', 'core', 'security_safeguards', 'Reasonable security safeguards', 'Admin records security safeguards and evidence for personal data protection.', 'data_protection', 'Authentication, admin gating, and encrypted config exist; complete operational evidence.'],
  ['dpdp', 'core', 'breach_intimation', 'Personal data breach intimation readiness', 'Breach workflow should identify affected Data Principals, Board intimation needs, containment, and remediation.', 'data_protection', 'Policy defines breach escalation; add incident owner, templates, and drill results.'],
  ['dpdp', 'core', 'erasure_when_purpose_served', 'Erasure when purpose is served', 'Personal data should be erased when consent is withdrawn or purpose no longer applies unless retention is legally required.', 'privacy', 'Privacy Policy includes retention/erasure language; schedule operational deletion review.'],
  ['dpdp', 'core', 'data_processor_controls', 'Data processor controls', 'Processors should handle personal data only on instructed purposes with appropriate safeguards.', 'data_protection', 'Vendor review requirement published; upload processor contracts/evidence in admin notes.'],
  ['dpdp', 'core', 'children_data_safeguards', "Children's data safeguards", 'The platform should avoid behavioural targeting of children and require guardian review where children data is knowingly processed.', 'privacy', 'Privacy Policy includes children section; confirm production flows do not target children.'],
  ['dpdp', 'ecommerce', 'order_data_minimisation', 'Order data minimisation', 'Ecommerce data collection is limited to fulfilment, payment verification, and support.', 'terms', 'Order/refund workflows collect purpose-specific fields.'],
].map(([complianceKey, moduleKey, parameterKey, title, description, policyType, evidence]) => ({
  complianceKey,
  moduleKey,
  parameterKey,
  title,
  description,
  policyType,
  evidence,
  status: 'partial',
}));

module.exports = async function seedContent() {
  if (!process.env.DATABASE_URL) return;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5000,
  });
  const client = await pool.connect();

  try {
    if (!(await tableExists(client, 'cms_pages'))) {
      console.warn('[content-seed] cms_pages table not found; skipping CMS content seed.');
      return;
    }

    await client.query('BEGIN');
    const policyPageIds = await seedPolicyPages(client);

    if (await tableExists(client, 'cms_menus')) {
      await seedMenus(client, policyPageIds);
    }

    if (await tableExists(client, 'compliance_checks')) {
      await seedComplianceChecks(client, policyPageIds);
    }

    await client.query('COMMIT');
    await invalidateRedisPrefixes(['query:cms', 'page:cms', 'page:sitemap']);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

async function seedPolicyPages(client) {
  const policyPageIds = new Map();

  for (const page of POLICY_PAGES) {
    const existing = await client.query(
      `SELECT id, content, template, module_key, policy_type, meta_title,
              meta_description
       FROM cms_pages
       WHERE slug = $1
       LIMIT 1`,
      [page.slug]
    );

    if (existing.rowCount === 0) {
      const inserted = await client.query(
        `INSERT INTO cms_pages (
          id, title, slug, excerpt, content, status, template, module_key,
          policy_type, meta_title, meta_description, published_at, created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'published', 'policy', $6,
          $7, $8, $9, NOW(), NOW(), NOW()
        )
        RETURNING id`,
        [
          randomUUID(),
          page.title,
          page.slug,
          page.excerpt,
          page.content,
          page.moduleKey,
          page.policyType,
          page.title,
          page.excerpt,
        ]
      );
      policyPageIds.set(page.policyType, inserted.rows[0].id);
      continue;
    }

    const saved = existing.rows[0];
    policyPageIds.set(page.policyType, saved.id);
    if (shouldRefreshSeededPolicy(saved.content)) {
      await client.query(
        `UPDATE cms_pages
         SET title = $1,
             excerpt = $2,
             content = $3,
             status = 'published',
             template = 'policy',
             module_key = $4,
             policy_type = $5,
             meta_title = $6,
             meta_description = $7,
             updated_at = NOW()
         WHERE id = $8`,
        [
          page.title,
          page.excerpt,
          page.content,
          page.moduleKey,
          page.policyType,
          page.title,
          page.excerpt,
          saved.id,
        ]
      );
    } else if (
      !saved.template
      || !saved.module_key
      || !saved.policy_type
      || !saved.meta_title
      || !saved.meta_description
    ) {
      await client.query(
        `UPDATE cms_pages
         SET template = COALESCE(NULLIF(template, ''), 'policy'),
             module_key = COALESCE(NULLIF(module_key, ''), $1),
             policy_type = COALESCE(policy_type, $2),
             meta_title = COALESCE(NULLIF(meta_title, ''), $3),
             meta_description = COALESCE(NULLIF(meta_description, ''), $4),
             updated_at = NOW()
         WHERE id = $5`,
        [page.moduleKey, page.policyType, page.title, page.excerpt, saved.id]
      );
    }
  }

  console.log(`[content-seed] ${POLICY_PAGES.length} policy CMS pages ensured.`);
  return policyPageIds;
}

async function seedMenus(client, policyPageIds) {
  const hasParentItemId = await columnExists(client, 'cms_menu_items', 'parent_item_id');
  if (!hasParentItemId) {
    console.warn('[content-seed] cms_menu_items.parent_item_id is missing; skipping default nested menus.');
    return;
  }

  let insertedCount = 0;
  for (const menuData of DEFAULT_MENUS) {
    const menu = await ensureMenu(client, menuData);
    const current = await client.query(
      'SELECT id, label, href, parent_item_id FROM cms_menu_items WHERE menu_id = $1',
      [menu.id]
    );
    const existing = current.rows;
    const parentIds = new Map();

    for (const row of existing.filter((item) => !item.parent_item_id)) {
      parentIds.set(row.label, row.id);
    }

    for (const item of menuData.items.filter((row) => !row.parentLabel)) {
      const existingItem = existing.find((row) => !row.parent_item_id && row.label === item.label && row.href === item.href);
      if (existingItem) {
        parentIds.set(item.label, existingItem.id);
        continue;
      }

      const inserted = await insertMenuItem(client, menu.id, item, policyPageIds, null);
      parentIds.set(item.label, inserted.id);
      existing.push({
        id: inserted.id,
        label: item.label,
        href: item.href,
        parent_item_id: null,
      });
      insertedCount += 1;
    }

    for (const item of menuData.items.filter((row) => row.parentLabel)) {
      const parentItemId = parentIds.get(item.parentLabel);
      if (!parentItemId) continue;
      const existingItem = existing.find((row) => row.parent_item_id === parentItemId && row.label === item.label && row.href === item.href);
      if (existingItem) continue;

      const inserted = await insertMenuItem(client, menu.id, item, policyPageIds, parentItemId);
      existing.push({
        id: inserted.id,
        label: item.label,
        href: item.href,
        parent_item_id: parentItemId,
      });
      insertedCount += 1;
    }
  }

  console.log(`[content-seed] CMS menus ensured; ${insertedCount} missing item(s) inserted.`);
}

async function seedComplianceChecks(client, policyPageIds) {
  for (const item of COMPLIANCE_ITEMS) {
    const existing = await client.query(
      `SELECT id, module_key, title, description, policy_page_id
       FROM compliance_checks
       WHERE compliance_key = $1 AND parameter_key = $2
       LIMIT 1`,
      [item.complianceKey, item.parameterKey]
    );
    const policyPageId = policyPageIds.get(item.policyType) || null;

    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO compliance_checks (
          id, compliance_key, module_key, parameter_key, title, description,
          status, evidence, policy_page_id, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
        )`,
        [
          randomUUID(),
          item.complianceKey,
          item.moduleKey,
          item.parameterKey,
          item.title,
          item.description,
          item.status,
          item.evidence,
          policyPageId,
        ]
      );
      continue;
    }

    const saved = existing.rows[0];
    if (
      saved.module_key === item.moduleKey
      && saved.title === item.title
      && saved.description === item.description
      && saved.policy_page_id === policyPageId
    ) {
      continue;
    }

    await client.query(
      `UPDATE compliance_checks
       SET module_key = $1,
           title = $2,
           description = $3,
           policy_page_id = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        item.moduleKey,
        item.title,
        item.description,
        policyPageId,
        existing.rows[0].id,
      ]
    );
  }

  console.log(`[content-seed] ${COMPLIANCE_ITEMS.length} compliance checklist rows ensured.`);
}

async function ensureMenu(client, menuData) {
  const existing = await client.query(
    'SELECT id FROM cms_menus WHERE menu_key = $1 LIMIT 1',
    [menuData.menuKey]
  );
  if (existing.rowCount > 0) return existing.rows[0];

  const inserted = await client.query(
    `INSERT INTO cms_menus (id, menu_key, label, is_enabled, updated_at)
     VALUES ($1, $2, $3, true, NOW())
     RETURNING id`,
    [randomUUID(), menuData.menuKey, menuData.label]
  );
  return inserted.rows[0];
}

async function insertMenuItem(client, menuId, item, policyPageIds, parentItemId) {
  const pageId = item.itemType === 'cms_page' && item.policyType
    ? policyPageIds.get(item.policyType) || null
    : null;
  const inserted = await client.query(
    `INSERT INTO cms_menu_items (
      id, menu_id, label, href, item_type, page_id, blog_post_id, product_id,
      parent_item_id, opens_new_tab, is_enabled, sort_order, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, NULL, NULL,
      $7, $8, true, $9, NOW(), NOW()
    )
    RETURNING id`,
    [
      randomUUID(),
      menuId,
      item.label,
      item.href,
      item.itemType,
      pageId,
      parentItemId,
      item.opensNewTab === true,
      item.sortOrder,
    ]
  );
  return inserted.rows[0];
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [tableName]
  );
  return result.rowCount > 0;
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return result.rowCount > 0;
}

function shouldRefreshSeededPolicy(content) {
  const value = content || '';
  return value.length < 700
    || value.includes('Administrators should review')
    || value.includes('baseline language')
    || value.includes('contact pathway placeholder');
}

async function invalidateRedisPrefixes(prefixes) {
  if (!process.env.REDIS_URL) {
    console.log('[content-seed] REDIS_URL not set; cache invalidation skipped.');
    return;
  }

  let Redis;
  try {
    Redis = require('ioredis');
  } catch {
    console.warn('[content-seed] ioredis not available; cache invalidation skipped.');
    return;
  }

  const keyPrefix = 'an:';
  const redis = new Redis(process.env.REDIS_URL, {
    keyPrefix,
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
  });

  try {
    let deleted = 0;
    for (const prefix of prefixes) {
      deleted += await invalidateByPrefix(redis, keyPrefix, prefix);
    }
    console.log(`[content-seed] CMS cache prefixes invalidated; ${deleted} key(s) removed.`);
  } catch (err) {
    console.warn('[content-seed] Cache invalidation warning:', err.message);
  } finally {
    redis.disconnect();
  }
}

async function invalidateByPrefix(redis, keyPrefix, prefix) {
  let cursor = '0';
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      `${keyPrefix}${prefix}*`,
      'COUNT',
      100
    );
    cursor = nextCursor;

    if (keys.length === 0) continue;
    const pipeline = redis.pipeline();
    for (const key of keys) {
      const logicalKey = key.startsWith(keyPrefix) ? key.slice(keyPrefix.length) : key;
      pipeline.del(logicalKey);
    }
    const results = await pipeline.exec();
    deleted += results ? results.length : 0;
  } while (cursor !== '0');

  return deleted;
}

if (require.main === module) {
  module.exports().catch((err) => {
    console.error('[content-seed] Seed failed:', err);
    process.exit(1);
  });
}
