#!/usr/bin/env node
/**
 * Idempotent seed: Indian GST tax rates + common HSN codes
 * Run: node scripts/gst-seed.js
 */

const { Client } = require("pg");

const TAX_RATES = [
  { name: "Exempt (0%)",    totalRate: 0,    cgstRate: 0,   sgstRate: 0,   igstRate: 0,    cessRate: 0, description: "Essential goods exempt from GST", sortOrder: 1 },
  { name: "GST 0.25%",      totalRate: 25,   cgstRate: 12,  sgstRate: 12,  igstRate: 25,   cessRate: 0, description: "Cut and semi-polished stones (0.25%)", sortOrder: 2 },
  { name: "GST 1.5%",       totalRate: 150,  cgstRate: 75,  sgstRate: 75,  igstRate: 150,  cessRate: 0, description: "Cut, polished diamonds, gems", sortOrder: 3 },
  { name: "GST 3%",         totalRate: 300,  cgstRate: 150, sgstRate: 150, igstRate: 300,  cessRate: 0, description: "Gold, silver jewellery, coin", sortOrder: 4 },
  { name: "GST 5%",         totalRate: 500,  cgstRate: 250, sgstRate: 250, igstRate: 500,  cessRate: 0, description: "Essential food items, transport services", sortOrder: 5 },
  { name: "GST 12%",        totalRate: 1200, cgstRate: 600, sgstRate: 600, igstRate: 1200, cessRate: 0, description: "Processed foods, phones, agarbatti", sortOrder: 6 },
  { name: "GST 18%",        totalRate: 1800, cgstRate: 900, sgstRate: 900, igstRate: 1800, cessRate: 0, description: "Most manufactured goods, IT services, telecom", sortOrder: 7 },
  { name: "GST 28%",        totalRate: 2800, cgstRate: 1400,sgstRate: 1400,igstRate: 2800, cessRate: 0, description: "Luxury goods, vehicles, tobacco products", sortOrder: 8 },
  { name: "GST 28% + Cess", totalRate: 2800, cgstRate: 1400,sgstRate: 1400,igstRate: 2800, cessRate: 1500, description: "Tobacco, pan masala, aerated drinks with cess", sortOrder: 9 },
];

