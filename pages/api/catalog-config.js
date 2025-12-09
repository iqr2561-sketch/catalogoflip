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
const filePath = path.join(process.cwd(), 'data', 'catalog.json');
const pdfPath = path.join(process.cwd(), 'catalogo.pdf');

async function getPdfPageCount() {
  try {
    if (!fs.existsSync(pdfPath)) return null;
    const pdfjsLib = await import('pdfjs-dist');
    const data = fs.readFileSync(pdfPath);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    return pdf.numPages || null;
  } catch (e) {
    console.error('No se pudo obtener el número de páginas del PDF:', e);
    return null;
  }
}

async function getFromMongoDB() {
  if (!mongoUri) return null;
  
  try {
    const clientPromise = getMongoClient();
    if (!clientPromise) return null;
    
    const client = await clientPromise;
    const db = client.db();
    const catalogCollection = db.collection('catalogs');
    
    // Obtener el catálogo (asumimos que hay uno principal)
    const catalog = await catalogCollection.findOne({ isMain: true }) || 
                    await catalogCollection.findOne() ||
                    null;
    
    if (!catalog) return null;
    
    // Obtener productos y hotspots desde sus colecciones
    const productsCollection = db.collection('products');
    const hotspotsCollection = db.collection('hotspots');
    
    const productos = await productsCollection.find({ catalogId: catalog._id.toString() }).toArray();
    const hotspots = await hotspotsCollection.find({ catalogId: catalog._id.toString() }).toArray();
    
    // Convertir ObjectId a string y formatear
    return {
      pdf: catalog.pdf || '/api/catalogo',
      whatsappNumber: catalog.whatsappNumber || null,
      numPages: catalog.numPages || null,
      productos: productos.map(p => ({
        id: p._id.toString(),
        nombre: p.nombre,
        precio: p.precio,
        imagen: p.imagen || '',
        descripcion: p.descripcion || '',
      })),
      hotspots: hotspots.map(h => ({
        page: h.page,
        idProducto: h.productId?.toString() || '',
        enabled: h.enabled !== false,
        x: h.x || 50,
        y: h.y || 50,
        width: h.width || 20,
        height: h.height || 20,
      })),
    };
  } catch (error) {
    console.error('Error al leer desde MongoDB:', error);
    return null;
  }
}

async function saveToMongoDB(data) {
  if (!mongoUri) return false;
  
  try {
    const clientPromise = getMongoClient();
    if (!clientPromise) return false;
    
    const client = await clientPromise;
    const db = client.db();
    const catalogCollection = db.collection('catalogs');
    const productsCollection = db.collection('products');
    const hotspotsCollection = db.collection('hotspots');
    
    // Obtener o crear el catálogo principal
    let catalog = await catalogCollection.findOne({ isMain: true });
    
    if (!catalog) {
      const result = await catalogCollection.insertOne({
        isMain: true,
        pdf: data.pdf || '/api/catalogo',
        whatsappNumber: data.whatsappNumber || null,
        numPages: data.numPages || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      catalog = await catalogCollection.findOne({ _id: result.insertedId });
    } else {
      await catalogCollection.updateOne(
        { _id: catalog._id },
        {
          $set: {
            pdf: data.pdf || catalog.pdf,
            whatsappNumber: data.whatsappNumber || catalog.whatsappNumber,
            numPages: data.numPages || catalog.numPages,
            updatedAt: new Date(),
          },
        }
      );
    }
    
    const catalogId = catalog._id.toString();
    
    // Guardar productos
    if (Array.isArray(data.productos)) {
      // Eliminar productos antiguos
      await productsCollection.deleteMany({ catalogId });
      
      // Insertar nuevos productos
      if (data.productos.length > 0) {
        const productsToInsert = data.productos.map(p => ({
          catalogId,
          nombre: p.nombre || '',
          precio: p.precio || 0,
          imagen: p.imagen || '',
          descripcion: p.descripcion || '',
          createdAt: new Date(),
        }));
        await productsCollection.insertMany(productsToInsert);
      }
    }
    
    // Guardar hotspots
    if (Array.isArray(data.hotspots)) {
      // Eliminar hotspots antiguos
      await hotspotsCollection.deleteMany({ catalogId });
      
      // Insertar nuevos hotspots
      if (data.hotspots.length > 0) {
        // Obtener productos para mapear IDs
        const productos = await productsCollection.find({ catalogId }).toArray();
        const productMap = {};
        productos.forEach((p, idx) => {
          productMap[data.productos?.[idx]?.id || p._id.toString()] = p._id;
        });
        
        const hotspotsToInsert = data.hotspots.map(h => ({
          catalogId,
          page: h.page || 1,
          productId: productMap[h.idProducto] || productos[0]?._id || null,
          enabled: h.enabled !== false,
          x: h.x || 50,
          y: h.y || 50,
          width: h.width || 20,
          height: h.height || 20,
          createdAt: new Date(),
        }));
        await hotspotsCollection.insertMany(hotspotsToInsert);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar en MongoDB:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Intentar obtener desde MongoDB primero
      let data = await getFromMongoDB();
      
      // Si no hay MongoDB o falla, usar archivo JSON como fallback
      if (!data && fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(content);
      }
      
      if (!data) {
        return res.status(404).json({ error: 'No se encontró configuración del catálogo.' });
      }
      
      // Detectar cantidad de páginas del PDF
      const numPages = await getPdfPageCount();
      if (numPages && (!data.numPages || data.numPages !== numPages)) {
        data.numPages = numPages;
      }
      
      // Asegurar estructuras básicas
      if (!Array.isArray(data.hotspots)) data.hotspots = [];
      if (!Array.isArray(data.productos)) data.productos = [];
      
      // Crear al menos un hotspot por página si no existe ninguno para esa página
      if (numPages) {
        const firstProductId = data.productos[0]?.id || '';
        for (let page = 1; page <= numPages; page++) {
          const tieneHotspot = data.hotspots.some((h) => h.page === page);
          if (!tieneHotspot) {
            data.hotspots.push({
              page,
              idProducto: firstProductId,
              enabled: false,
              x: 50,
              y: 50,
              width: 20,
              height: 20,
            });
          }
        }
      }
      
      res.status(200).json(data);
    } catch (error) {
      console.error('Error al leer configuración:', error);
      res.status(500).json({ error: 'No se pudo leer la configuración del catálogo.', details: error.message });
    }
    return;
  }
  
  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      // Intentar guardar en MongoDB primero
      const savedToMongo = await saveToMongoDB(data);
      
      // También guardar en archivo JSON como backup
      if (fs.existsSync(filePath) || !savedToMongo) {
        try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (fileError) {
          console.warn('No se pudo guardar en archivo JSON:', fileError);
        }
      }
      
      if (!savedToMongo && !fs.existsSync(filePath)) {
        return res.status(500).json({ 
          error: 'No se pudo guardar la configuración. MongoDB no disponible y archivo JSON no existe.',
          hint: 'Configura MONGODB_URI o asegúrate de que data/catalog.json exista',
        });
      }
      
      res.status(200).json({ ok: true, savedToMongo });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      res.status(500).json({ 
        error: 'No se pudo guardar la configuración del catálogo.',
        details: error.message,
      });
    }
    return;
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Método ${req.method} no permitido`);
}
