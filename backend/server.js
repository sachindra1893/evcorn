require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Import Models & Services
const Category = require('./models/Category');
const Article = require('./models/Article');
const Vehicle = require('./models/Vehicle');
const { deleteImage } = require('./services/cloudinary.service');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

let useLocalFileDb = false;

// Set Cache-Control to prevent CDN/Browser caching of dynamic API routes
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Serve development test static files (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Mount Cloudinary Single Image Upload Endpoint (POST /api/upload)
const uploadRouter = require('./routes/upload');
app.use('/api', uploadRouter);

// Auth Helper Middleware
function checkAdminAuth(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid admin password' });
  }
}

// -------------------------------------------------------------
// Database Seeding Logic (Triggered on database connection)
// -------------------------------------------------------------
const defaultCategories = [
  { id: 'tesla', name: 'Tesla' },
  { id: 'byd', name: 'BYD' },
  { id: 'rivian', name: 'Rivian' },
  { id: 'lucid', name: 'Lucid' },
  { id: 'rimac', name: 'Rimac' },
  { id: 'porsche', name: 'Porsche' },
  { id: 'hyundai', name: 'Hyundai' },
  { id: 'kia', name: 'Kia' },
  { id: 'bmw', name: 'BMW' },
  { id: 'mercedes', name: 'Mercedes-Benz' },
  { id: 'audi', name: 'Audi' },
  { id: 'volvo', name: 'Volvo' },
  { id: 'polestar', name: 'Polestar' },
  { id: 'mg', name: 'MG' },
  { id: 'tata', name: 'Tata Motors' },
  { id: 'mahindra', name: 'Mahindra' }
];

