# 🚀 Guía de Despliegue en Vercel

## ⚠️ IMPORTANTE: Desactivar Branches Automáticos de Base de Datos

Este proyecto **NO necesita** que Vercel cree branches automáticos de la base de datos por cada deployment. Usamos una conexión directa a la base de datos principal.

### Pasos para Configurar Correctamente

#### 1. Desactivar Integración Automática de Neon

1. Ve a tu proyecto en Vercel → **Settings → Integrations**
2. Busca la integración de **Neon** o **flipp**
3. **Desactiva** o **Remove** la opción:
   - ❌ "Create database branch for deployment"
   - ❌ "Auto-create branches"
4. Si no puedes desactivarla, **elimina completamente** la integración para este proyecto

#### 2. Configurar Variables de Entorno

En **Vercel → Settings → Environment Variables**, asegúrate de tener:

```env
MONGODB_URI=mongodb+srv://Vercel-Admin-flipbook:JIx6cz5uQJNVVQ9d@flipbook.jmai5zo.mongodb.net/?retryWrites=true&w=majority
```

**Importante:**
- ✅ Usa la URI completa de MongoDB Atlas con el formato `mongodb+srv://...`
- ✅ Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas (o usa `0.0.0.0/0` para permitir todas)
- ✅ La URI debe incluir `retryWrites=true&w=majority` para mejor confiabilidad

#### 3. Verificar Configuración del Proyecto

En **Vercel → Settings → General**:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (o dejar por defecto)
- **Output Directory**: `.next` (o dejar por defecto)
- **Install Command**: `npm install` (o dejar por defecto)

#### 4. Hacer el Deploy

1. Ve a **Deployments**
2. Haz clic en el último deployment fallido
3. Pulsa **Redeploy** (o crea un **New Deployment** desde `main`)
4. Espera a que termine

### ✅ Verificación Post-Deploy

Una vez que el deployment esté en estado **Ready**:

1. Abre tu URL de producción
2. Visita `/api/db-check` → Debe devolver:
   ```json
   {
     "ok": true,
     "dbOk": true,
     "durationMs": 42,
     "timestamp": "2024-...",
     "connectionType": "direct",
     "database": "nombre_db",
     "serverVersion": "7.x.x"
   }
   ```
3. Visita `/catalog` → Debe cargar el catálogo
4. Prueba el botón **Configuración** → Login `admin` / `1234` → `/panel`
5. En `/panel`, pulsa **Probar conexión BD** → Debe mostrar mensaje verde

### 🔍 Troubleshooting

#### Error: "Resource provisioning timed out"

**Causa**: Vercel está intentando crear un branch automático de la base de datos.

**Solución**:
1. Ve a **Settings → Integrations**
2. Elimina o desactiva la integración de Neon/flipp
3. Asegúrate de que solo uses `DATABASE_URL` con la conexión directa
4. Haz un nuevo deploy

#### Error: "Module not found: Can't resolve 'mongodb'"

**Causa**: La dependencia `mongodb` no está instalada.

**Solución**: Ya está resuelto en el código. Si persiste:
```bash
npm install mongodb
git add package.json package-lock.json
git commit -m "Asegura dependencia mongodb"
git push origin main
```

#### Error: "MONGODB_URI no está configurada"

**Causa**: La variable de entorno no está configurada en Vercel.

**Solución**:
1. Ve a **Settings → Environment Variables**
2. Añade `MONGODB_URI` con el valor correcto (URI completa de MongoDB Atlas)
3. Guarda y haz un **Redeploy**

#### Error: "MongoServerError: IP not whitelisted"

**Causa**: La IP de Vercel no está en la whitelist de MongoDB Atlas.

**Solución**:
1. Ve a MongoDB Atlas → Network Access
2. Añade `0.0.0.0/0` para permitir todas las IPs (o las IPs específicas de Vercel)
3. Espera unos minutos para que se aplique el cambio

### 📝 Notas

- Este proyecto usa **MongoDB Atlas** como base de datos
- La conexión es **directa** usando la URI de MongoDB Atlas
- **NO** necesitas branches automáticos por deployment
- La configuración está en `vercel.json` para evitar integraciones automáticas
- El endpoint `/api/db-check` confirma que la conexión es directa (`connectionType: "direct"`)
- Asegúrate de configurar la whitelist de IPs en MongoDB Atlas para permitir conexiones desde Vercel

