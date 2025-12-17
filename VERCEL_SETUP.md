# 🚀 Configuración para Vercel

## ⚠️ Importante: Limitaciones de Vercel

En Vercel, el sistema de archivos es **de solo lectura** excepto para `/tmp`, que tiene estas limitaciones:

- **Tamaño máximo**: 512MB por función
- **Persistencia**: Los archivos se eliminan después de cada ejecución
- **No es adecuado para almacenamiento permanente**

**Por lo tanto, es CRÍTICO configurar MongoDB para producción.**

## 📋 Pasos de Configuración

### 1. Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel → **Settings → Environment Variables**
2. Agrega la variable `MONGODB_URI`:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

**Importante:**
- ✅ Usa la URI completa de MongoDB Atlas
- ✅ Asegúrate de que tu IP esté en la whitelist (o usa `0.0.0.0/0` para permitir todas)
- ✅ La URI debe incluir `retryWrites=true&w=majority`

### 2. Verificar Configuración del Proyecto

En **Vercel → Settings → General**:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (o dejar por defecto)
- **Output Directory**: `.next` (o dejar por defecto)
- **Install Command**: `npm install` (o dejar por defecto)

### 3. Configuración de Funciones Serverless

El archivo `vercel.json` ya está configurado con:

- **upload-pdf-chunk.js**: 120s timeout, 1024MB memoria
- **upload-pdf.js**: 300s timeout, 2048MB memoria
- **generate-pdf-images.js**: 300s timeout, 2048MB memoria

### 4. Verificar Conexión a MongoDB

Después del deploy, visita:
```
https://tu-dominio.vercel.app/api/db-check
```

Debería devolver:
```json
{
  "ok": true,
  "mongoConnected": true,
  "message": "Conexión a MongoDB exitosa"
}
```

## 🔧 Solución de Problemas

### Error: "ENOENT: no such file or directory, mkdir '/var/task/.tmp/pdf-chunks'"

**Causa**: El código intentó usar el filesystem local en lugar de MongoDB.

**Solución**:
1. Verifica que `MONGODB_URI` esté configurada en Vercel
2. Verifica que la URI sea válida y accesible
3. Verifica que tu IP esté en la whitelist de MongoDB Atlas

### Error: "No se pudo crear el directorio temporal y MongoDB no está disponible"

**Causa**: MongoDB no está configurado o no se puede conectar.

**Solución**:
1. Configura `MONGODB_URI` en Vercel → Settings → Environment Variables
2. Verifica la conexión con `/api/db-check`
3. Asegúrate de que MongoDB Atlas permita conexiones desde cualquier IP (`0.0.0.0/0`)

### Los PDFs no se guardan después de subirlos

**Causa**: En Vercel, `/tmp` se limpia después de cada ejecución.

**Solución**:
- **CRÍTICO**: Configura MongoDB para almacenamiento permanente
- El código usa GridFS de MongoDB para almacenar PDFs de forma persistente
- Sin MongoDB, los PDFs solo se guardan temporalmente en `/tmp` y se pierden

## ✅ Checklist de Producción

- [ ] `MONGODB_URI` configurada en Vercel
- [ ] IP whitelist configurada en MongoDB Atlas (`0.0.0.0/0` para desarrollo)
- [ ] Conexión verificada con `/api/db-check`
- [ ] Timeouts de funciones configurados en `vercel.json`
- [ ] Memoria suficiente para funciones (1024MB+ para uploads)

## 📝 Notas Adicionales

- El código detecta automáticamente si está en Vercel usando `process.env.VERCEL`
- Usa `/tmp` para archivos temporales en lugar de `.tmp` en el proyecto
- MongoDB es **obligatorio** para producción en Vercel
- Los archivos en `/tmp` se eliminan automáticamente después de cada ejecución