const defaultArticles = [
  {
    title: 'Best EV Cars in 2025',
    description: 'Top electric vehicles leading the market with performance, range and innovation.',
    categoryId: 'tesla',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    active: true,
    paragraphs: [
      'Electric Vehicles (EVs) are often promoted as “zero-emission” vehicles, but the real environmental story is more detailed. Traditional Internal Combustion Engine (ICE) vehicles burn petrol or diesel, directly releasing carbon dioxide (CO₂), nitrogen oxides (NOx), and particulate matter from the tailpipe.',
      'In contrast, EVs produce zero tailpipe emissions, dramatically improving urban air quality. However, total carbon impact includes manufacturing emissions. EV batteries require materials like lithium, nickel, and cobalt, which increase initial production footprint.',
      'Over time, EVs offset this through efficient operation and cleaner electricity grids. Lifecycle studies show that even when charged on mixed energy grids, EVs emit significantly less total carbon than petrol or diesel vehicles.',
      'ICE vehicles pollute continuously throughout their lifetime, while EV emissions are mostly concentrated in production. As renewable energy adoption increases, EVs move closer to true carbon neutrality, making them a critical part of a carbon-zero future.'
    ]
  },
  {
    title: 'LFP vs NMC Batteries',
    description: 'Understand the key differences between battery chemistries and their real-world impact.',
    categoryId: 'byd',
    imageUrl: 'https://images.unsplash.com/photo-1558441719-ff34b0524af7?auto=format&fit=crop&w=800&q=80',
    active: true,
    paragraphs: [
      'Fast charging technology is transforming the electric vehicle experience by dramatically reducing charging time. Early EVs required several hours to recharge, but modern systems now support ultra-fast charging that can add hundreds of kilometers of range in under 30 minutes.',
      'The key innovation behind this progress is higher voltage architecture. Many new EV platforms use 800V systems instead of traditional 400V setups. Higher voltage allows more power to flow efficiently, reducing heat generation and improving charging speed without damaging the battery.',
      'Charging power is measured in kilowatts (kW). While standard home chargers operate between 3 kW and 11 kW, public DC fast chargers can deliver 50 kW, 150 kW, or even 350 kW. Vehicles designed for high-rate charging can take advantage of these powerful stations to minimize downtime.',
      'However, charging speed also depends on battery chemistry and thermal management. Advanced cooling systems ensure that batteries remain within safe temperature limits during high-power charging sessions. As battery density improves and solid-state technology develops, fast charging will become even more efficient and widely accessible.',
      'Fast charging is not just about speed — it is about confidence. The ability to recharge quickly makes long-distance travel practical and reduces range anxiety, bringing electric mobility closer to mainstream adoption and supporting the global shift toward carbon-zero transportation.'
    ]
  },
  {
    title: 'Real World EV Range Explained',
    description: 'Why claimed range and real driving range are different and what affects them.',
    categoryId: 'lucid',
    imageUrl: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
    active: true,
    paragraphs: [
      'Battery chemistry is the heart of every electric vehicle. The performance, cost, safety, charging speed, and range of an EV are directly influenced by its battery type. Today, Lithium Iron Phosphate (LFP) and Nickel Manganese Cobalt (NMC) dominate the market, while Sodium-Ion batteries are emerging as a promising alternative.',
      'NMC Batteries are widely used in premium and long-range EVs. They offer high energy density, typically between 180–260 Wh/kg in current generation models. This allows vehicles to achieve longer driving ranges with lighter battery packs. NMC batteries support strong acceleration and fast charging, making them suitable for high-performance EVs. However, they rely on expensive materials like nickel and cobalt, increasing cost and raising sustainability concerns. They also require advanced cooling systems due to higher thermal sensitivity.',
      'LFP Batteries are known for safety, affordability, and long cycle life. Their energy density generally ranges between 140–200 Wh/kg in modern applications. While slightly heavier than NMC for the same range, LFP batteries are more thermally stable and less prone to overheating. They do not require cobalt, making them cheaper and more environmentally friendly. LFP is increasingly used in mass-market EVs due to its durability and cost efficiency.',
      'Sodium-Ion Batteries are an emerging technology aimed at reducing dependence on lithium. Current prototypes offer energy density between 100–160 Wh/kg, lower than LFP and NMC. However, sodium is abundant and inexpensive, which significantly reduces material cost. Sodium-ion batteries perform better in cold climates and offer improved safety. While still in early commercial stages, they may become ideal for affordable urban EVs and energy storage systems.',
      'In terms of safety, LFP ranks highest due to its thermal stability. NMC offers higher performance but requires more complex management systems. Sodium-ion promises cost advantages and raw material abundance but still needs improvement in density and charging performance.',
      'Future advancements aim to push energy density beyond 300 Wh/kg through semi-solid and solid-state battery technologies. Companies worldwide are investing heavily in improving fast charging speeds, reducing degradation, and increasing overall lifecycle sustainability. As battery innovation accelerates, the balance between performance, affordability, and carbon impact will define the next generation of electric mobility.'
    ]
  },
  {
    title: 'Carbon Zero Transportation',
    description: 'How EV adoption contributes to reducing global carbon emissions.',
    categoryId: 'rivian',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    active: true,
    paragraphs: [
      'Driving range remains one of the most important factors for EV buyers. While charging infrastructure continues to expand, longer range reduces range anxiety and makes electric vehicles more practical for long-distance travel. Here are the top 10 longest-range electric vehicles currently available globally, based on manufacturer-claimed WLTP or EPA figures.',
      '1. Lucid Air Dream Edition – Up to 830 km (EPA approx. 516 miles). Lucid currently leads global range rankings, combining high battery density with ultra-efficient drivetrain technology.',
      '2. Mercedes-Benz EQS 450+ – Up to 770 km (WLTP). Luxury meets efficiency with aerodynamic design and large battery capacity.',
      '3. Tesla Model S Long Range – Up to 650–715 km depending on cycle (EPA/WLTP). Tesla continues to dominate high-efficiency powertrain engineering.',
      '4. BMW i7 xDrive60 – Around 625 km (WLTP). Premium comfort combined with competitive electric range.',
      '5. Hyundai Ioniq 6 Long Range – Around 610 km (WLTP). Aerodynamic design significantly improves real-world efficiency.',
      '6. Tesla Model 3 Long Range – Around 600 km (WLTP). One of the most efficient mass-market EVs globally.',
      '7. Ford Mustang Mach-E Extended Range – Around 600 km (WLTP). Strong performance with practical range.',
      '8. Volkswagen ID.7 Pro – Around 620 km (WLTP). Designed for long-distance electric travel.',
      '9. BYD Seal Long Range – Around 570–600 km (WLTP). Blade battery technology improves safety and efficiency.',
      '10. Porsche Taycan Performance Battery Plus – Around 500–550 km (WLTP). Focuses on performance while maintaining respectable range.',
      'It is important to note that real-world range depends on driving style, weather conditions, terrain, and battery temperature management. Claimed WLTP and EPA figures are standardized test results, and actual performance may vary. As battery density continues to improve beyond 200 Wh/kg and charging infrastructure expands, future EVs are expected to cross the 1,000 km range milestone within this decade.'
    ]
  },
  {
    title: 'Rimac Performance Growth',
    description: 'How Rimac hypercars are pushing EV battery density limits.',
    categoryId: 'rimac',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    active: false,
    paragraphs: []
  }
];

