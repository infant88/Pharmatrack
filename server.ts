import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

// In-memory fallback stores
let drugsStore: any[] = [
  { _id: '1', name: 'Amoxicillin', category: 'Antibiotic', stock: 8, unit: 'Capsules', price: 12.5, expiryDate: new Date('2025-12-01'), supplier: 'PharmaCorp', supplierContact: '+1 (555) 123-4567', supplierRating: 4.8, location: 'Shelf A1', history: [] },
  { _id: '2', name: 'Paracetamol', category: 'Analgesic', stock: 450, unit: 'Tablets', price: 5.0, expiryDate: new Date('2026-06-15'), supplier: 'MediSupply', supplierContact: '+1 (555) 987-6543', supplierRating: 4.2, location: 'Shelf B2', history: [] },
  { _id: '3', name: 'Lisinopril', category: 'Antihypertensive', stock: 12, unit: 'Tablets', price: 18.2, expiryDate: new Date('2025-09-20'), supplier: 'GlobalHealth', supplierContact: '+1 (555) 456-7890', supplierRating: 4.5, location: 'Shelf C3', history: [] },
  { _id: '4', name: 'Metformin', category: 'Antidiabetic', stock: 5, unit: 'Tablets', price: 10.0, expiryDate: new Date('2025-11-10'), supplier: 'PharmaCorp', supplierContact: '+1 (555) 123-4567', supplierRating: 4.8, location: 'Shelf A2', history: [] },
];
let ordersStore = [];

if (MONGODB_URI && !MONGODB_URI.includes('localhost')) {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      isConnected = true;
      console.log("Connected to Cloud MongoDB");
    })
    .catch(err => {
      console.error("MongoDB connection error:", err.message);
      console.warn("Falling back to In-Memory storage mode.");
    });
} else {
  console.log("No Cloud MONGODB_URI provided. Running in In-Memory storage mode.");
}

// Models
const drugSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  stock: { type: Number, default: 0 },
  unit: String,
  price: Number,
  expiryDate: Date,
  supplier: String,
  supplierContact: String,
  supplierRating: Number,
  location: String,
  history: [{
    timestamp: { type: Date, default: Date.now },
    change: Number,
    newStock: Number,
    type: { type: String, enum: ['Inbound', 'Outbound', 'Adjustment'] }
  }]
});

const orderSchema = new mongoose.Schema({
  drugId: { type: mongoose.Schema.Types.ObjectId, ref: 'Drug' },
  drugName: String,
  quantity: Number,
  status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
  orderDate: { type: Date, default: Date.now },
  expectedDelivery: Date,
});

const Drug = mongoose.model('Drug', drugSchema);
const Order = mongoose.model('Order', orderSchema);

