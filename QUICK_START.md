# ⚡ Inicio Rápido

Guía rápida para poner en marcha el proyecto localmente.

## 🚀 Pasos Rápidos

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Verificar Configuración

```bash
npm run check
```

Este comando verifica que todos los archivos necesarios estén presentes.

### 3. Agregar el PDF

Coloca tu archivo PDF en:
```
public/catalogo.pdf
```

### 4. Configurar el Catálogo

Edita `data/catalog.json` con tus productos y hotspots.

### 5. Ejecutar el Proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## ✅ Verificación Rápida

Ejecuta este comando para verificar que todo esté listo:

```bash
npm run check
```

## 📚 Documentación Completa

- **README.md** - Documentación general
- **SETUP.md** - Guía detallada de configuración
- **TESTING.md** - Guía de pruebas locales
- **GIT_SETUP.md** - Configuración de Git

## 🐛 Problemas Comunes

### Error: "Cannot find module"

```bash
rm -rf node_modules package-lock.json
npm install
```

### El PDF no carga

- Verifica que existe en `public/catalogo.pdf`
- Revisa la consola del navegador (F12)

### Los hotspots no aparecen

- Verifica las coordenadas en `catalog.json`
- Asegúrate de que los IDs de productos coincidan

## 🎯 Próximos Pasos

1. ✅ Instalar dependencias
2. ✅ Agregar PDF
3. ✅ Configurar catalog.json
4. ✅ Probar localmente
5. ✅ Configurar Git (ver GIT_SETUP.md)
6. ✅ Desplegar