// HSN codes with their default GST rate (index into TAX_RATES by name)
const HSN_CODES = [
  // Chapter 01-05: Animal products
  { code: "0101", description: "Live horses, donkeys, mules", chapter: "01", taxRateName: "Exempt (0%)" },
  { code: "0201", description: "Meat of bovine animals, fresh or chilled", chapter: "02", taxRateName: "Exempt (0%)" },
  { code: "0301", description: "Live fish", chapter: "03", taxRateName: "Exempt (0%)" },
  { code: "0401", description: "Milk and cream, not concentrated", chapter: "04", taxRateName: "Exempt (0%)" },
  { code: "0402", description: "Milk and cream, concentrated or sweetened", chapter: "04", taxRateName: "GST 5%" },
  { code: "0405", description: "Butter, ghee, dairy fat and cheese", chapter: "04", taxRateName: "GST 12%" },
  { code: "0406", description: "Cheese and curd", chapter: "04", taxRateName: "GST 12%" },
  { code: "0409", description: "Natural honey", chapter: "04", taxRateName: "GST 5%" },
  { code: "0501", description: "Human hair, animal hair", chapter: "05", taxRateName: "Exempt (0%)" },

  // Chapter 06-14: Vegetable products
  { code: "0601", description: "Bulbs, tubers, corms, live plants", chapter: "06", taxRateName: "GST 5%" },
  { code: "0701", description: "Potatoes, fresh or chilled", chapter: "07", taxRateName: "Exempt (0%)" },
  { code: "0702", description: "Tomatoes, fresh or chilled", chapter: "07", taxRateName: "Exempt (0%)" },
  { code: "0703", description: "Onions, shallots, garlic, leeks", chapter: "07", taxRateName: "Exempt (0%)" },
  { code: "0704", description: "Cabbages, cauliflowers, broccoli (fresh)", chapter: "07", taxRateName: "Exempt (0%)" },
  { code: "0706", description: "Carrots, turnips, radishes (fresh)", chapter: "07", taxRateName: "Exempt (0%)" },
  { code: "0709", description: "Other vegetables, fresh or chilled", chapter: "07", taxRateName: "Exempt (0%)" },
  { code: "0710", description: "Vegetables (frozen)", chapter: "07", taxRateName: "GST 5%" },
  { code: "0714", description: "Manioc, sweet potatoes, yams, fresh", chapter: "07", taxRateName: "Exempt (0%)" },
  { code: "0801", description: "Coconuts, Brazil nuts, cashew nuts", chapter: "08", taxRateName: "Exempt (0%)" },
  { code: "0802", description: "Almonds, hazelnuts, walnuts, pistachios", chapter: "08", taxRateName: "Exempt (0%)" },
  { code: "0803", description: "Bananas, plantains", chapter: "08", taxRateName: "Exempt (0%)" },
  { code: "0901", description: "Coffee (roasted)", chapter: "09", taxRateName: "GST 5%" },
  { code: "0902", description: "Tea (green, black, other)", chapter: "09", taxRateName: "GST 5%" },
  { code: "0904", description: "Pepper, dried or ground", chapter: "09", taxRateName: "GST 5%" },
  { code: "0906", description: "Cinnamon and cinnamon-tree flowers", chapter: "09", taxRateName: "GST 5%" },
  { code: "0908", description: "Nutmeg, mace, cardamoms", chapter: "09", taxRateName: "GST 5%" },
  { code: "0910", description: "Ginger, saffron, turmeric, curry powder", chapter: "09", taxRateName: "GST 5%" },
  { code: "1001", description: "Wheat and meslin", chapter: "10", taxRateName: "Exempt (0%)" },
  { code: "1006", description: "Rice", chapter: "10", taxRateName: "Exempt (0%)" },
  { code: "1101", description: "Wheat or meslin flour", chapter: "11", taxRateName: "Exempt (0%)" },
  { code: "1201", description: "Soya beans", chapter: "12", taxRateName: "Exempt (0%)" },
  { code: "1211", description: "Plants and parts used in pharmacy/perfumery", chapter: "12", taxRateName: "GST 5%" },
  { code: "1301", description: "Lac, shellac, natural gums and resins", chapter: "13", taxRateName: "GST 5%" },

  // Chapter 15: Animal/vegetable fats and oils
  { code: "1501", description: "Pig fat, lard", chapter: "15", taxRateName: "GST 12%" },
  { code: "1507", description: "Soya-bean oil", chapter: "15", taxRateName: "GST 5%" },
  { code: "1511", description: "Palm oil", chapter: "15", taxRateName: "GST 5%" },
  { code: "1513", description: "Coconut (copra) oil, palm kernel oil", chapter: "15", taxRateName: "GST 18%" },
  { code: "1514", description: "Rapeseed, mustard oil", chapter: "15", taxRateName: "GST 5%" },
  { code: "1516", description: "Hydrogenated animal/vegetable fats (vanaspati)", chapter: "15", taxRateName: "GST 5%" },
  { code: "1517", description: "Margarine, edible mixtures of fats", chapter: "15", taxRateName: "GST 12%" },

  // Chapter 16-24: Prepared foods
  { code: "1601", description: "Sausages and similar products of meat", chapter: "16", taxRateName: "GST 12%" },
  { code: "1701", description: "Cane or beet sugar, raw", chapter: "17", taxRateName: "GST 5%" },
  { code: "1702", description: "Other sugars, caramel, glucose syrup", chapter: "17", taxRateName: "GST 18%" },
  { code: "1704", description: "Sugar confectionery (incl. white chocolate)", chapter: "17", taxRateName: "GST 18%" },
  { code: "1801", description: "Cocoa beans, whole or broken", chapter: "18", taxRateName: "GST 5%" },
  { code: "1806", description: "Chocolate and other cocoa preparations", chapter: "18", taxRateName: "GST 18%" },
  { code: "1901", description: "Malt extract, food preparations of flour", chapter: "19", taxRateName: "GST 18%" },
  { code: "1902", description: "Pasta, noodles, couscous", chapter: "19", taxRateName: "GST 18%" },
  { code: "1905", description: "Bread, pastry, cakes, biscuits", chapter: "19", taxRateName: "GST 18%" },
  { code: "2001", description: "Vegetables, fruit, nuts prepared in vinegar", chapter: "20", taxRateName: "GST 12%" },
  { code: "2009", description: "Fruit juices, vegetable juices", chapter: "20", taxRateName: "GST 12%" },
  { code: "2101", description: "Extracts of coffee, tea; chicory", chapter: "21", taxRateName: "GST 18%" },
  { code: "2103", description: "Sauces, mixed condiments, mustard", chapter: "21", taxRateName: "GST 12%" },
  { code: "2104", description: "Soups, broths; homogenised food", chapter: "21", taxRateName: "GST 18%" },
  { code: "2106", description: "Food preparations NEC (protein concentrates, dry mix)", chapter: "21", taxRateName: "GST 18%" },
  { code: "2201", description: "Waters (mineral, aerated), ice and snow", chapter: "22", taxRateName: "GST 18%" },
  { code: "2202", description: "Soft drinks, lemonade, energy drinks", chapter: "22", taxRateName: "GST 28% + Cess" },
  { code: "2402", description: "Cigars, cigarettes, tobacco products", chapter: "24", taxRateName: "GST 28% + Cess" },

  // Chapter 25-27: Mineral products
  { code: "2501", description: "Salt, pure sodium chloride", chapter: "25", taxRateName: "Exempt (0%)" },
  { code: "2523", description: "Portland cement, aluminous cement", chapter: "25", taxRateName: "GST 28%" },

  // Chapter 28-38: Chemicals
  { code: "2835", description: "Phosphinates, phosphonates, phosphates", chapter: "28", taxRateName: "GST 18%" },
  { code: "3301", description: "Essential oils, resinoids", chapter: "33", taxRateName: "GST 18%" },
  { code: "3303", description: "Perfumes and toilet waters", chapter: "33", taxRateName: "GST 18%" },
  { code: "3304", description: "Beauty/make-up preparations, skin care", chapter: "33", taxRateName: "GST 18%" },
  { code: "3305", description: "Preparations for hair", chapter: "33", taxRateName: "GST 18%" },
  { code: "3306", description: "Oral/dental hygiene preparations", chapter: "33", taxRateName: "GST 18%" },
  { code: "3307", description: "Shaving preparations, deodorants, incense", chapter: "33", taxRateName: "GST 18%" },
  { code: "3401", description: "Soap, detergent bars, wash preparations", chapter: "34", taxRateName: "GST 18%" },
  { code: "3402", description: "Washing preparations, cleaning agents", chapter: "34", taxRateName: "GST 18%" },
  { code: "3808", description: "Insecticides, rodenticides, disinfectants", chapter: "38", taxRateName: "GST 18%" },

  // Chapter 39-40: Plastics, rubber
  { code: "3923", description: "Articles for packing goods, plastic", chapter: "39", taxRateName: "GST 18%" },
  { code: "4011", description: "New pneumatic tyres, rubber", chapter: "40", taxRateName: "GST 28%" },

  // Chapter 48-49: Paper products, books
  { code: "4802", description: "Uncoated paper and paperboard", chapter: "48", taxRateName: "GST 12%" },
  { code: "4901", description: "Printed books, brochures, leaflets", chapter: "49", taxRateName: "Exempt (0%)" },
  { code: "4902", description: "Newspapers, journals, periodicals", chapter: "49", taxRateName: "Exempt (0%)" },

  // Chapter 61-63: Textiles
  { code: "6101", description: "Overcoats, car-coats, capes (men)", chapter: "61", taxRateName: "GST 12%" },
  { code: "6109", description: "T-shirts, singlets, other vests (knitted)", chapter: "61", taxRateName: "GST 12%" },
  { code: "6201", description: "Overcoats, windcheaters (men, woven)", chapter: "62", taxRateName: "GST 12%" },
  { code: "6211", description: "Track suits, ski suits, swimwear", chapter: "62", taxRateName: "GST 12%" },
  { code: "6301", description: "Blankets and travelling rugs", chapter: "63", taxRateName: "GST 12%" },
  { code: "6302", description: "Bed linen, table linen, bath linen", chapter: "63", taxRateName: "GST 12%" },

  // Chapter 64: Footwear
  { code: "6401", description: "Waterproof footwear", chapter: "64", taxRateName: "GST 12%" },
  { code: "6403", description: "Footwear with outer soles of rubber (leather uppers)", chapter: "64", taxRateName: "GST 18%" },

  // Chapter 71: Jewellery
  { code: "7101", description: "Natural pearls, cultured pearls", chapter: "71", taxRateName: "GST 3%" },
  { code: "7108", description: "Gold (unwrought, semi-manufactured)", chapter: "71", taxRateName: "GST 3%" },
  { code: "7113", description: "Articles of jewellery, gold/silver", chapter: "71", taxRateName: "GST 3%" },

  // Chapter 84-85: Machinery and electronics
  { code: "8414", description: "Air/vacuum pumps, fans, AC compressors", chapter: "84", taxRateName: "GST 18%" },
  { code: "8415", description: "Air conditioning machines", chapter: "84", taxRateName: "GST 28%" },
  { code: "8443", description: "Printing machinery, printers", chapter: "84", taxRateName: "GST 18%" },
  { code: "8450", description: "Washing machines, household type", chapter: "84", taxRateName: "GST 28%" },
  { code: "8471", description: "Automatic data processing machines (computers)", chapter: "84", taxRateName: "GST 18%" },
  { code: "8517", description: "Telephone sets, smartphones", chapter: "85", taxRateName: "GST 18%" },
  { code: "8518", description: "Microphones, loudspeakers, amplifiers, headphones", chapter: "85", taxRateName: "GST 18%" },
  { code: "8519", description: "Sound recording/reproducing apparatus", chapter: "85", taxRateName: "GST 18%" },
  { code: "8523", description: "Discs, tapes, USBs for recording", chapter: "85", taxRateName: "GST 18%" },
  { code: "8528", description: "Monitors and projectors, TVs", chapter: "85", taxRateName: "GST 28%" },
  { code: "8540", description: "Thermionic valves, CRT", chapter: "85", taxRateName: "GST 28%" },

  // Chapter 87: Vehicles
  { code: "8703", description: "Motor cars and other passenger vehicles", chapter: "87", taxRateName: "GST 28%" },
  { code: "8711", description: "Motorcycles and cycles with engine", chapter: "87", taxRateName: "GST 28%" },

  // Chapter 94: Furniture
  { code: "9401", description: "Seats (chairs, sofas)", chapter: "94", taxRateName: "GST 18%" },
  { code: "9403", description: "Other furniture (wooden, metal, plastic)", chapter: "94", taxRateName: "GST 18%" },
  { code: "9404", description: "Mattress supports, mattresses, sleeping bags", chapter: "94", taxRateName: "GST 18%" },

  // Chapter 95-96: Toys, sports, misc
  { code: "9503", description: "Tricycles, scooters, pedal cars, toys", chapter: "95", taxRateName: "GST 12%" },
  { code: "9504", description: "Video games, playing cards, billiards", chapter: "95", taxRateName: "GST 18%" },
  { code: "9506", description: "Equipment for sports, gymnastics, athletics", chapter: "95", taxRateName: "GST 12%" },
  { code: "9607", description: "Slide fasteners, zip", chapter: "96", taxRateName: "GST 18%" },
];

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Seed tax rates
    console.log("Seeding tax rates...");
    const taxRateIdMap = {};
    for (const rate of TAX_RATES) {
      const existing = await client.query(
        "SELECT id FROM tax_rates WHERE name = $1",
        [rate.name]
      );
      if (existing.rows.length > 0) {
        taxRateIdMap[rate.name] = existing.rows[0].id;
        console.log(`  Tax rate "${rate.name}" already exists (id=${existing.rows[0].id})`);
      } else {
        const res = await client.query(
          `INSERT INTO tax_rates (name, total_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, description, is_active, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8) RETURNING id`,
          [rate.name, rate.totalRate, rate.cgstRate, rate.sgstRate, rate.igstRate, rate.cessRate, rate.description, rate.sortOrder]
        );
        taxRateIdMap[rate.name] = res.rows[0].id;
        console.log(`  ✓ Inserted "${rate.name}" → id=${res.rows[0].id}`);
      }
    }

    // Seed HSN codes
    console.log("\nSeeding HSN codes...");
    let inserted = 0, skipped = 0;
    for (const hsn of HSN_CODES) {
      const existing = await client.query("SELECT id FROM hsn_codes WHERE code = $1", [hsn.code]);
      if (existing.rows.length > 0) { skipped++; continue; }

      const taxRateId = taxRateIdMap[hsn.taxRateName] ?? null;
      await client.query(
        `INSERT INTO hsn_codes (code, description, chapter, tax_rate_id, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [hsn.code, hsn.description, hsn.chapter, taxRateId]
      );
      inserted++;
    }
    console.log(`  ✓ Inserted ${inserted} HSN codes, ${skipped} already existed`);

    console.log("\n✅ GST seed complete.");
  } finally {
    await client.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
