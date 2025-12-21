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

async function saveToMongoDB(orderData) {
  if (!mongoUri) {
    console.warn('[save-order] MONGODB_URI no configurada');
    return false;
  }
  
  try {
    const clientPromise = getMongoClient();
    if (!clientPromise) {
      console.warn('[save-order] No se pudo crear cliente MongoDB');
      return false;
    }
    
    const client = await clientPromise;
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    // Agregar timestamp
    const order = {
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await ordersCollection.insertOne(order);
    console.log('[save-order] Compra guardada en MongoDB:', order.id || order._id);
    return true;
  } catch (err) {
    console.error('[save-order] Error al guardar en MongoDB:', err);
    return false;
  }
}

async function saveToFile(orderData) {
  try {
    // Asegurar que el directorio existe
    const dir = path.dirname(ordersFilePath);
    if (!fs.existsSync(dir)) {
      console.log('[save-order] 📁 Creando directorio data:', dir);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Leer órdenes existentes
    let orders = [];
    if (fs.existsSync(ordersFilePath)) {
      try {
        const content = fs.readFileSync(ordersFilePath, 'utf8');
        if (content.trim()) {
          orders = JSON.parse(content);
          if (!Array.isArray(orders)) {
            console.warn('[save-order] ⚠️ El archivo no contiene un array válido, reiniciando');
            orders = [];
          }
        }
      } catch (e) {
        console.warn('[save-order] ⚠️ Error al leer archivo de órdenes, creando nuevo:', e.message);
        orders = [];
      }
    } else {
      console.log('[save-order] 📄 Archivo orders.json no existe, se creará uno nuevo');
    }
    
    // Agregar nueva orden con timestamp
    const order = {
      ...orderData,
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    orders.push(order);
    
    // Guardar
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf8');
    console.log('[save-order] ✅ Compra guardada en archivo JSON:', order.id);
    return true;
  } catch (err) {
    console.error('[save-order] ❌ Error al guardar en archivo:', {
      message: err.message,
      code: err.code,
      path: ordersFilePath,
    });
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }
  
  try {
    const orderData = req.body;
    
    console.log('[save-order] 📦 Recibida orden:', {
      productosCount: orderData.productos?.length || 0,
      total: orderData.total,
      whatsappNumber: orderData.whatsappNumber,
    });
    
    // Validar datos básicos
    if (!orderData.productos || !Array.isArray(orderData.productos) || orderData.productos.length === 0) {
      console.warn('[save-order] ⚠️ Orden inválida: sin productos');
      return res.status(400).json({ 
        error: 'La orden debe contener al menos un producto.',
      });
    }
    
    if (!orderData.total || orderData.total <= 0) {
      console.warn('[save-order] ⚠️ Orden inválida: total inválido');
      return res.status(400).json({ 
        error: 'El total de la orden debe ser mayor a 0.',
      });
    }
    
    // Intentar guardar en MongoDB primero
    const savedToMongo = await saveToMongoDB(orderData);
    
    // SIEMPRE guardar en archivo JSON como backup
    const savedToFile = await saveToFile(orderData);
    
    if (!savedToMongo && !savedToFile) {
      console.error('[save-order] ❌ No se pudo guardar en ningún lugar');
      return res.status(500).json({ 
        error: 'No se pudo guardar la orden.',
        hint: 'Verifica los permisos del sistema de archivos y los logs del servidor',
      });
    }
    
    console.log('[save-order] ✅ Orden guardada:', {
      savedToMongo,
      savedToFile,
    });
    
    res.status(200).json({ 
      ok: true, 
      savedToMongo,
      savedToFile,
      message: 'Orden registrada correctamente',
    });
  } catch (error) {
    console.error('[save-order] ❌ Error al guardar orden:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ 
      error: 'No se pudo guardar la orden.',
      details: error.message,
    });
  }
}