const defaultVehicles = [
  {
    id: 'tata-punch-ev',
    name: 'Tata Punch EV',
    categoryId: 'tata',
    price: 'Rs. 9.69 - 13.79 Lakh',
    seating: '5 Seater',
    dimensions: '3857 x 1742 x 1622 mm',
    groundClearance: '190 mm',
    batteryCapacity: '25 - 35 kWh',
    tyreSize: '185/60 R16',
    bootFrunkSpace: '366 L / 14 L (Frunk)',
    bhpTorque: '82 - 122 bhp / 114 - 190 Nm',
    drivetrain: 'FWD',
    safetyRating: '5 Star (Bharat NCAP)'
  },
  {
    id: 'tata-nexon-ev',
    name: 'Tata Nexon EV',
    categoryId: 'tata',
    price: 'Rs. 12.49 - 17.19 Lakh',
    seating: '5 Seater',
    dimensions: '3995 x 1802 x 1625 mm',
    groundClearance: '190 mm',
    batteryCapacity: '30 - 45 kWh',
    tyreSize: '215/60 R16',
    bootFrunkSpace: '350 L / No Frunk',
    bhpTorque: '127 - 148 bhp / 215 Nm',
    drivetrain: 'FWD',
    safetyRating: '5 Star (Global NCAP)'
  },
  {
    id: 'mg-windsor-ev',
    name: 'MG Windsor EV',
    categoryId: 'mg',
    price: 'Rs. 13.50 - 15.70 Lakh',
    seating: '5 Seater',
    dimensions: '4295 x 1850 x 1677 mm',
    groundClearance: '186 mm',
    batteryCapacity: '38 kWh',
    tyreSize: '215/60 R17',
    bootFrunkSpace: '604 L / No Frunk',
    bhpTorque: '136 bhp / 200 Nm',
    drivetrain: 'FWD',
    safetyRating: 'Not Rated Yet'
  },
  {
    id: 'byd-atto-3',
    name: 'BYD Atto 3',
    categoryId: 'byd',
    price: 'Rs. 24.99 - 33.99 Lakh',
    seating: '5 Seater',
    dimensions: '4455 x 1875 x 1615 mm',
    groundClearance: '175 mm',
    batteryCapacity: '49.9 - 60.5 kWh',
    tyreSize: '215/60 R17 / 215/55 R18',
    bootFrunkSpace: '440 L / No Frunk',
    bhpTorque: '201 bhp / 310 Nm',
    drivetrain: 'FWD',
    safetyRating: '5 Star (Euro NCAP)'
  },
  {
    id: 'byd-seal',
    name: 'BYD Seal',
    categoryId: 'byd',
    price: 'Rs. 41.00 - 53.00 Lakh',
    seating: '5 Seater',
    dimensions: '4800 x 1875 x 1460 mm',
    groundClearance: '145 mm',
    batteryCapacity: '61.4 - 82.5 kWh',
    tyreSize: '225/50 R18 / 235/45 R19',
    bootFrunkSpace: '400 L / 53 L (Frunk)',
    bhpTorque: '201 - 523 bhp / 310 - 670 Nm',
    drivetrain: 'RWD / AWD',
    safetyRating: '5 Star (Euro NCAP)'
  }
];

