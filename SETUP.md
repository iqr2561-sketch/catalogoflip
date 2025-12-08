# Guía de Configuración - Catálogo Flipbook

## 📋 Pasos para Configurar el Proyecto

### 1. Instalación de Dependencias

```bash
npm install
```

### 2. Preparar el Archivo PDF

1. Coloca tu archivo PDF en la carpeta `public/` con el nombre `catalogo.pdf`
2. Asegúrate de que el PDF no esté protegido con contraseña
3. El PDF se convertirá automáticamente a imágenes al cargar la página

### 3. Configurar el Catálogo

Edita el archivo `data/catalog.json`:

#### Configuración Básica

```json
{
  "pdf": "/catalogo.pdf",
  "whatsappNumber": "573001234567",  // Opcional: número sin el símbolo +
  "hotspots": [...],
  "productos": [...]
}
```

#### Agregar Hotspots

Los hotspots usan coordenadas porcentuales (0-100):

```json
{
  "page": 1,              // Número de página (empezando en 1)
  "idProducto": "p001",   // ID del producto asociado
  "x": 20,                // Posición X en porcentaje (0-100)
  "y": 30,                // Posición Y en porcentaje (0-100)
  "width": 15,            // Ancho en porcentaje (0-100)
  "height": 20            // Alto en porcentaje (0-100)
}
```

**Consejo**: Para encontrar las coordenadas correctas:
1. Abre tu PDF en un editor de imágenes
2. Calcula el porcentaje basado en las dimensiones del PDF
3. Por ejemplo, si el PDF es 1000x1400px y quieres un hotspot en (200, 300):
   - x = (200 / 1000) * 100 = 20%
   - y = (300 / 1400) * 100 = 21.4%

#### Agregar Productos

```json
{
  "id": "p001",                    // ID único (debe coincidir con idProducto en hotspots)
  "nombre": "Nombre del Producto",
  "precio": 45000,                 // Precio en número (sin puntos ni comas)
  "imagen": "/productos/imagen.jpg", // Ruta relativa desde public/
  "descripcion": "Descripción detallada del producto..."
}
```

### 4. Agregar Imágenes de Productos

1. Crea la carpeta `public/productos/` si no existe
2. Coloca las imágenes de los productos en esa carpeta
3. Usa nombres descriptivos (ej: `aura.jpg`, `essence.jpg`)
4. Actualiza las rutas en `catalog.json`

### 5. Ejecutar el Proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎨 Personalización

### Cambiar Colores

Edita `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#0ea5e9',  // Color principal
        600: '#0284c7',  // Color hover
        700: '#0369a1',  // Color activo
      },
    },
  },
}
```

### Ajustar Tamaño del Flipbook

Edita `components/FlipbookCatalog.jsx`:

```javascript
const pageFlip = new PageFlip(flipbookRef.current, {
  width: 600,      // Ancho inicial
  height: 800,     // Alto inicial
  flippingTime: 1000,  // Velocidad de animación (ms)
  // ...
});
```

## 🔧 Solución de Problemas

### El PDF no carga

- Verifica que el archivo existe en `public/catalogo.pdf`
- Revisa la consola del navegador (F12) para errores
- Asegúrate de que el PDF no esté protegido

### Los hotspots no aparecen

- Verifica que las coordenadas estén en porcentajes (0-100)
- Asegúrate de que los IDs de productos coincidan
- Revisa que `page` corresponda a la página correcta (empezando en 1)

### Errores de PDF.js

- Verifica tu conexión a internet (el worker se carga desde CDN)
- Si tienes problemas, puedes descargar el worker localmente

### El carrito no funciona

- Verifica que Zustand esté instalado correctamente
- Revisa la consola del navegador para errores

## 📱 Modo WhatsApp vs Carrito

El proyecto puede funcionar de dos formas:

1. **Con WhatsApp**: Si `whatsappNumber` está configurado, el botón "Comprar" abrirá WhatsApp
2. **Con Carrito**: Si `whatsappNumber` es `null`, el botón agregará al carrito

Puedes cambiar esto en `data/catalog.json`:

```json
{
  "whatsappNumber": null  // Usa carrito
  // o
  "whatsappNumber": "573001234567"  // Usa WhatsApp
}
```

## 🚀 Despliegue

### Build para Producción

```bash
npm run build
npm start
```

### Desplegar en Vercel

1. Conecta tu repositorio a Vercel
2. Vercel detectará automáticamente Next.js
3. Asegúrate de incluir el archivo PDF en el repositorio

### Desplegar en Otros Servicios

- Asegúrate de que el archivo PDF esté en `public/`
- El proyecto es estático después del build
- No requiere variables de entorno

## 📝 Notas Importantes

- El PDF se convierte a imágenes en el cliente (puede tardar unos segundos)
- Las imágenes generadas se almacenan en memoria
- Para PDFs grandes, considera optimizar el archivo primero
- Los hotspots son responsivos y se ajustan al tamaño del flipbook

