# Catálogo Interactivo Flipbook

Un catálogo interactivo tipo flipbook desarrollado con Next.js, React y Tailwind CSS. Permite visualizar un PDF como un libro digital con animación de pasar páginas, hotspots interactivos y carrito de compras.

## 🚀 Características

- ✨ Animación real de pasar páginas usando PageFlip.js
- 📱 Navegación táctil y con flechas
- 🔍 Zoom opcional
- 🎯 Hotspots interactivos sobre las páginas
- 🛒 Carrito de compras con Zustand
- 💬 Integración con WhatsApp
- 📄 Conversión automática de PDF a imágenes con PDF.js
- 🎨 Diseño moderno y profesional

## 📦 Instalación

### Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Verificar configuración
npm run check

# 3. Agregar PDF en public/catalogo.pdf

# 4. Ejecutar servidor de desarrollo
npm run dev
```
SZ
Abre [http://localhost:3000](http://localhost:3000) en tu navegador

### 📚 Documentación Completa

### 🚀 Para Empezar
- **[QUICK_START.md](QUICK_START.md)** - Inicio rápido en 5 minutos
- **[SETUP.md](SETUP.md)** - Configuración detallada paso a paso
- **[TESTING.md](TESTING.md)** - Guía completa de pruebas locales

### 📋 Cambios y Mejoras
- **[RESUMEN_CAMBIOS.md](RESUMEN_CAMBIOS.md)** - ⭐ **Resumen de TODOS los cambios propuestos**
- **[UX_IMPROVEMENTS.md](UX_IMPROVEMENTS.md)** - ⭐ **Lista de mejoras de UX pendientes**
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - ⭐ **Checklist completo para producción**
- **[CHANGELOG.md](CHANGELOG.md)** - Historial de cambios

### 🔧 Configuración
- **[GIT_SETUP.md](GIT_SETUP.md)** - Configuración de Git y repositorio
- **[QUICK_GIT_SETUP.md](QUICK_GIT_SETUP.md)** - Setup rápido de Git
- **[GIT_TOKEN_GUIDE.md](GIT_TOKEN_GUIDE.md)** - Guía para crear tokens

### 🔒 Seguridad
- **[SECURITY.md](SECURITY.md)** - Guía de seguridad general
- **[VULNERABILIDAD_REACT2SHELL.md](VULNERABILIDAD_REACT2SHELL.md)** - Información sobre React2Shell

### 🎯 Templates y Reutilización
- **[TEMPLATE_PROYECTO.md](TEMPLATE_PROYECTO.md)** - Template para nuevos proyectos
- **[.cursorrules](.cursorrules)** - Reglas de Cursor para aplicar a todos los proyectos
- **[INDICE_DOCUMENTACION.md](INDICE_DOCUMENTACION.md)** - Índice completo de documentación

> 💡 **Tip:** Revisa **[RESUMEN_CAMBIOS.md](RESUMEN_CAMBIOS.md)** para ver todos los cambios propuestos en un solo lugar.

## 📁 Estructura del Proyecto

```
├── components/
│   ├── FlipbookCatalog.jsx    # Componente principal del flipbook
│   ├── Hotspot.jsx             # Componente para los hotspots
│   ├── ProductModal.jsx        # Modal de producto
│   └── Cart.jsx                # Componente del carrito
├── lib/
│   └── pdfToImages.js          # Utilidad para convertir PDF a imágenes
├── store/
│   └── cartStore.js            # Store de Zustand para el carrito
├── data/
│   └── catalog.json            # Configuración del catálogo
├── pages/
│   ├── index.js                # Página de inicio (redirige a catalog)
│   ├── catalog.js              # Página del catálogo
│   └── _app.js                 # Configuración de la app
├── styles/
│   └── globals.css             # Estilos globales
└── public/
    └── catalogo.pdf            # Archivo PDF del catálogo
```

## ⚙️ Configuración

Edita el archivo `data/catalog.json` para configurar:

- **pdf**: Ruta al archivo PDF
- **whatsappNumber**: Número de WhatsApp (opcional, sin el símbolo +)
- **hotspots**: Array de hotspots con posición y producto asociado
- **productos**: Array de productos con información completa

### Ejemplo de hotspot:

```json
{
  "page": 1,
  "idProducto": "p001",
  "x": 20,
  "y": 30,
  "width": 15,
  "height": 20
}
```

Las coordenadas (x, y, width, height) son porcentajes relativos a la página.

## 🎨 Personalización

### Colores

Edita `tailwind.config.js` para cambiar los colores del tema.

### Estilos del Flipbook

Modifica los parámetros en `components/FlipbookCatalog.jsx`:

```javascript
const pageFlip = new PageFlip(flipbookRef.current, {
  width: 600,
  height: 800,
  flippingTime: 1000,
  // ... más opciones
});
```

## 📱 Funcionalidades

### Navegación
- Flechas izquierda/derecha
- Arrastrar las esquinas de las páginas
- Soporte táctil en dispositivos móviles

### Hotspots
- Clickeables sobre las páginas
- Tooltip al hacer hover
- Abre modal con información del producto

### Carrito
- Agregar productos
- Modificar cantidades
- Eliminar productos
- Calcular total automáticamente

### Compra
- Agregar al carrito (si no hay WhatsApp configurado)
- Enviar a WhatsApp (si está configurado)

## 🛠️ Tecnologías

- **Next.js 14**: Framework de React
- **React 18**: Biblioteca de UI
- **Tailwind CSS**: Framework de estilos
- **PageFlip.js**: Animación de flipbook
- **PDF.js**: Renderizado de PDF
- **Zustand**: Gestión de estado

## 📝 Notas

- Asegúrate de que el archivo PDF esté en la carpeta `public/`
- Los hotspots usan coordenadas porcentuales para ser responsivos
- El PDF se convierte a imágenes al cargar la página (puede tardar unos segundos)

## 🐛 Solución de Problemas

### El PDF no carga
- Verifica que el archivo existe en `public/catalogo.pdf`
- Revisa la consola del navegador para errores
- Asegúrate de que el PDF no esté protegido con contraseña

### Los hotspots no aparecen
- Verifica las coordenadas en `catalog.json`
- Asegúrate de que los IDs de productos coincidan

### Errores de PDF.js
- Verifica que la versión de PDF.js sea compatible
- El worker se carga desde CDN, verifica tu conexión a internet

## 🧪 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Verificar código
npm run check    # Verificar configuración del proyecto
```

## 📚 Documentación Completa

- **[QUICK_START.md](QUICK_START.md)** - Inicio rápido en 5 minutos
- **[SETUP.md](SETUP.md)** - Configuración detallada y personalización
- **[TESTING.md](TESTING.md)** - Guía completa de pruebas y checklist
- **[GIT_SETUP.md](GIT_SETUP.md)** - Configuración de Git y flujo de trabajo

## 🔒 Seguridad

⚠️ **Importante**: Antes de desplegar, revisa las vulnerabilidades de seguridad:

- **[VULNERABILIDAD_REACT2SHELL.md](VULNERABILIDAD_REACT2SHELL.md)** - Información sobre React2Shell (CVE-2025-55182)
- **[SECURITY.md](SECURITY.md)** - Guía de seguridad general

**Comandos de verificación:**
```bash
npm audit              # Verificar vulnerabilidades
npm audit fix          # Intentar arreglar automáticamente
npm list next react    # Verificar versiones instaladas
```

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