// Local File Database Helper Implementation
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const fileDb = {
  getArticles() {
    const filePath = path.join(DATA_DIR, 'articles.json');
    if (!fs.existsSync(filePath)) {
      const seeded = defaultArticles.map((art, idx) => ({
        ...art,
        id: `local-art-${idx + 1}`,
        createdAt: new Date().toISOString()
      }));
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2));
      return seeded;
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  },
  saveArticles(articles) {
    const filePath = path.join(DATA_DIR, 'articles.json');
    fs.writeFileSync(filePath, JSON.stringify(articles, null, 2));
  },
  getCategories() {
    const filePath = path.join(DATA_DIR, 'categories.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultCategories, null, 2));
      return defaultCategories;
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return defaultCategories;
    }
  },
  saveCategories(categories) {
    const filePath = path.join(DATA_DIR, 'categories.json');
    fs.writeFileSync(filePath, JSON.stringify(categories, null, 2));
  },
  getVehicles() {
    const filePath = path.join(DATA_DIR, 'vehicles.json');
    if (!fs.existsSync(filePath)) {
      const seeded = defaultVehicles || [];
      fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2));
      return seeded;
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  },
  saveVehicles(vehicles) {
    const filePath = path.join(DATA_DIR, 'vehicles.json');
    fs.writeFileSync(filePath, JSON.stringify(vehicles, null, 2));
  }
};

async function seedDatabase() {
  try {
    // 1. Seed Categories
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('Seeding default categories...');
      await Category.insertMany(defaultCategories);
    }

    // 2. Seed Articles
    const articleCount = await Article.countDocuments();
    if (articleCount === 0) {
      console.log('Seeding default articles...');
      await Article.insertMany(defaultArticles);
    }

    // 3. Seed Vehicles
    const vehicleCount = await Vehicle.countDocuments();
    if (vehicleCount === 0) {
      console.log('Seeding default vehicles...');
      await Vehicle.insertMany(defaultVehicles);
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Auth Endpoint
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid Admin Password' });
  }
});

// 2. Categories / Brands Endpoints
app.get('/api/categories', async (req, res) => {
  try {
    if (useLocalFileDb) {
      const categories = fileDb.getCategories().sort((a, b) => a.name.localeCompare(b.name));
      return res.json(categories);
    }
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching categories' });
  }
});

app.post('/api/categories', checkAdminAuth, async (req, res) => {
  try {
    const { id, name } = req.body;
    if (useLocalFileDb) {
      const categories = fileDb.getCategories();
      if (categories.some(c => c.id === id)) {
        return res.status(400).json({ error: 'Brand ID already exists' });
      }
      const newCat = { id, name };
      categories.push(newCat);
      fileDb.saveCategories(categories);
      return res.status(201).json(newCat);
    }
    const newCategory = new Category({ id, name });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create brand: ' + error.message });
  }
});

app.delete('/api/categories/:id', checkAdminAuth, async (req, res) => {
  try {
    if (useLocalFileDb) {
      let categories = fileDb.getCategories();
      const index = categories.findIndex(c => c.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Brand not found' });
      }
      categories.splice(index, 1);
      fileDb.saveCategories(categories);
      return res.json({ message: 'Brand deleted successfully' });
    }
    const cat = await Category.findOneAndDelete({ id: req.params.id });
    if (!cat) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting brand' });
  }
});

// 3. Articles Endpoints
app.get('/api/articles', async (req, res) => {
  try {
    const isLight = req.query.light === 'true';
    if (useLocalFileDb) {
      let articles = fileDb.getArticles();
      if (isLight) {
        // Strip heavy fields — list page only needs metadata
        articles = articles.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          categoryId: a.categoryId,
          createdAt: a.createdAt,
          active: a.active
        }));
      }
      return res.json(articles);
    }
    // MongoDB: use projection to exclude heavy fields when in light mode
    const projection = isLight ? { paragraphs: 0, blocks: 0, imageUrl: 0 } : {};
    const articles = await Article.find({}, projection).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching articles' });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  try {
    if (useLocalFileDb) {
      const articles = fileDb.getArticles();
      const article = articles.find(a => a.id === req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      return res.json(article);
    }
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching article' });
  }
});

