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
  if (!mongoUri) {
    console.warn('[catalog-config] MONGODB_URI no configurada');
    return null;
  }
  
  try {
    console.log('[catalog-config] Intentando leer desde MongoDB...');
    const clientPromise = getMongoClient();
    if (!clientPromise) {
      console.warn('[catalog-config] No se pudo crear cliente MongoDB');
      return null;
    }
    
    const client = await clientPromise;
    const db = client.db();
    const catalogCollection = db.collection('catalogs');
    
    // Obtener el catálogo (asumimos que hay uno principal)
    const catalog = await catalogCollection.findOne({ isMain: true }) || 
                    await catalogCollection.findOne() ||
                    null;
    
    if (!catalog) {
      console.warn('[catalog-config] No se encontró catálogo en MongoDB');
      return null;
    }
    
    console.log('[catalog-config] Catálogo encontrado, obteniendo productos y hotspots...');
    
    // Obtener productos y hotspots desde sus colecciones
    const productsCollection = db.collection('products');
    const hotspotsCollection = db.collection('hotspots');
    
    const productos = await productsCollection.find({ catalogId: catalog._id.toString() }).toArray();
    const hotspots = await hotspotsCollection.find({ catalogId: catalog._id.toString() }).toArray();
    
    console.log(`[catalog-config] Datos obtenidos: ${productos.length} productos, ${hotspots.length} hotspots`);
    
    // Convertir ObjectId a string y formatear
    return {
      pdf: catalog.pdf || '/api/catalogo',
      whatsappNumber: catalog.whatsappNumber || null,
      numPages: catalog.numPages || null,
      useImages: catalog.useImages || false,
      imageUrls: catalog.imageUrls || [],
      zipFilename: catalog.zipFilename || null,
      imagesUpdatedAt: catalog.imagesUpdatedAt || null,
      variacionesGlobales: catalog.variacionesGlobales || [], // Incluir variaciones globales
      cotizacionDolar: catalog.cotizacionDolar || 1, // Cotización del dólar
      tipoPrecioDefault: catalog.tipoPrecioDefault || 'minorista', // Tipo de precio por defecto
      mostrarPreciosEnPesos: catalog.mostrarPreciosEnPesos || false, // Mostrar precios en pesos colombianos
      imagenGeneralProductos: catalog.imagenGeneralProductos || '', // Imagen general para productos sin imagen
      minProductosMayorista: catalog.minProductosMayorista || 50, // Mínimo de productos para compra mayorista
      landingPage: catalog.landingPage || null,
      productos: productos.map(p => ({
        id: p._id.toString(),
        nombre: p.nombre,
        precio: p.precio,
        imagen: p.imagen || '',
        descripcion: p.descripcion || '',
        variaciones: p.variaciones || [], // Incluir variaciones del producto
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
    console.error('[catalog-config] Error al leer desde MongoDB:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return null;
  }
}

async function saveToMongoDB(data) {
  if (!mongoUri) {
    console.warn('[catalog-config] MONGODB_URI no configurada, no se puede guardar en MongoDB');
    return false;
  }
  
  try {
    console.log('[catalog-config] Intentando guardar en MongoDB...');
    const clientPromise = getMongoClient();
    if (!clientPromise) {
      console.warn('[catalog-config] No se pudo crear cliente MongoDB');
      return false;
    }
    
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
        variacionesGlobales: data.variacionesGlobales || [], // Guardar variaciones globales
        cotizacionDolar: data.cotizacionDolar || 1, // Cotización del dólar
        tipoPrecioDefault: data.tipoPrecioDefault || 'minorista', // Tipo de precio por defecto
        mostrarPreciosEnPesos: data.mostrarPreciosEnPesos || false, // Mostrar precios en pesos colombianos
        imagenGeneralProductos: data.imagenGeneralProductos || '', // Imagen general para productos sin imagen
        landingPage: data.landingPage || null,
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
            cotizacionDolar: data.cotizacionDolar !== undefined ? data.cotizacionDolar : catalog.cotizacionDolar,
            tipoPrecioDefault: data.tipoPrecioDefault || catalog.tipoPrecioDefault,
            mostrarPreciosEnPesos: data.mostrarPreciosEnPesos !== undefined ? data.mostrarPreciosEnPesos : catalog.mostrarPreciosEnPesos,
            imagenGeneralProductos: data.imagenGeneralProductos !== undefined ? data.imagenGeneralProductos : catalog.imagenGeneralProductos,
            landingPage: data.landingPage !== undefined ? data.landingPage : catalog.landingPage,
            updatedAt: new Date(),
          },
        }
      );
    }
    
    const catalogId = catalog._id.toString();
    
    // Guardar productos
    let productIdMap = {}; // Mapa de IDs antiguos a nuevos ObjectIds de MongoDB
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
          variaciones: p.variaciones || [], // Guardar variaciones del producto
          createdAt: new Date(),
        }));
        const insertResult = await productsCollection.insertMany(productsToInsert);
        
        // Crear mapa de IDs antiguos a nuevos ObjectIds
        // Usamos el orden de inserción para mapear
        data.productos.forEach((p, idx) => {
          const oldId = p.id || '';
          const newId = insertResult.insertedIds[idx];
          if (oldId && newId) {
            productIdMap[oldId] = newId;
          }
        });
      }
    }
    
    // Guardar hotspots
    if (Array.isArray(data.hotspots)) {
      // Eliminar hotspots antiguos
      await hotspotsCollection.deleteMany({ catalogId });
      
      // Insertar nuevos hotspots
      if (data.hotspots.length > 0) {
        // Obtener productos para mapear IDs (por si no hay mapeo previo)
        const productos = await productsCollection.find({ catalogId }).toArray();
        
        const hotspotsToInsert = data.hotspots.map(h => {
          // Intentar mapear el ID del producto
          let productId = null;
          const oldProductId = h.idProducto || '';
          
          // Primero intentar usar el mapa de IDs
          if (oldProductId && productIdMap[oldProductId]) {
            productId = productIdMap[oldProductId];
          } else if (oldProductId) {
            // Si no está en el mapa, buscar por ID string
            const producto = productos.find(p => p._id.toString() === oldProductId);
            if (producto) {
              productId = producto._id;
            }
          }
          
          // Si aún no hay producto, usar el primero disponible
          if (!productId && productos.length > 0) {
            productId = productos[0]._id;
          }
          
          return {
            catalogId,
            page: h.page || 1,
            productId: productId,
            enabled: h.enabled !== false,
            x: h.x || 50,
            y: h.y || 50,
            width: h.width || 20,
            height: h.height || 20,
            createdAt: new Date(),
          };
        });
        
        await hotspotsCollection.insertMany(hotspotsToInsert);
      }
    }
    
    console.log('[catalog-config] Datos guardados exitosamente en MongoDB');
    return true;
  } catch (error) {
    console.error('[catalog-config] Error al guardar en MongoDB:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
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

      // Detectar imágenes generadas en filesystem como respaldo
      try {
        const imagesDir = path.join(process.cwd(), 'public', 'pdf-images');
        if (fs.existsSync(imagesDir)) {
          const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith('.png'));
          if (files.length > 0) {
            data.imagesGenerated = true;
            if (!data.numPages) {
              data.numPages = files.length;
            }
          }
        }
      } catch (fsError) {
        // Solo loguear
        console.warn('[catalog-config] No se pudo verificar imágenes en filesystem:', fsError);
      }
      
      // NO crear hotspots automáticamente - solo mostrar los que están en la BD
      
      res.status(200).json(data);
    } catch (error) {
      console.error('[catalog-config] Error al leer configuración:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      res.status(500).json({ 
        error: 'No se pudo leer la configuración del catálogo.', 
        details: error.message,
        hint: 'Verifica la conexión a MongoDB y los logs del servidor',
      });
    }
    return;
  }
  
  if (req.method === 'POST') {
    try {
      const data = req.body;
      
      // Intentar guardar en MongoDB primero
      const savedToMongo = await saveToMongoDB(data);
      
      // SIEMPRE guardar en archivo JSON como backup (incluso si MongoDB funciona)
      try {
        // Asegurar que el directorio existe
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('[catalog-config] Configuración guardada en archivo JSON como backup');
      } catch (fileError) {
        console.warn('[catalog-config] No se pudo guardar en archivo JSON:', fileError);
      }
      
      if (!savedToMongo && !fs.existsSync(filePath)) {
        return res.status(500).json({ 
          error: 'No se pudo guardar la configuración. MongoDB no disponible y archivo JSON no existe.',
          hint: 'Configura MONGODB_URI o asegúrate de que data/catalog.json exista',
        });
      }
      
      res.status(200).json({ ok: true, savedToMongo });
    } catch (error) {
      console.error('[catalog-config] Error al guardar configuración:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      res.status(500).json({ 
        error: 'No se pudo guardar la configuración del catálogo.',
        details: error.message,
        hint: 'Verifica la conexión a MongoDB y los logs del servidor',
      });
    }
    return;
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Método ${req.method} no permitido`);
}
