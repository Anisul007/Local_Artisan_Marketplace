// server/src/seed/vendors-and-listings.seed.js
import "dotenv/config.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import VendorProfile from "../models/VendorProfile.js";
import Listing from "../models/Listing.js";
import Category from "../models/Category.js";

const SEED_PASSWORD = "Password1";

const CATEGORY_DATA = [
  { name: "Accessories", slug: "accessories", path: "accessories" },
  { name: "Art & Prints", slug: "art-prints", path: "art-prints" },
  { name: "Body & Beauty", slug: "body-beauty", path: "body-beauty" },
  { name: "Fashion", slug: "fashion", path: "fashion" },
  { name: "Home", slug: "home", path: "home" },
  { name: "Jewellery", slug: "jewellery", path: "jewellery" },
  { name: "Kids", slug: "kids", path: "kids" },
  { name: "Occasion", slug: "occasion", path: "occasion" },
  { name: "Pantry", slug: "pantry", path: "pantry" },
  { name: "Pets", slug: "pets", path: "pets" },
];

const PLACEHOLDER_IMAGE = "https://placehold.co/600x600/e9d5ff/6d28d9?text=Handmade";

const VENDORS = [
  // —— Elena's Ceramics ——
  {
    user: {
      firstName: "Elena",
      lastName: "Russo",
      email: "elena.russo@artisan.demo",
      username: "elenarusso",
      role: "vendor",
      businessName: "Elena's Ceramics",
      phone: "+61 412 345 678",
      website: "https://elenasceramics.demo",
      bio: "Handcrafted stoneware and porcelain in Melbourne. Every piece is wheel-thrown and glazed by hand. Sustainable, lead-free glazes.",
      address: { line1: "12 Potter Lane", city: "Melbourne", state: "VIC", postcode: "3000", country: "AU" },
      primaryCategories: ["home", "art-prints"],
    },
    listings: [
      { title: "Hand-Thrown Ceramic Vase – Terracotta", description: "A beautiful wheel-thrown vase in warm terracotta with a matte glaze. Perfect for a single stem or dried flowers. Approx 22cm height. Food-safe glaze, dishwasher safe. Made in Melbourne.", priceCents: 8500, categorySlug: "home", slug: "hand-thrown-ceramic-vase-terracotta", imageUrl: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=800&q=80" },
      { title: "Set of 4 Stoneware Coffee Mugs", description: "Set of four handcrafted mugs in speckled grey stoneware. Comfortable to hold, microwave and dishwasher safe. Each mug holds 320ml. Slight variations make each one unique.", priceCents: 12000, categorySlug: "home", slug: "set-of-4-stoneware-coffee-mugs", imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80" },
      { title: "Small Ceramic Bowl – Speckled White", description: "Hand-thrown small bowl ideal for dips, nuts or jewellery. Speckled white glaze, food-safe. Approx 12cm diameter. Perfect gift for a minimalist home.", priceCents: 4200, categorySlug: "home", slug: "small-ceramic-bowl-speckled-white", imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80" },
      { title: "Large Serving Platter – Ocean Glaze", description: "Stunning handcrafted platter with an ocean-blue glaze. Perfect for cheese, charcuterie or bread. Approx 38cm. Lead-free, food-safe. A centrepiece for the table.", priceCents: 18500, categorySlug: "home", slug: "large-serving-platter-ocean-glaze", imageUrl: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?w=800&q=80" },
      { title: "Ceramic Incense Holder – Sand Speckle", description: "Minimal incense holder in sand speckle glaze. Catches ash neatly and looks beautiful on a bedside table. Approx 14cm. Handcrafted in small batches.", priceCents: 3200, categorySlug: "home", slug: "ceramic-incense-holder-sand-speckle", imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80" },
    ],
  },
  // —— Webb Leather Co ——
  {
    user: {
      firstName: "Marcus",
      lastName: "Webb",
      email: "marcus.webb@artisan.demo",
      username: "marcuswebb",
      role: "vendor",
      businessName: "Webb Leather Co",
      phone: "+61 423 456 789",
      website: "https://webbleather.demo",
      bio: "Small-batch leather goods from the Blue Mountains. Belts, wallets, and bags made with full-grain leather and solid brass hardware.",
      address: { line1: "5 Craft Road", city: "Katoomba", state: "NSW", postcode: "2780", country: "AU" },
      primaryCategories: ["fashion", "accessories"],
    },
    listings: [
      { title: "Full-Grain Leather Belt – Natural", description: "Hand-cut and hand-finished belt in vegetable-tanned natural leather. Brass buckle, 36mm width. Sizes 80–110cm. Ages beautifully with use and develops a rich patina over time.", priceCents: 12900, categorySlug: "fashion", slug: "full-grain-leather-belt-natural", imageUrl: "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80" },
      { title: "Minimalist Leather Card Holder", description: "Slim card holder with two card slots and a central pocket for notes. Made from Italian vegetable-tanned leather. Fits up to 6 cards. Perfect everyday carry.", priceCents: 5900, categorySlug: "accessories", slug: "minimalist-leather-card-holder", imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&q=80" },
      { title: "Leather Crossbody Bag – Chestnut", description: "Compact crossbody bag in full-grain chestnut leather. Adjustable strap, inner zip pocket. Hand-stitched. Fits phone, wallet and keys. Timeless everyday bag.", priceCents: 18900, categorySlug: "accessories", slug: "leather-crossbody-bag-chestnut", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80" },
      { title: "Leather Key Fob – Brass Ring", description: "Simple key fob in vegetable-tanned leather with a solid brass ring. Keeps keys tidy and adds a touch of craft to your pocket. Multiple colour options.", priceCents: 2900, categorySlug: "accessories", slug: "leather-key-fob-brass-ring", imageUrl: "https://images.unsplash.com/photo-1526178613552-2b45c6c302f0?w=800&q=80" },
      { title: "Leather Wallet – Slim Bifold", description: "Slim bifold wallet in full-grain leather with 6 card slots and a notes compartment. Hand-burnished edges and waxed thread stitching. Built for everyday use.", priceCents: 9900, categorySlug: "accessories", slug: "leather-wallet-slim-bifold", imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80" },
      { title: "Canvas & Leather Tote – Olive", description: "Everyday tote with sturdy canvas body and leather handles. Internal pocket for keys/phone. Comfortable shoulder carry and durable enough for markets and work.", priceCents: 16900, categorySlug: "fashion", slug: "canvas-leather-tote-olive", imageUrl: "https://images.unsplash.com/photo-1520975958225-1a37b9f4f09c?w=800&q=80" },
    ],
  },
  // —— Priya's Jewellery Studio ——
  {
    user: {
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@artisan.demo",
      username: "priyasharma",
      role: "vendor",
      businessName: "Priya's Jewellery Studio",
      phone: "+61 434 567 890",
      website: "https://priyajewellery.demo",
      bio: "Contemporary jewellery from Sydney. Sterling silver and recycled metals, often combined with natural stones. Each piece is designed and made in-house.",
      address: { line1: "88 Design Way", city: "Sydney", state: "NSW", postcode: "2000", country: "AU" },
      primaryCategories: ["jewellery", "fashion"],
    },
    listings: [
      { title: "Sterling Silver Hoop Earrings – Medium", description: "Classic hoop earrings in sterling silver, 25mm diameter. Lightweight and comfortable for all-day wear. Hypoallergenic, nickel-free. Presented in a small gift box.", priceCents: 6500, categorySlug: "jewellery", slug: "sterling-silver-hoop-earrings-medium", imageUrl: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80" },
      { title: "Labradorite Pendant on Silver Chain", description: "A single labradorite cabochon set in sterling silver, on a 45cm sterling silver chain. Labradorite shows a beautiful blue flash. Chain length adjustable. Gift-ready packaging.", priceCents: 8900, categorySlug: "jewellery", slug: "labradorite-pendant-silver-chain", imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
      { title: "Stacking Rings Set – Mixed Finish", description: "Set of three thin sterling silver stacking rings: one polished, one brushed, one with a subtle hammered texture. Wear together or alone. Sizes 54–62 (AU M–S).", priceCents: 7200, categorySlug: "jewellery", slug: "stacking-rings-set-mixed-finish", imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
      { title: "Gold-Filled Drop Earrings – Small", description: "Elegant drop earrings in gold-filled wire with a tiny freshwater pearl. Lightweight and versatile. Hypoallergenic. Gift box included.", priceCents: 4800, categorySlug: "jewellery", slug: "gold-filled-drop-earrings-small", imageUrl: "https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=800&q=80" },
      { title: "Beaded Bracelet – Earth Tones", description: "Hand-strung bracelet with natural stone beads and sterling silver clasp. Earth tones: amber, carnelian, and wood. One size fits most. Made to order in Sydney.", priceCents: 5500, categorySlug: "jewellery", slug: "beaded-bracelet-earth-tones", imageUrl: "https://images.unsplash.com/photo-1617038260897-41a1f14a0f18?w=800&q=80" },
    ],
  },
  // —— Wild Honey Co (Pantry) ——
  {
    user: {
      firstName: "James",
      lastName: "Ng",
      email: "james.ng@artisan.demo",
      username: "jamesng",
      role: "vendor",
      businessName: "Wild Honey Co",
      phone: "+61 445 678 901",
      website: "https://wildhoneyco.demo",
      bio: "Single-origin honey and small-batch preserves from regional NSW. We work with local beekeepers and growers. No additives, just real food.",
      address: { line1: "22 Hive Road", city: "Orange", state: "NSW", postcode: "2800", country: "AU" },
      primaryCategories: ["pantry", "home"],
    },
    listings: [
      { title: "Orange Blossom Honey – 500g Jar", description: "Single-origin honey from Orange region. Light, floral and perfect for tea or toast. Raw and unfiltered. Glass jar, recyclable. Shelf life 12+ months when stored cool.", priceCents: 1800, categorySlug: "pantry", slug: "orange-blossom-honey-500g", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80" },
      { title: "Strawberry & Rhubarb Jam – 280g", description: "Small-batch jam made with local strawberries and rhubarb. No artificial colours or flavours. Perfect with scones or yoghurt. Refrigerate after opening.", priceCents: 1200, categorySlug: "pantry", slug: "strawberry-rhubarb-jam-280g", imageUrl: "https://images.unsplash.com/photo-1568909344668-6f14a01f72a6?w=800&q=80" },
      { title: "Bush Honey – 250g Squeeze Bottle", description: "Australian bush honey from native flora. Rich, dark and distinctive. Squeeze bottle for easy drizzling. Ideal for baking and glazes.", priceCents: 1400, categorySlug: "pantry", slug: "bush-honey-250g-squeeze", imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc5003?w=800&q=80" },
      { title: "Lemon Myrtle Shortbread – 180g", description: "Buttery shortbread made in small batches with Australian lemon myrtle. Crisp, fragrant and perfect with tea. Packed in a recyclable kraft box.", priceCents: 1100, categorySlug: "pantry", slug: "lemon-myrtle-shortbread-180g", imageUrl: "https://images.unsplash.com/photo-1519869325930-281384150729?w=800&q=80" },
      { title: "Chilli Lime Marmalade – 280g", description: "Bright citrus marmalade with a gentle chilli warmth. Delicious with cheese, grilled chicken, or toasted sourdough. Handmade, no preservatives.", priceCents: 1300, categorySlug: "pantry", slug: "chilli-lime-marmalade-280g", imageUrl: "https://images.unsplash.com/photo-1514996937319-344454492b37?w=800&q=80" },
    ],
  },
  // —— Little Folk Co (Kids) ——
  {
    user: {
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah.chen@artisan.demo",
      username: "sarahchen",
      role: "vendor",
      businessName: "Little Folk Co",
      phone: "+61 456 789 012",
      website: "https://littlefolkco.demo",
      bio: "Handmade wooden toys and soft dolls for little ones. Safe, non-toxic finishes. Designed in Brisbane and made in small batches for quality and durability.",
      address: { line1: "7 Play Street", city: "Brisbane", state: "QLD", postcode: "4000", country: "AU" },
      primaryCategories: ["kids", "home"],
    },
    listings: [
      { title: "Wooden Rainbow Stacker", description: "Classic rainbow stacker in sustainably sourced timber. Non-toxic, child-safe oil finish. Six arches for stacking and building. Ages 12 months+. Made in Australia.", priceCents: 4500, categorySlug: "kids", slug: "wooden-rainbow-stacker", imageUrl: "https://images.unsplash.com/photo-1607753724987-727c2d76f8fd?w=800&q=80" },
      { title: "Handmade Doll – Blonde with Dress", description: "Soft-bodied doll with embroidered face and hand-sewn dress. Hypoallergenic stuffing. Approx 35cm. Perfect first doll. Washable cover.", priceCents: 6200, categorySlug: "kids", slug: "handmade-doll-blonde-dress", imageUrl: "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=800&q=80" },
      { title: "Wooden Train Set – 12 Pieces", description: "Simple wooden train set with engine, carriages and tracks. Smooth sanded, safe for teething. Fits standard wooden railway. Ages 2+. Gift box available.", priceCents: 8900, categorySlug: "kids", slug: "wooden-train-set-12-pieces", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80" },
      { title: "Felt Storybook Set – Forest Friends", description: "A felt play set with forest animals and a fold-out scene. Encourages imaginative play and storytelling. Handmade details, safe for ages 3+.", priceCents: 5400, categorySlug: "kids", slug: "felt-storybook-set-forest-friends", imageUrl: "https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80" },
      { title: "Wooden Alphabet Blocks – Set of 20", description: "Chunky wooden alphabet blocks with engraved letters and icons. Smooth sanded, non-toxic finish. Great for learning and stacking. Ages 18 months+.", priceCents: 5200, categorySlug: "kids", slug: "wooden-alphabet-blocks-set-20", imageUrl: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&q=80" },
    ],
  },
  // —— Wick & Co (Body & Beauty) ——
  {
    user: {
      firstName: "Mia",
      lastName: "Taylor",
      email: "mia.taylor@artisan.demo",
      username: "miataylor",
      role: "vendor",
      businessName: "Wick & Co",
      phone: "+61 467 890 123",
      website: "https://wickandco.demo",
      bio: "Soy wax candles and natural soap from the Adelaide Hills. Essential oils and botanical ingredients. No parabens or synthetic fragrances. Slow, small-batch production.",
      address: { line1: "3 Candle Lane", city: "Adelaide", state: "SA", postcode: "5000", country: "AU" },
      primaryCategories: ["body-beauty", "home"],
    },
    listings: [
      { title: "Lavender & Eucalyptus Soy Candle – 200g", description: "Soy wax candle with lavender and eucalyptus essential oils. Approx 40-hour burn. Recyclable tin. Hand-poured in Adelaide. Calming and fresh.", priceCents: 3200, categorySlug: "body-beauty", slug: "lavender-eucalyptus-soy-candle-200g", imageUrl: "https://images.unsplash.com/photo-1608571423539-e951b9b3871e?w=800&q=80" },
      { title: "Natural Bar Soap – Oat & Honey", description: "Gentle bar soap with colloidal oatmeal and local honey. Suitable for sensitive skin. No SLS. Approx 100g per bar. Lasts 3–4 weeks with daily use.", priceCents: 950, categorySlug: "body-beauty", slug: "natural-bar-soap-oat-honey", imageUrl: "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=800&q=80" },
      { title: "Gift Set – Candle & Soap Duo", description: "One Lavender & Eucalyptus candle (200g) and one Oat & Honey soap. Presented in a recyclable gift box. Perfect for a housewarming or thank-you.", priceCents: 4200, categorySlug: "body-beauty", slug: "gift-set-candle-soap-duo", imageUrl: "https://images.unsplash.com/photo-1615486364205-5a8f8fe9e9d4?w=800&q=80" },
      { title: "Citrus Hand Balm – 60ml", description: "Rich hand balm with shea butter and sweet orange essential oil. Absorbs quickly without greasiness. Perfect for dry hands and cuticles.", priceCents: 1600, categorySlug: "body-beauty", slug: "citrus-hand-balm-60ml", imageUrl: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80" },
      { title: "Bath Salts – Rose & Geranium", description: "Mineral-rich bath salts with rose petals and geranium essential oil. Relaxing soak for a calm evening routine. Glass jar, 400g.", priceCents: 2400, categorySlug: "body-beauty", slug: "bath-salts-rose-geranium-400g", imageUrl: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80" },
    ],
  },

  // —— Paper & Ink Studio (Art & Prints) ——
  {
    user: {
      firstName: "Ava",
      lastName: "Hughes",
      email: "ava.hughes@artisan.demo",
      username: "avahughes",
      role: "vendor",
      businessName: "Paper & Ink Studio",
      phone: "+61 401 222 333",
      website: "https://paperandink.demo",
      bio: "Limited edition art prints and illustrated stationery. Printed on archival paper with vibrant pigments. Designed and packed in Perth.",
      address: { line1: "14 Studio Way", city: "Perth", state: "WA", postcode: "6000", country: "AU" },
      primaryCategories: ["art-prints", "occasion"],
    },
    listings: [
      { title: "Botanical Line Art Print – A3", description: "Minimal botanical line art print, A3 size. Printed with archival inks on 300gsm cotton paper. Ships flat with backing board.", priceCents: 3500, categorySlug: "art-prints", slug: "botanical-line-art-print-a3", imageUrl: "https://images.unsplash.com/photo-1526481280695-3c687fd643ed?w=800&q=80" },
      { title: "Coastal Watercolour Print – A4", description: "Soft coastal watercolour print, A4 size. Archival inks on textured 250gsm paper. Perfect for beachy interiors.", priceCents: 2900, categorySlug: "art-prints", slug: "coastal-watercolour-print-a4", imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80" },
      { title: "Abstract Shapes Poster – A2", description: "Bold abstract shapes poster in earthy tones, A2 size. Museum-grade print on matte paper. Looks great in a simple frame.", priceCents: 4500, categorySlug: "art-prints", slug: "abstract-shapes-poster-a2", imageUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&q=80" },
      { title: "Illustrated City Map Print – A3", description: "Illustrated city map print, A3 size. Crisp lines, archival inks, thick matte paper. Gift-ready packaging.", priceCents: 3900, categorySlug: "art-prints", slug: "illustrated-city-map-print-a3", imageUrl: "https://images.unsplash.com/photo-1526481280695-3c687fd643ed?w=800&q=80" },
      { title: "Mini Print Set – 6 Pack", description: "Set of six mini prints (A5) featuring mixed illustrations. Perfect for gallery walls. Printed on 300gsm matte paper.", priceCents: 4200, categorySlug: "art-prints", slug: "mini-print-set-6-pack", imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=80" },
    ],
  },

  // —— Celebration Card Co (Occasion) ——
  {
    user: {
      firstName: "Noah",
      lastName: "Patel",
      email: "noah.patel@artisan.demo",
      username: "noahpatel",
      role: "vendor",
      businessName: "Celebration Card Co",
      phone: "+61 402 444 555",
      website: "https://celebrationcards.demo",
      bio: "Handmade greeting cards and gift wrap for every occasion. Small-batch printing, premium recycled stocks, and beautiful finishes.",
      address: { line1: "9 Paper Lane", city: "Hobart", state: "TAS", postcode: "7000", country: "AU" },
      primaryCategories: ["occasion", "art-prints"],
    },
    listings: [
      { title: "Birthday Card – Gold Foil Stars", description: "Birthday card with gold foil stars and letterpress typography. A6 folded, blank inside. Includes kraft envelope. Printed on recycled stock.", priceCents: 895, categorySlug: "occasion", slug: "birthday-card-gold-foil-stars", imageUrl: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80" },
      { title: "Wedding Card – Minimal Script", description: "Elegant wedding card with minimal script and thick matte card. A6 folded, blank inside. Includes envelope. Handmade in small batches.", priceCents: 895, categorySlug: "occasion", slug: "wedding-card-minimal-script", imageUrl: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80" },
      { title: "Thank You Card – Floral", description: "Floral thank you card with soft colours. A6 folded, blank inside. Includes envelope. Printed locally on premium paper.", priceCents: 895, categorySlug: "occasion", slug: "thank-you-card-floral", imageUrl: "https://images.unsplash.com/photo-1526481280695-3c687fd643ed?w=800&q=80" },
      { title: "New Baby Card – Pastel Blocks", description: "New baby card with pastel design. A6 folded, blank inside. Includes envelope. Recycled stock and water-based inks.", priceCents: 895, categorySlug: "occasion", slug: "new-baby-card-pastel-blocks", imageUrl: "https://images.unsplash.com/photo-1526481280695-3c687fd643ed?w=800&q=80" },
      { title: "Gift Wrap Sheet – Botanical", description: "Single sheet of botanical gift wrap, 50×70cm. Printed on recycled paper with crisp detail. Pairs perfectly with kraft string.", priceCents: 650, categorySlug: "occasion", slug: "gift-wrap-sheet-botanical", imageUrl: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80" },
    ],
  },

  // —— Paws & Whiskers Atelier (Pets) ——
  {
    user: {
      firstName: "Luca",
      lastName: "Martinez",
      email: "luca.martinez@artisan.demo",
      username: "lucamartinez",
      role: "vendor",
      businessName: "Paws & Whiskers Atelier",
      phone: "+61 403 555 666",
      website: "https://pawswhiskers.demo",
      bio: "Handmade accessories for pets: bandanas, collars, toys, and beds. Designed for comfort and durability, made in small batches.",
      address: { line1: "2 Bark Street", city: "Canberra", state: "ACT", postcode: "2600", country: "AU" },
      primaryCategories: ["pets", "accessories"],
    },
    listings: [
      { title: "Dog Bandana – Sage Gingham", description: "Soft cotton bandana in sage gingham. Adjustable tie. Comfortable and washable. Available in sizes S–L.", priceCents: 1800, categorySlug: "pets", slug: "dog-bandana-sage-gingham", imageUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80" },
      { title: "Cat Collar – Breakaway Floral", description: "Breakaway safety collar with floral print. Lightweight hardware and bell. Adjustable fit for cats and small dogs.", priceCents: 1600, categorySlug: "pets", slug: "cat-collar-breakaway-floral", imageUrl: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&q=80" },
      { title: "Rope Tug Toy – Natural", description: "Durable rope tug toy made from natural cotton. Great for fetch and tug. Handmade knots, washable. Size ~30cm.", priceCents: 1400, categorySlug: "pets", slug: "rope-tug-toy-natural", imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80" },
      { title: "Pet Bowl Mat – Canvas", description: "Canvas bowl mat to keep feeding tidy. Non-slip backing. Easy to wipe clean. Neutral colourways to suit any home.", priceCents: 2200, categorySlug: "pets", slug: "pet-bowl-mat-canvas", imageUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80" },
      { title: "Dog Leash – Woven", description: "Woven dog leash with comfortable handle and sturdy clasp. 1.5m length. Handmade with durable fibres and reinforced stitching.", priceCents: 3900, categorySlug: "pets", slug: "dog-leash-woven", imageUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80" },
    ],
  },
];

async function ensureCategories() {
  for (const c of CATEGORY_DATA) {
    await Category.updateOne({ slug: c.slug }, { $set: { ...c, isActive: true } }, { upsert: true });
  }
}

function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  await ensureCategories();
  const categories = await Category.find({}).lean();
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id]));

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const v of VENDORS) {
    const u = v.user;
    const existingUser = await User.findOne({ email: u.email.toLowerCase() });
    let userId;
    if (existingUser) {
      userId = existingUser._id;
      console.log("Vendor already exists:", u.email);
    } else {
      const vendorUser = await User.create({
        role: "vendor",
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email.toLowerCase(),
        username: u.username,
        passwordHash,
        isVerified: true,
        vendor: {
          businessName: u.businessName,
          phone: u.phone,
          website: u.website,
          description: u.bio,
          primaryCategories: u.primaryCategories,
        },
      });
      userId = vendorUser._id;
      console.log("Created vendor user:", u.email);
    }

    await VendorProfile.updateOne(
      { user: userId },
      {
        $set: {
          user: userId,
          businessName: u.businessName,
          contactEmail: u.email,
          phone: u.phone,
          website: u.website,
          bio: u.bio,
          address: u.address || {},
          primaryCategories: u.primaryCategories || [],
        },
      },
      { upsert: true }
    );
    console.log("Upserted vendor profile for", u.businessName);

    for (const prod of v.listings) {
      const catId = categoryBySlug[prod.categorySlug] || categories[0]._id;
      const slug = prod.slug || `${slugify(prod.title)}-${Date.now()}`;
      const imageUrl = prod.imageUrl || PLACEHOLDER_IMAGE;
      const images = prod.images && prod.images.length
        ? prod.images.map((img, i) => ({
            url: typeof img === "string" ? img : img.url,
            alt: (typeof img === "string" ? prod.title : img.alt) || prod.title,
            isPrimary: i === 0,
            sortOrder: i,
          }))
        : [{ url: imageUrl, alt: prod.title, isPrimary: true, sortOrder: 0 }];

      const existing = await Listing.findOne({ "seo.slug": slug });
      if (existing) {
        await Listing.updateOne(
          { _id: existing._id },
          {
            $set: {
              vendor: userId,
              title: prod.title,
              description: prod.description,
              pricing: { currency: "AUD", priceCents: prod.priceCents, compareAtCents: prod.compareAtCents || 0 },
              primaryCategory: catId,
              categories: [catId],
              images,
              seo: { slug, metaTitle: prod.title, metaDescription: (prod.description || "").slice(0, 160) },
              "inventory.status": "active",
              ...(prod.stockQty != null ? { "inventory.stockQty": prod.stockQty } : {}),
            },
          }
        );
        console.log("Updated listing images:", prod.title);
      } else {
        await Listing.create({
          vendor: userId,
          title: prod.title,
          description: prod.description,
          pricing: { currency: "AUD", priceCents: prod.priceCents, compareAtCents: prod.compareAtCents || 0 },
          primaryCategory: catId,
          categories: [catId],
          images,
          seo: { slug, metaTitle: prod.title, metaDescription: (prod.description || "").slice(0, 160) },
          inventory: { stockQty: prod.stockQty != null ? prod.stockQty : 10, status: "active" },
          ratingsCount: 0,
          ratingAvg: 0,
        });
        console.log("Created listing:", prod.title);
      }
    }
  }

  const vendorCount = await User.countDocuments({ role: "vendor" });
  const listingCount = await Listing.countDocuments({ "inventory.status": "active" });
  console.log("✅ Seed done. Vendors:", vendorCount, "Active listings:", listingCount);
  console.log("Seed vendor login: any vendor email above with password:", SEED_PASSWORD);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