app.post('/api/articles', checkAdminAuth, async (req, res) => {
  try {
    const { title, description, categoryId, paragraphs, blocks, active, imageUrl } = req.body;
    if (useLocalFileDb) {
      const articles = fileDb.getArticles();
      const newArticle = {
        id: 'local-art-' + Date.now(),
        title,
        description,
        categoryId: categoryId || 'general',
        paragraphs: paragraphs || [],
        blocks: blocks || [],
        active: active !== undefined ? active : true,
        imageUrl: imageUrl || '',
        createdAt: new Date().toISOString()
      };
      articles.unshift(newArticle);
      fileDb.saveArticles(articles);
      return res.status(201).json(newArticle);
    }
    const newArticle = new Article({
      title,
      description,
      categoryId,
      paragraphs,
      blocks,
      active: active !== undefined ? active : true,
      imageUrl
    });
    await newArticle.save();
    res.status(201).json(newArticle);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create article: ' + error.message });
  }
});

app.put('/api/articles/:id', checkAdminAuth, async (req, res) => {
  try {
    const { title, description, categoryId, paragraphs, blocks, active, imageUrl } = req.body;
    if (useLocalFileDb) {
      const articles = fileDb.getArticles();
      const article = articles.find(a => a.id === req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      article.title = title !== undefined ? title : article.title;
      article.description = description !== undefined ? description : article.description;
      article.categoryId = categoryId !== undefined ? categoryId : article.categoryId;
      article.paragraphs = paragraphs !== undefined ? paragraphs : article.paragraphs;
      article.blocks = blocks !== undefined ? blocks : article.blocks;
      article.active = active !== undefined ? active : article.active;
      article.imageUrl = imageUrl !== undefined ? imageUrl : article.imageUrl;
      fileDb.saveArticles(articles);
      return res.json(article);
    }
    const updated = await Article.findByIdAndUpdate(
      req.params.id,
      { title, description, categoryId, paragraphs, blocks, active, imageUrl },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update article: ' + error.message });
  }
});

app.delete('/api/articles/:id', checkAdminAuth, async (req, res) => {
  try {
    if (useLocalFileDb) {
      let articles = fileDb.getArticles();
      const index = articles.findIndex(a => a.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Article not found' });
      }
      articles.splice(index, 1);
      fileDb.saveArticles(articles);
      return res.json({ message: 'Article deleted successfully' });
    }
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    // Synchronized Cloudinary cleanup (safe, non-blocking)
    try {
      const imgToDelete = article.cloudinaryImage?.public_id || article.cloudinaryImage?.url || article.imageUrl;
      if (imgToDelete && imgToDelete.includes('cloudinary')) {
        await deleteImage(imgToDelete);
      }
    } catch (cleanErr) {
      console.warn('Cloudinary image cleanup warning on article delete:', cleanErr.message);
    }
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting article' });
  }
});

app.get('/api/sitemap.xml', async (req, res) => {
  try {
    let articles = [];
    if (useLocalFileDb) {
      articles = fileDb.getArticles().filter(a => a.active);
    } else {
      articles = await Article.find({ active: true });
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://evcorn.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://evcorn.com/compare</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://evcorn.com/articles</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://evcorn.com/about</loc>
    <lastmod>2026-07-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

    for (const art of articles) {
      const artId = art._id ? art._id.toString() : (art.id || '');
      const dateStr = art.createdAt 
        ? new Date(art.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xml += `
  <url>
    <loc>https://evcorn.com/articles/${artId}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    xml += '\n</urlset>';
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// 4. Vehicles Endpoints
app.get('/api/vehicles', async (req, res) => {
  try {
    const light = req.query.light === 'true';
    if (useLocalFileDb) {
      let vehicles = fileDb.getVehicles();
      if (light) {
        vehicles = vehicles.map(v => ({
          id: v.id,
          name: v.name,
          categoryId: v.categoryId,
          parentModel: v.parentModel
        }));
      }
      vehicles.sort((a, b) => a.name.localeCompare(b.name));
      return res.json(vehicles);
    }
    
    let vehicles;
    if (light) {
      vehicles = await Vehicle.find({}, 'id name categoryId parentModel').sort({ name: 1 });
    } else {
      vehicles = await Vehicle.find().sort({ name: 1 });
    }
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching vehicles' });
  }
});

app.get('/api/vehicles/:id', async (req, res) => {
  try {
    if (useLocalFileDb) {
      const vehicles = fileDb.getVehicles();
      const vehicle = vehicles.find(v => v.id === req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      return res.json(vehicle);
    }
    const vehicle = await Vehicle.findOne({ id: req.params.id });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching vehicle details' });
  }
});

app.post('/api/vehicles', checkAdminAuth, async (req, res) => {
  try {
    const vehicleData = req.body;
    if (!vehicleData.id) {
      vehicleData.id = vehicleData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    // Helper numeric extractor
    const num = str => (str && typeof str === 'string' ? parseFloat((str.match(/\d+(\.\d+)?/) || [0])[0]) : 0);

    const priceNum = num(vehicleData.price);
    const priceINR = vehicleData.price?.toLowerCase().includes('lakh') ? Math.round(priceNum * 100000) : Math.round(priceNum);
    const rangeKM = num(vehicleData.range);
    const batteryKWh = num(vehicleData.batteryCapacity);

    // Populate nested domain objects seamlessly
    vehicleData.pricing = vehicleData.pricing || {
      exShowroomPriceINR: priceINR,
      priceText: vehicleData.price || 'N/A'
    };
    vehicleData.battery = vehicleData.battery || {
      capacityKWh: batteryKWh,
      capacityText: vehicleData.batteryCapacity || 'N/A'
    };
    vehicleData.performance = vehicleData.performance || {
      claimedRangeKM: rangeKM,
      rangeText: vehicleData.range || 'N/A'
    };

    if (useLocalFileDb) {
      let vehicles = fileDb.getVehicles();
      const index = vehicles.findIndex(v => v.id === vehicleData.id);
      if (index !== -1) {
        vehicles[index] = { ...vehicles[index], ...vehicleData };
      } else {
        vehicles.push(vehicleData);
      }
      fileDb.saveVehicles(vehicles);
      return res.json(vehicleData);
    }

    // Upsert so we can create or update existing vehicle specs
    const vehicle = await Vehicle.findOneAndUpdate(
      { id: vehicleData.id },
      vehicleData,
      { new: true, upsert: true }
    );
    res.json(vehicle);
  } catch (error) {
    res.status(400).json({ error: 'Failed to save vehicle: ' + error.message });
  }
});

app.delete('/api/vehicles/:id', checkAdminAuth, async (req, res) => {
  try {
    if (useLocalFileDb) {
      let vehicles = fileDb.getVehicles();
      const index = vehicles.findIndex(v => v.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      vehicles.splice(index, 1);
      fileDb.saveVehicles(vehicles);
      return res.json({ message: 'Vehicle deleted successfully' });
    }
    const vehicle = await Vehicle.findOneAndDelete({ id: req.params.id });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    // Synchronized Cloudinary cleanup (safe, non-blocking)
    try {
      if (vehicle.imageUrl && vehicle.imageUrl.includes('cloudinary')) {
        await deleteImage(vehicle.imageUrl);
      }
      if (vehicle.cloudinaryImages && Array.isArray(vehicle.cloudinaryImages)) {
        for (const item of vehicle.cloudinaryImages) {
          const target = item.public_id || item.url;
          if (target && target.includes('cloudinary')) {
            await deleteImage(target);
          }
        }
      }
    } catch (cleanErr) {
      console.warn('Cloudinary image cleanup warning on vehicle delete:', cleanErr.message);
    }
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting vehicle' });
  }
});

// Root check
app.get('/', (req, res) => {
  res.send('EVCorn Backend API is running successfully!');
});

// -------------------------------------------------------------
// Database Connect & Server Listen
// -------------------------------------------------------------
if (!MONGO_URI) {
  console.log('WARNING: MONGO_URI is not defined. Falling back to local JSON file database!');
  useLocalFileDb = true;
}

// Start listening on port immediately so hosting health checks pass
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (useLocalFileDb) {
    console.log('>>> RUNNING IN LOCAL JSON FILE DATABASE MODE <<<');
  }
});

// Connect to MongoDB asynchronously if URI is available
if (!useLocalFileDb) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('Successfully connected to MongoDB.');
      seedDatabase();
    })
    .catch(err => {
      console.error('Database connection error:', err);
      console.log('>>> FALLING BACK TO LOCAL JSON FILE DATABASE (useLocalFileDb = true) <<<');
      useLocalFileDb = true;
    });
}
