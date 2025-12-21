import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

// Cliente reutilizable
let client = null;
let clientPromise = null;

function getMongoClient() {
  if (!mongoUri) return null;
  
  if (!clientPromise) {
    try {
      client = new MongoClient(mongoUri, {
        maxPoolSize: 1,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000,
        retryWrites: true,
        w: 'majority',
      });
      clientPromise = client.connect();
    } catch (err) {
      console.error('Error al crear cliente MongoDB:', err);
      throw err;
    }
  }
  
  return clientPromise;
}

// Fallback: usar archivo JSON si MongoDB no está disponible
const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');

async function getFromMongoDB() {
  if (!mongoUri) {
    console.warn('[orders] MONGODB_URI no configurada');
    return null;
  }
  
  try {
    const clientPromise = getMongoClient();
    if (!clientPromise) {
      console.warn('[orders] No se pudo crear cliente MongoDB');
      return null;
    }
    
    const client = await clientPromise;
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    // Obtener todas las órdenes ordenadas por fecha (más recientes primero)
    const orders = await ordersCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    // Convertir ObjectId a string
    return orders.map(order => ({
      ...order,
      _id: order._id.toString(),
      id: order._id.toString(),
    }));
  } catch (err) {
    console.error('[orders] Error al leer desde MongoDB:', err);
    return null;
  }
}

async function getFromFile() {
  try {
    if (!fs.existsSync(ordersFilePath)) {
      return [];
    }
    
    const content = fs.readFileSync(ordersFilePath, 'utf8');
    const orders = JSON.parse(content);
    
    // Ordenar por fecha (más recientes primero)
    return orders.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      return dateB - dateA;
    });
  } catch (err) {
    console.error('[orders] Error al leer desde archivo:', err);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }
  
  try {
    console.log('[orders] 📊 Solicitando órdenes...');
    
    // Intentar leer desde MongoDB primero
    let orders = await getFromMongoDB();
    let source = 'MongoDB';
    
    // Si no hay MongoDB, usar archivo JSON
    if (!orders || orders.length === 0) {
      console.log('[orders] 📁 MongoDB vacío o no disponible, usando archivo JSON');
      orders = await getFromFile();
      source = 'JSON file';
    }
    
    console.log(`[orders] ✅ Órdenes cargadas desde ${source}: ${orders.length} órdenes`);
    
    // Calcular estadísticas
    const stats = {
      total: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      today: orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.updatedAt);
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
      }).length,
      thisWeek: orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.updatedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      }).length,
      thisMonth: orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.updatedAt);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orderDate >= monthAgo;
      }).length,
    };
    
    res.status(200).json({
      orders,
      stats,
    });
  } catch (error) {
    console.error('[orders] ❌ Error al leer órdenes:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ 
      error: 'No se pudieron leer las órdenes.',
      details: error.message,
    });
  }
}

