#!/usr/bin/env node
/**
 * category-seed.js
 * Idempotent seed: curated Indian e-commerce category tree with GST HSN defaults.
 *
 * Strategy: ON CONFLICT (slug) DO NOTHING — admin customisations are never overwritten.
 * Tax rates are looked up by total_rate (basis points) from the tax_rates table.
 *
 * GST rates used (basis points in DB):
 *   0 = Exempt   | 300 = 3% (gold/silver) | 500 = 5%  | 1200 = 12%
 *   1800 = 18%   | 2800 = 28%
 */

'use strict';

const { Pool } = require('pg');
const { randomUUID } = require('crypto');

// ── Category data ─────────────────────────────────────────────────────────────
// gstRate: percentage (0 / 3 / 5 / 12 / 18 / 28) — converted to basis points for DB lookup
// showOnHomepage:    featured top-level categories shown in old homepage grid (legacy)
// showOnShop:        shown in shop page sidebar filters (all sub-cats default true)
// showOnHeroSidebar: shown in the left-sidebar category panel on the homepage hero
// showOnShopWidget:  shown in "Shop by Category" grid widget on homepage

const CATEGORIES = [
  // ── 1. Food & Grocery ──────────────────────────────────────────────────────
  {
    name: 'Food & Grocery',
    slug: 'food-grocery',
    color: '#16a34a',
    description: 'Fresh and packaged food, organic staples, spices, beverages and more',
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: true,
    showOnShopWidget: true,
    sortOrder: 1,
    children: [
      { name: 'Honey & Bee Products',          slug: 'honey-bee-products',          hsnCode: '0409', gstRate: 5,  sortOrder: 1  },
      { name: 'Edible Oils',                   slug: 'edible-oils',                 hsnCode: '1516', gstRate: 5,  sortOrder: 2  },
      { name: 'Desi Ghee & Butter',            slug: 'desi-ghee-butter',            hsnCode: '0405', gstRate: 12, sortOrder: 3  },
      { name: 'Spices & Masala',               slug: 'spices-masala',               hsnCode: '0910', gstRate: 5,  sortOrder: 4  },
      { name: 'Dry Fruits & Nuts',             slug: 'dry-fruits-nuts',             hsnCode: '0813', gstRate: 5,  sortOrder: 5  },
      { name: 'Rice & Grains',                 slug: 'rice-grains',                 hsnCode: '1006', gstRate: 0,  sortOrder: 6  },
      { name: 'Pulses & Lentils',              slug: 'pulses-lentils',              hsnCode: '0713', gstRate: 0,  sortOrder: 7  },
      { name: 'Jaggery & Natural Sweeteners',  slug: 'jaggery-natural-sweeteners',  hsnCode: '1701', gstRate: 0,  sortOrder: 8  },
      { name: 'Tea & Coffee',                  slug: 'tea-coffee',                  hsnCode: '0902', gstRate: 5,  sortOrder: 9  },
      { name: 'Packaged Beverages & Juices',   slug: 'packaged-beverages-juices',   hsnCode: '2202', gstRate: 12, sortOrder: 10 },
      { name: 'Pickles, Jams & Preserves',     slug: 'pickles-jams-preserves',      hsnCode: '2001', gstRate: 12, sortOrder: 11 },
      { name: 'Millets & Ancient Grains',      slug: 'millets-ancient-grains',      hsnCode: '1008', gstRate: 0,  sortOrder: 12 },
      { name: 'Organic Cereals & Flour',       slug: 'organic-cereals-flour',       hsnCode: '1101', gstRate: 0,  sortOrder: 13 },
      { name: 'Snacks & Namkeen',              slug: 'snacks-namkeen',              hsnCode: '1905', gstRate: 12, sortOrder: 14 },
      { name: 'Health Drinks & Protein',       slug: 'health-drinks-protein',       hsnCode: '2106', gstRate: 18, sortOrder: 15 },
      { name: 'Dairy & Eggs',                  slug: 'dairy-eggs',                  hsnCode: '0401', gstRate: 0,  sortOrder: 16 },
      { name: 'Sauces & Condiments',           slug: 'sauces-condiments',           hsnCode: '2103', gstRate: 12, sortOrder: 17 },
      { name: 'Vinegar & Cooking Essentials',  slug: 'vinegar-cooking-essentials',  hsnCode: '2209', gstRate: 5,  sortOrder: 18 },
      { name: 'Bakery & Bread',                slug: 'bakery-bread',                hsnCode: '1905', gstRate: 5,  sortOrder: 19 },
      { name: 'Sugar & Salt',                  slug: 'sugar-salt',                  hsnCode: '1701', gstRate: 5,  sortOrder: 20 },
    ],
  },

  // ── 2. Ayurveda & Herbal ───────────────────────────────────────────────────
  {
    name: 'Ayurveda & Herbal',
    slug: 'ayurveda-herbal',
    color: '#92400e',
    description: 'Authentic Ayurvedic medicines, herbal supplements and natural wellness',
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: true,
    showOnShopWidget: true,
    sortOrder: 2,
    children: [
      { name: 'Ayurvedic Medicines',           slug: 'ayurvedic-medicines',          hsnCode: '3004', gstRate: 12, sortOrder: 1  },
      { name: 'Chyawanprash & Tonics',         slug: 'chyawanprash-tonics',          hsnCode: '3004', gstRate: 12, sortOrder: 2  },
      { name: 'Immunity Boosters',             slug: 'immunity-boosters',            hsnCode: '3004', gstRate: 12, sortOrder: 3  },
      { name: 'Digestive & Gut Health',        slug: 'digestive-gut-health',         hsnCode: '3004', gstRate: 12, sortOrder: 4  },
      { name: 'Liver & Kidney Health',         slug: 'liver-kidney-health',          hsnCode: '3004', gstRate: 12, sortOrder: 5  },
      { name: 'Diabetic & Sugar Control',      slug: 'diabetic-sugar-control',       hsnCode: '3004', gstRate: 12, sortOrder: 6  },
      { name: 'Pain Relief & Joint Care',      slug: 'pain-relief-joint-care',       hsnCode: '3004', gstRate: 12, sortOrder: 7  },
      { name: 'Herbal Supplements & Capsules', slug: 'herbal-supplements-capsules',  hsnCode: '2106', gstRate: 18, sortOrder: 8  },
      { name: 'Essential Oils & Extracts',     slug: 'essential-oils-extracts',      hsnCode: '3301', gstRate: 18, sortOrder: 9  },
      { name: 'Herbal Tea & Kadha',            slug: 'herbal-tea-kadha',             hsnCode: '0902', gstRate: 5,  sortOrder: 10 },
      { name: 'Ayurvedic Skin Care',           slug: 'ayurvedic-skin-care',          hsnCode: '3304', gstRate: 18, sortOrder: 11 },
      { name: 'Ayurvedic Hair Care',           slug: 'ayurvedic-hair-care',          hsnCode: '3305', gstRate: 18, sortOrder: 12 },
      { name: 'Stress & Sleep Care',           slug: 'stress-sleep-care',            hsnCode: '3004', gstRate: 12, sortOrder: 13 },
      { name: 'Weight Management',             slug: 'weight-management',            hsnCode: '2106', gstRate: 18, sortOrder: 14 },
    ],
  },

  // ── 3. Personal Care & Beauty ──────────────────────────────────────────────
  {
    name: 'Personal Care & Beauty',
    slug: 'personal-care',
    color: '#be185d',
    description: 'Hair care, skin care, grooming and cosmetics',
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: true,
    showOnShopWidget: true,
    sortOrder: 3,
    children: [
      { name: 'Hair Oils & Serums',            slug: 'hair-oils-serums',             hsnCode: '3305', gstRate: 18, sortOrder: 1  },
      { name: 'Shampoo & Conditioner',         slug: 'shampoo-conditioner',          hsnCode: '3305', gstRate: 18, sortOrder: 2  },
      { name: 'Hair Color & Treatment',        slug: 'hair-color-treatment',         hsnCode: '3305', gstRate: 18, sortOrder: 3  },
      { name: 'Hair Accessories',              slug: 'hair-accessories',             hsnCode: '9615', gstRate: 18, sortOrder: 4  },
      { name: 'Face Wash & Cleansers',         slug: 'face-wash-cleansers',          hsnCode: '3304', gstRate: 18, sortOrder: 5  },
      { name: 'Moisturisers & Serums',         slug: 'moisturisers-serums',          hsnCode: '3304', gstRate: 18, sortOrder: 6  },
      { name: 'Sunscreen & SPF Products',      slug: 'sunscreen-spf-products',       hsnCode: '3304', gstRate: 18, sortOrder: 7  },
      { name: 'Face Masks & Scrubs',           slug: 'face-masks-scrubs',            hsnCode: '3304', gstRate: 18, sortOrder: 8  },
      { name: 'Soaps & Body Wash',             slug: 'soaps-body-wash',              hsnCode: '3401', gstRate: 18, sortOrder: 9  },
      { name: 'Body Lotions & Creams',         slug: 'body-lotions-creams',          hsnCode: '3304', gstRate: 18, sortOrder: 10 },
      { name: 'Toothpaste & Oral Care',        slug: 'toothpaste-oral-care',         hsnCode: '3306', gstRate: 18, sortOrder: 11 },
      { name: 'Perfumes & Deodorants',         slug: 'perfumes-deodorants',          hsnCode: '3303', gstRate: 18, sortOrder: 12 },
      { name: 'Feminine Hygiene',              slug: 'feminine-hygiene',             hsnCode: '3307', gstRate: 12, sortOrder: 13 },
      { name: "Men's Grooming",                slug: 'mens-grooming',                hsnCode: '3307', gstRate: 18, sortOrder: 14 },
      { name: 'Makeup & Cosmetics',            slug: 'makeup-cosmetics',             hsnCode: '3304', gstRate: 18, sortOrder: 15 },
      { name: 'Nail Care',                     slug: 'nail-care',                    hsnCode: '3304', gstRate: 18, sortOrder: 16 },
      { name: 'Eye Care',                      slug: 'eye-care',                     hsnCode: '3304', gstRate: 18, sortOrder: 17 },
    ],
  },

  // ── 4. Home & Living ───────────────────────────────────────────────────────
  {
    name: 'Home & Living',
    slug: 'home-living',
    color: '#1d4ed8',
    description: 'Kitchen essentials, home decor, cleaning and spiritual products',
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: true,
    showOnShopWidget: true,
    sortOrder: 4,
    children: [
      { name: 'Kitchen Utensils & Cookware',   slug: 'kitchen-utensils-cookware',    hsnCode: '7323', gstRate: 12, sortOrder: 1  },
      { name: 'Dinner Sets & Crockery',        slug: 'dinner-sets-crockery',         hsnCode: '6911', gstRate: 12, sortOrder: 2  },
      { name: 'Non-Stick & Cast Iron',         slug: 'non-stick-cast-iron',          hsnCode: '7323', gstRate: 12, sortOrder: 3  },
      { name: 'Home Decor & Furnishings',      slug: 'home-decor-furnishings',       hsnCode: '4420', gstRate: 12, sortOrder: 4  },
      { name: 'Bedsheets & Pillow Covers',     slug: 'bedsheets-pillow-covers',      hsnCode: '6302', gstRate: 12, sortOrder: 5  },
      { name: 'Towels & Bath Linen',           slug: 'towels-bath-linen',            hsnCode: '6302', gstRate: 5,  sortOrder: 6  },
      { name: 'Curtains & Blinds',             slug: 'curtains-blinds',              hsnCode: '6303', gstRate: 5,  sortOrder: 7  },
      { name: 'Carpets & Floor Mats',          slug: 'carpets-floor-mats',           hsnCode: '5703', gstRate: 12, sortOrder: 8  },
      { name: 'Cleaning & Laundry',            slug: 'cleaning-laundry',             hsnCode: '3402', gstRate: 18, sortOrder: 9  },
      { name: 'Pooja & Spiritual Items',       slug: 'pooja-spiritual-items',        hsnCode: '3307', gstRate: 12, sortOrder: 10 },
      { name: 'Agarbatti & Dhoop',             slug: 'agarbatti-dhoop',              hsnCode: '3307', gstRate: 12, sortOrder: 11 },
      { name: 'Candles & Diffusers',           slug: 'candles-diffusers',            hsnCode: '3406', gstRate: 12, sortOrder: 12 },
      { name: 'Storage & Organisation',        slug: 'storage-organisation',         hsnCode: '3923', gstRate: 18, sortOrder: 13 },
      { name: 'Water Bottles & Containers',    slug: 'water-bottles-containers',     hsnCode: '3924', gstRate: 18, sortOrder: 14 },
      { name: 'Lighting & Electrical Fittings',slug: 'lighting-electrical-fittings', hsnCode: '8512', gstRate: 12, sortOrder: 15 },
      { name: 'Furniture',                     slug: 'furniture',                    hsnCode: '9403', gstRate: 18, sortOrder: 16 },
      { name: 'Air Fresheners & Repellents',   slug: 'air-fresheners-repellents',    hsnCode: '3307', gstRate: 18, sortOrder: 17 },
    ],
  },

  // ── 5. Baby & Kids ─────────────────────────────────────────────────────────
  {
    name: 'Baby & Kids',
    slug: 'baby-kids',
    color: '#ea580c',
    description: 'Baby care, nutrition, clothing and toys for infants and children',
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: true,
    showOnShopWidget: false,
    sortOrder: 5,
    children: [
      { name: 'Baby Skin Care',                slug: 'baby-skin-care',               hsnCode: '3304', gstRate: 18, sortOrder: 1  },
      { name: 'Baby Hair Care',                slug: 'baby-hair-care',               hsnCode: '3305', gstRate: 18, sortOrder: 2  },
      { name: 'Baby Food & Infant Formula',    slug: 'baby-food-infant-formula',     hsnCode: '1901', gstRate: 0,  sortOrder: 3  },
      { name: 'Diapers & Wipes',               slug: 'diapers-wipes',                hsnCode: '9619', gstRate: 18, sortOrder: 4  },
      { name: "Baby & Kids' Clothing",         slug: 'baby-kids-clothing',           hsnCode: '6209', gstRate: 12, sortOrder: 5  },
      { name: 'Toys & Games',                  slug: 'toys-games',                   hsnCode: '9503', gstRate: 12, sortOrder: 6  },
      { name: 'Baby Feeding Accessories',      slug: 'baby-feeding-accessories',     hsnCode: '3924', gstRate: 18, sortOrder: 7  },
      { name: 'Baby Bedding & Nursery',        slug: 'baby-bedding-nursery',         hsnCode: '6302', gstRate: 12, sortOrder: 8  },
      { name: "Kids' Books & Learning",        slug: 'kids-books-learning',          hsnCode: '4901', gstRate: 0,  sortOrder: 9  },
      { name: 'School Supplies',               slug: 'school-supplies',              hsnCode: '4820', gstRate: 12, sortOrder: 10 },
      { name: 'Baby Safety & Health',          slug: 'baby-safety-health',           hsnCode: '3304', gstRate: 18, sortOrder: 11 },
    ],
  },

  // ── 6. Electronics ─────────────────────────────────────────────────────────
  {
    name: 'Electronics',
    slug: 'electronics',
    color: '#374151',
    description: 'Smartphones, laptops, smart home devices and accessories',
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: true,
    showOnShopWidget: true,
    sortOrder: 6,
    children: [
      { name: 'Smartphones & Mobiles',         slug: 'smartphones-mobiles',          hsnCode: '8517', gstRate: 18, sortOrder: 1  },
      { name: 'Laptops & Computers',           slug: 'laptops-computers',            hsnCode: '8471', gstRate: 18, sortOrder: 2  },
      { name: 'Tablets & iPads',               slug: 'tablets-ipads',                hsnCode: '8471', gstRate: 18, sortOrder: 3  },
      { name: 'Televisions',                   slug: 'televisions',                  hsnCode: '8528', gstRate: 18, sortOrder: 4  },
      { name: 'Smart Home Devices',            slug: 'smart-home-devices',           hsnCode: '8543', gstRate: 18, sortOrder: 5  },
      { name: 'Headphones & Speakers',         slug: 'headphones-speakers',          hsnCode: '8518', gstRate: 18, sortOrder: 6  },
      { name: 'Smartwatches & Wearables',      slug: 'smartwatches-wearables',       hsnCode: '9102', gstRate: 18, sortOrder: 7  },
      { name: 'Cameras & Photography',         slug: 'cameras-photography',          hsnCode: '8525', gstRate: 18, sortOrder: 8  },
      { name: 'Power Banks & Chargers',        slug: 'power-banks-chargers',         hsnCode: '8507', gstRate: 18, sortOrder: 9  },
      { name: 'Phone Cases & Accessories',     slug: 'phone-cases-accessories',      hsnCode: '8517', gstRate: 18, sortOrder: 10 },
      { name: 'Printers & Scanners',           slug: 'printers-scanners',            hsnCode: '8443', gstRate: 18, sortOrder: 11 },
      { name: 'Gaming Consoles & Accessories', slug: 'gaming-consoles-accessories',  hsnCode: '9504', gstRate: 18, sortOrder: 12 },
      { name: 'Networking & WiFi',             slug: 'networking-wifi',              hsnCode: '8517', gstRate: 18, sortOrder: 13 },
      { name: 'Large Appliances',              slug: 'large-appliances',             hsnCode: '8418', gstRate: 28, sortOrder: 14 },
    ],
  },

  // ── 7. Fashion & Clothing ──────────────────────────────────────────────────
  {
    name: 'Fashion & Clothing',
    slug: 'fashion-clothing',
    color: '#7c3aed',
    description: "Men's, women's and kids' clothing, footwear and fashion accessories",
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: true,
    showOnShopWidget: true,
    sortOrder: 7,
    children: [
      { name: "Men's Clothing",                slug: 'mens-clothing',                hsnCode: '6203', gstRate: 12, sortOrder: 1  },
      { name: "Women's Clothing",              slug: 'womens-clothing',              hsnCode: '6204', gstRate: 12, sortOrder: 2  },
      { name: "Kids' Clothing",                slug: 'kids-clothing',                hsnCode: '6209', gstRate: 12, sortOrder: 3  },
      { name: 'Ethnic Wear & Sarees',          slug: 'ethnic-wear-sarees',           hsnCode: '6211', gstRate: 12, sortOrder: 4  },
      { name: 'Kurtas & Salwar Suits',         slug: 'kurtas-salwar-suits',          hsnCode: '6211', gstRate: 12, sortOrder: 5  },
      { name: 'Bridal & Wedding Wear',         slug: 'bridal-wedding-wear',          hsnCode: '6211', gstRate: 12, sortOrder: 6  },
      { name: 'Winter Wear & Jackets',         slug: 'winter-wear-jackets',          hsnCode: '6110', gstRate: 12, sortOrder: 7  },
      { name: 'Sportswear & Activewear',       slug: 'sportswear-activewear',        hsnCode: '6211', gstRate: 12, sortOrder: 8  },
      { name: 'Innerwear & Sleepwear',         slug: 'innerwear-sleepwear',          hsnCode: '6108', gstRate: 12, sortOrder: 9  },
      { name: 'Footwear',                      slug: 'footwear',                     hsnCode: '6404', gstRate: 12, sortOrder: 10 },
      { name: 'Bags, Purses & Wallets',        slug: 'bags-purses-wallets',          hsnCode: '4202', gstRate: 18, sortOrder: 11 },
      { name: 'Sunglasses & Eyewear',          slug: 'sunglasses-eyewear',           hsnCode: '9004', gstRate: 18, sortOrder: 12 },
      { name: 'Caps & Hats',                   slug: 'caps-hats',                    hsnCode: '6505', gstRate: 12, sortOrder: 13 },
      { name: 'Scarves & Stoles',              slug: 'scarves-stoles',               hsnCode: '6214', gstRate: 12, sortOrder: 14 },
    ],
  },

  // ── 8. Books & Stationery ──────────────────────────────────────────────────
  {
    name: 'Books & Stationery',
    slug: 'books-stationery',
    color: '#0369a1',
    description: 'Books, educational materials, stationery and art supplies',
    showOnHomepage: false,
    showOnShop: true,
    showOnHeroSidebar: false,
    showOnShopWidget: false,
    sortOrder: 8,
    children: [
      { name: 'Fiction & Novels',              slug: 'fiction-novels',               hsnCode: '4901', gstRate: 0,  sortOrder: 1 },
      { name: 'Educational & Textbooks',       slug: 'educational-textbooks',        hsnCode: '4901', gstRate: 0,  sortOrder: 2 },
      { name: "Children's Books",              slug: 'childrens-books',              hsnCode: '4901', gstRate: 0,  sortOrder: 3 },
      { name: 'Self Help & Motivation',        slug: 'self-help-motivation',         hsnCode: '4901', gstRate: 0,  sortOrder: 4 },
      { name: 'Spiritual & Religious Books',   slug: 'spiritual-religious-books',    hsnCode: '4901', gstRate: 0,  sortOrder: 5 },
      { name: 'Stationery & Supplies',         slug: 'stationery-supplies',          hsnCode: '4820', gstRate: 12, sortOrder: 6 },
      { name: 'Art & Craft Supplies',          slug: 'art-craft-supplies',           hsnCode: '4820', gstRate: 12, sortOrder: 7 },
      { name: 'Pens & Writing Instruments',    slug: 'pens-writing-instruments',     hsnCode: '9608', gstRate: 12, sortOrder: 8 },
      { name: 'Calendars & Planners',          slug: 'calendars-planners',           hsnCode: '4910', gstRate: 12, sortOrder: 9 },
    ],
  },

  // ── 9. Sports & Fitness ────────────────────────────────────────────────────
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    color: '#dc2626',
    description: 'Gym equipment, yoga gear, sports accessories and fitness nutrition',
    showOnHomepage: false,
    showOnShop: true,
    showOnHeroSidebar: false,
    showOnShopWidget: false,
    sortOrder: 9,
    children: [
      { name: 'Gym & Fitness Equipment',       slug: 'gym-fitness-equipment',        hsnCode: '9506', gstRate: 12, sortOrder: 1  },
      { name: 'Yoga & Meditation',             slug: 'yoga-meditation',              hsnCode: '9506', gstRate: 12, sortOrder: 2  },
      { name: 'Cricket Equipment',             slug: 'cricket-equipment',            hsnCode: '9506', gstRate: 12, sortOrder: 3  },
      { name: 'Badminton & Racket Sports',     slug: 'badminton-racket-sports',      hsnCode: '9506', gstRate: 12, sortOrder: 4  },
      { name: 'Football & Team Sports',        slug: 'football-team-sports',         hsnCode: '9506', gstRate: 12, sortOrder: 5  },
      { name: 'Cycling',                       slug: 'cycling',                      hsnCode: '8712', gstRate: 12, sortOrder: 6  },
      { name: 'Swimming',                      slug: 'swimming',                     hsnCode: '9506', gstRate: 12, sortOrder: 7  },
      { name: 'Protein & Sports Nutrition',    slug: 'protein-sports-nutrition',     hsnCode: '2106', gstRate: 18, sortOrder: 8  },
      { name: 'Sports Clothing & Footwear',    slug: 'sports-clothing-footwear',     hsnCode: '6211', gstRate: 12, sortOrder: 9  },
      { name: 'Outdoor & Adventure',           slug: 'outdoor-adventure',            hsnCode: '9506', gstRate: 12, sortOrder: 10 },
    ],
  },

  // ── 10. Agriculture & Gardening ────────────────────────────────────────────
  {
    name: 'Agriculture & Gardening',
    slug: 'agriculture-gardening',
    color: '#4d7c0f',
    description: 'Seeds, organic inputs, gardening tools and farming accessories',
    showOnHomepage: false,
    showOnShop: true,
    showOnHeroSidebar: false,
    showOnShopWidget: false,
    sortOrder: 10,
    children: [
      { name: 'Seeds & Planting Material',     slug: 'seeds-planting-material',      hsnCode: '1209', gstRate: 0,  sortOrder: 1 },
      { name: 'Organic Fertilizers',           slug: 'organic-fertilizers',          hsnCode: '3105', gstRate: 5,  sortOrder: 2 },
      { name: 'Compost & Vermicompost',        slug: 'compost-vermicompost',         hsnCode: '3101', gstRate: 0,  sortOrder: 3 },
      { name: 'Pesticides & Crop Protection',  slug: 'pesticides-crop-protection',   hsnCode: '3808', gstRate: 18, sortOrder: 4 },
      { name: 'Garden Tools & Equipment',      slug: 'garden-tools-equipment',       hsnCode: '8201', gstRate: 12, sortOrder: 5 },
      { name: 'Pots, Planters & Grow Bags',    slug: 'pots-planters-grow-bags',      hsnCode: '6914', gstRate: 12, sortOrder: 6 },
      { name: 'Irrigation & Watering',         slug: 'irrigation-watering',          hsnCode: '8424', gstRate: 18, sortOrder: 7 },
      { name: 'Soil & Growing Media',          slug: 'soil-growing-media',           hsnCode: '3105', gstRate: 5,  sortOrder: 8 },
      { name: 'Farm Machinery (Small)',         slug: 'farm-machinery-small',         hsnCode: '8432', gstRate: 12, sortOrder: 9 },
    ],
  },

  // ── 11. Jewellery & Accessories ────────────────────────────────────────────
  {
    name: 'Jewellery & Accessories',
    slug: 'jewellery-accessories',
    color: '#b45309',
    description: 'Gold, silver, fashion jewellery, watches and accessories',
    showOnHomepage: true,
    showOnShop: true,
    showOnHeroSidebar: false,
    showOnShopWidget: true,
    sortOrder: 11,
    children: [
      { name: 'Gold Jewellery',                slug: 'gold-jewellery',               hsnCode: '7113', gstRate: 3,  sortOrder: 1  },
      { name: 'Silver Jewellery',              slug: 'silver-jewellery',             hsnCode: '7113', gstRate: 3,  sortOrder: 2  },
      { name: 'Diamond & Gemstone Jewellery',  slug: 'diamond-gemstone-jewellery',   hsnCode: '7113', gstRate: 3,  sortOrder: 3  },
      { name: 'Fashion & Imitation Jewellery', slug: 'fashion-imitation-jewellery',  hsnCode: '7117', gstRate: 3,  sortOrder: 4  },
      { name: 'Watches & Clocks',              slug: 'watches-clocks',               hsnCode: '9102', gstRate: 18, sortOrder: 5  },
      { name: 'Bangles & Bracelets',           slug: 'bangles-bracelets',            hsnCode: '7117', gstRate: 3,  sortOrder: 6  },
      { name: 'Necklaces & Chains',            slug: 'necklaces-chains',             hsnCode: '7113', gstRate: 3,  sortOrder: 7  },
      { name: 'Earrings & Studs',              slug: 'earrings-studs',               hsnCode: '7113', gstRate: 3,  sortOrder: 8  },
      { name: 'Rings & Toe Rings',             slug: 'rings-toe-rings',              hsnCode: '7113', gstRate: 3,  sortOrder: 9  },
      { name: 'Anklets & Payals',              slug: 'anklets-payals',               hsnCode: '7113', gstRate: 3,  sortOrder: 10 },
    ],
  },

  // ── 12. Pet Care ───────────────────────────────────────────────────────────
  {
    name: 'Pet Care',
    slug: 'pet-care',
    color: '#0891b2',
    description: 'Pet food, grooming, accessories and health products for all pets',
    showOnHomepage: false,
    showOnShop: true,
    showOnHeroSidebar: false,
    showOnShopWidget: false,
    sortOrder: 12,
    children: [
      { name: 'Dog Food & Treats',             slug: 'dog-food-treats',              hsnCode: '2309', gstRate: 5,  sortOrder: 1 },
      { name: 'Cat Food & Treats',             slug: 'cat-food-treats',              hsnCode: '2309', gstRate: 5,  sortOrder: 2 },
      { name: 'Bird & Small Animal Food',      slug: 'bird-small-animal-food',       hsnCode: '2309', gstRate: 5,  sortOrder: 3 },
      { name: 'Pet Grooming Products',         slug: 'pet-grooming-products',        hsnCode: '3307', gstRate: 18, sortOrder: 4 },
      { name: 'Pet Accessories & Toys',        slug: 'pet-accessories-toys',         hsnCode: '4201', gstRate: 18, sortOrder: 5 },
      { name: 'Pet Health & Medicines',        slug: 'pet-health-medicines',         hsnCode: '3004', gstRate: 12, sortOrder: 6 },
      { name: 'Aquarium & Fish Supplies',      slug: 'aquarium-fish-supplies',       hsnCode: '3926', gstRate: 18, sortOrder: 7 },
    ],
  },

  // ── 13. Office Supplies ────────────────────────────────────────────────────
  {
    name: 'Office Supplies',
    slug: 'office-supplies',
    color: '#0f766e',
    description: 'Office stationery, furniture, electronics and organisation products',
    showOnHomepage: false,
    showOnShop: true,
    showOnHeroSidebar: false,
    showOnShopWidget: false,
    sortOrder: 13,
    children: [
      { name: 'Paper & Printing Supplies',     slug: 'paper-printing-supplies',      hsnCode: '4802', gstRate: 12, sortOrder: 1 },
      { name: 'Pens & Markers',                slug: 'pens-markers',                 hsnCode: '9608', gstRate: 12, sortOrder: 2 },
      { name: 'Notebooks & Diaries',           slug: 'notebooks-diaries',            hsnCode: '4820', gstRate: 12, sortOrder: 3 },
      { name: 'Filing & Document Storage',     slug: 'filing-document-storage',      hsnCode: '4820', gstRate: 12, sortOrder: 4 },
      { name: 'Office Furniture',              slug: 'office-furniture',             hsnCode: '9403', gstRate: 18, sortOrder: 5 },
      { name: 'Whiteboards & Notice Boards',   slug: 'whiteboards-notice-boards',    hsnCode: '9403', gstRate: 18, sortOrder: 6 },
      { name: 'Toners & Ink Cartridges',       slug: 'toners-ink-cartridges',        hsnCode: '8443', gstRate: 18, sortOrder: 7 },
    ],
  },
];

module.exports = { CATEGORIES };