// Data Population Function
async function populateData() {
  try {
    const drugCount = isConnected ? await Drug.countDocuments() : drugsStore.length;
    if (drugCount < 10) {
      console.log("Populating initial data...");
      const categories = ['Antibiotic', 'Analgesic', 'Antihypertensive', 'Antidiabetic', 'Antiviral', 'Antifungal', 'Vaccine', 'Vitamin'];
      const suppliers = ['PharmaCorp', 'MediSupply', 'GlobalHealth', 'BioTech Solutions', 'Apex Pharma'];
      const locations = ['Shelf A1', 'Shelf B2', 'Shelf C3', 'Cold Storage 1', 'Shelf D4', 'Warehouse B'];

      const newDrugs = [];
      for (let i = 0; i < 300; i++) {
        const initialStock = Math.floor(Math.random() * 500);
        const drug = {
          name: `Drug ${i + 1}`,
          category: categories[Math.floor(Math.random() * categories.length)],
          stock: initialStock,
          unit: i % 2 === 0 ? 'Tablets' : 'Capsules',
          price: parseFloat((Math.random() * 50 + 5).toFixed(2)),
          expiryDate: new Date(Date.now() + Math.random() * 31536000000), // Within 1 year
          supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
          supplierContact: `+1 (555) ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
          supplierRating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0
          location: locations[Math.floor(Math.random() * locations.length)],
          history: [
            { timestamp: new Date(Date.now() - 86400000 * 7), change: initialStock, newStock: initialStock, type: 'Inbound' },
            { timestamp: new Date(Date.now() - 86400000 * 3), change: -10, newStock: initialStock - 10, type: 'Outbound' }
          ]
        };
        newDrugs.push(drug);
      }

      if (isConnected) {
        await Drug.insertMany(newDrugs);
        const allDrugs = await Drug.find().limit(20);
        const newOrders = allDrugs.map(d => ({
          drugId: d._id,
          drugName: d.name,
          quantity: Math.floor(Math.random() * 50) + 1,
          status: 'Pending',
          expectedDelivery: new Date(Date.now() + 86400000 * 3)
        }));
        await Order.insertMany(newOrders);
      } else {
        drugsStore = newDrugs.map((d, i) => ({ ...d, _id: (i + 1).toString() }));
        ordersStore = drugsStore.slice(0, 20).map((d, i) => ({
          _id: (i + 1).toString(),
          drugId: d._id,
          drugName: d.name,
          quantity: Math.floor(Math.random() * 50) + 1,
          status: 'Pending',
          orderDate: new Date(),
          expectedDelivery: new Date(Date.now() + 86400000 * 3)
        }));
      }
      console.log("Data population complete.");
    }
  } catch (err) {
    console.error("Population error:", err);
  }
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    database: isConnected ? "connected" : "mock",
    mode: isConnected ? "persistent" : "in-memory"
  });
});

app.get("/api/drugs", async (req, res) => {
  try {
    if (isConnected) {
      const drugs = await Drug.find();
      res.json(drugs);
    } else {
      res.json(drugsStore);
    }
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch drugs", details: error.message });
  }
});

app.post("/api/drugs", async (req, res) => {
  try {
    if (isConnected) {
      const drug = new Drug(req.body);
      await drug.save();
      res.status(201).json(drug);
    } else {
      const newDrug = { ...req.body, _id: Math.random().toString(36).substr(2, 9) };
      drugsStore.push(newDrug);
      res.status(201).json(newDrug);
    }
  } catch (error: any) {
    res.status(400).json({ error: "Failed to create drug", details: error.message });
  }
});

app.patch("/api/drugs/:id", async (req, res) => {
  try {
    const { stockChange, type, ...rest } = req.body;
    if (isConnected) {
      const drug = await Drug.findById(req.params.id);
      if (!drug) return res.status(404).json({ error: "Drug not found" });

      if (stockChange !== undefined) {
        drug.stock += stockChange;
        drug.history.push({
          change: stockChange,
          newStock: drug.stock,
          type: type || 'Adjustment'
        });
      }
      
      Object.assign(drug, rest);
      await drug.save();
      res.json(drug);
    } else {
      const index = drugsStore.findIndex(d => d._id === req.params.id);
      if (index !== -1) {
        if (stockChange !== undefined) {
          drugsStore[index].stock += stockChange;
          if (!drugsStore[index].history) drugsStore[index].history = [];
          drugsStore[index].history.push({
            timestamp: new Date().toISOString(),
            change: stockChange,
            newStock: drugsStore[index].stock,
            type: type || 'Adjustment'
          });
        }
        drugsStore[index] = { ...drugsStore[index], ...rest };
        res.json(drugsStore[index]);
      } else {
        res.status(404).json({ error: "Drug not found" });
      }
    }
  } catch (error) {
    res.status(400).json({ error: "Failed to update drug" });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    if (isConnected) {
      const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(order);
    } else {
      const index = ordersStore.findIndex(o => o._id === req.params.id);
      if (index !== -1) {
        ordersStore[index] = { ...ordersStore[index], ...req.body };
        res.json(ordersStore[index]);
      } else {
        res.status(404).json({ error: "Order not found" });
      }
    }
  } catch (error) {
    res.status(400).json({ error: "Failed to update order" });
  }
});

app.delete("/api/drugs/:id", async (req, res) => {
  try {
    if (isConnected) {
      await Drug.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } else {
      drugsStore = drugsStore.filter(d => d._id !== req.params.id);
      res.status(204).send();
    }
  } catch (error) {
    res.status(400).json({ error: "Failed to delete drug" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    if (isConnected) {
      const orders = await Order.find().populate('drugId');
      res.json(orders);
    } else {
      res.json(ordersStore);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    if (isConnected) {
      const order = new Order(req.body);
      await order.save();
      res.status(201).json(order);
    } else {
      const newOrder = { ...req.body, _id: Math.random().toString(36).substr(2, 9), orderDate: new Date() };
      ordersStore.push(newOrder);
      res.status(201).json(newOrder);
    }
  } catch (error) {
    res.status(400).json({ error: "Failed to create order" });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: "Failed to update order" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    populateData();
  });
}

startServer();
