# 🧪 Guía de Pruebas Locales

## Pre-requisitos

Antes de ejecutar las pruebas, asegúrate de tener:

- ✅ Node.js instalado (versión 16 o superior)
- ✅ npm o yarn instalado
- ✅ Archivo PDF en `public/catalogo.pdf`
- ✅ Imágenes de productos en `public/productos/` (opcional para pruebas básicas)

## 📋 Checklist de Preparación

### 1. Instalación de Dependencias

```bash
npm install
```

**Verificación:**
- Debe crear la carpeta `node_modules/`
- No debe mostrar errores
- Todas las dependencias deben instalarse correctamente

### 2. Verificar Archivos Necesarios

Asegúrate de que existan estos archivos:

```
✅ package.json
✅ next.config.js
✅ tailwind.config.js
✅ postcss.config.js
✅ pages/catalog.js
✅ components/FlipbookCatalog.jsx
✅ components/Hotspot.jsx
✅ components/ProductModal.jsx
✅ components/Cart.jsx
✅ lib/pdfToImages.js
✅ store/cartStore.js
✅ data/catalog.json
✅ styles/globals.css
✅ public/catalogo.pdf (DEBES AGREGARLO)
```

### 3. Configurar el Catálogo

Edita `data/catalog.json`:

```json
{
  "pdf": "/catalogo.pdf",  // ✅ Verifica que el PDF exista
  "whatsappNumber": "573001234567",  // Opcional
  "hotspots": [...],  // ✅ Configura al menos uno para probar
  "productos": [...]  // ✅ Agrega productos de prueba
}
```

## 🚀 Ejecutar Pruebas Locales

### Paso 1: Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

**Resultado esperado:**
```
> flipbook-catalog@1.0.0 dev
> next dev

- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

### Paso 2: Abrir en el Navegador

Abre [http://localhost:3000](http://localhost:3000)

**Comportamiento esperado:**
1. Redirige automáticamente a `/catalog`
2. Muestra un loader mientras convierte el PDF
3. Después de unos segundos, muestra el flipbook

## ✅ Checklist de Pruebas

### Pruebas Básicas

- [ ] **Carga del PDF**
  - El PDF se carga correctamente
  - Se muestra el loader durante la conversión
  - Las páginas se renderizan como imágenes

- [ ] **Navegación del Flipbook**
  - Las flechas izquierda/derecha funcionan
  - Se puede arrastrar las esquinas de las páginas
  - El contador de páginas se actualiza correctamente

- [ ] **Zoom**
  - El botón de zoom funciona
  - El flipbook se acerca/aleja correctamente

### Pruebas de Hotspots

- [ ] **Visualización**
  - Los hotspots aparecen en las páginas correctas
  - Se muestran con el borde indicador
  - El tooltip aparece al hacer hover

- [ ] **Interacción**
  - Al hacer clic en un hotspot, se abre el modal
  - El modal muestra la información correcta del producto

### Pruebas del Modal

- [ ] **Contenido**
  - Muestra la imagen del producto (o placeholder)
  - Muestra el nombre correcto
  - Muestra el precio formateado
  - Muestra la descripción

- [ ] **Botón Comprar**
  - Si hay `whatsappNumber`: abre WhatsApp
  - Si no hay `whatsappNumber`: agrega al carrito
  - El modal se cierra después de la acción

- [ ] **Cerrar Modal**
  - El botón X cierra el modal
  - Hacer clic fuera del modal lo cierra

### Pruebas del Carrito

- [ ] **Botón Flotante**
  - Aparece en la esquina inferior derecha
  - Muestra el contador de items cuando hay productos

- [ ] **Agregar Productos**
  - Los productos se agregan correctamente
  - El contador se actualiza
  - Los productos duplicados incrementan la cantidad

- [ ] **Abrir Carrito**
  - El modal del carrito se abre correctamente
  - Muestra todos los productos agregados

- [ ] **Modificar Cantidad**
  - Los botones +/- funcionan
  - La cantidad no puede ser menor a 1

- [ ] **Eliminar Productos**
  - El botón de eliminar funciona
  - Los productos se eliminan correctamente

- [ ] **Total**
  - El total se calcula correctamente
  - Se actualiza al modificar cantidades

- [ ] **Limpiar Carrito**
  - El botón "Limpiar" elimina todos los productos

### Pruebas Responsive

- [ ] **Desktop** (1920x1080)
  - El flipbook se ve correctamente
  - Los controles son accesibles

- [ ] **Tablet** (768x1024)
  - El flipbook se adapta al tamaño
  - Los hotspots siguen funcionando

- [ ] **Mobile** (375x667)
  - El flipbook es responsive
  - La navegación táctil funciona
  - Los modales se adaptan

## 🐛 Solución de Problemas Comunes

### Error: "Cannot find module 'page-flip'"

**Solución:**
```bash
npm install page-flip
```

### Error: "PDF.js worker failed to load"

**Solución:**
- Verifica tu conexión a internet
- El worker se carga desde CDN
- Si persiste, verifica la versión de pdfjs-dist en package.json

### El PDF no carga

**Verifica:**
1. El archivo existe en `public/catalogo.pdf`
2. El nombre en `catalog.json` coincide
3. El PDF no está protegido con contraseña
4. Revisa la consola del navegador (F12) para errores

### Los hotspots no aparecen

**Verifica:**
1. Las coordenadas están en porcentajes (0-100)
2. Los IDs de productos coinciden
3. El número de página es correcto (empezando en 1)
4. Las dimensiones del flipbook se calcularon correctamente

### El carrito no funciona

**Verifica:**
1. Zustand está instalado: `npm list zustand`
2. No hay errores en la consola
3. El store se inicializa correctamente

## 📊 Pruebas de Rendimiento

### Tiempos Esperados

- **Carga inicial:** 2-5 segundos (depende del tamaño del PDF)
- **Conversión de PDF:** 1-3 segundos por página
- **Navegación entre páginas:** Instantánea
- **Apertura de modal:** < 100ms

### Optimizaciones

Si el PDF es muy grande (> 50 páginas):
- Considera dividirlo en múltiples catálogos
- Reduce la resolución en `lib/pdfToImages.js` (cambia `scale: 2.0` a `scale: 1.5`)

## 🎯 Pruebas Finales Antes de Desplegar

- [ ] Todas las pruebas básicas pasan
- [ ] No hay errores en la consola
- [ ] El proyecto compila sin errores: `npm run build`
- [ ] El build de producción funciona: `npm start`
- [ ] Los archivos estáticos se sirven correctamente
- [ ] El PDF y las imágenes se cargan en producción

## 📝 Notas de Prueba

**Fecha de prueba:** _______________

**Tester:** _______________

**Resultados:**
- ✅ Funciona correctamente
- ⚠️ Funciona con advertencias
- ❌ No funciona / Error encontrado

**Observaciones:**
_________________________________
_________________________________
_________________________________

