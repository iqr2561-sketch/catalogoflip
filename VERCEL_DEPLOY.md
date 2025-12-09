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
DATABASE_URL=postgresql://neondb_owner:npg_Qfte2Ed3RgmM@ep-plain-block-ad4bm2ui-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Importante:**
- ✅ Usa la URL de la base de datos **principal** (la que termina en `-pooler`)
- ✅ NO uses URLs de branches automáticos
- ✅ Asegúrate de que `sslmode=require` esté incluido

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
     "connectionType": "direct"
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

#### Error: "Module not found: Can't resolve 'pg'"

**Causa**: La dependencia `pg` no está instalada.

**Solución**: Ya está resuelto en el código. Si persiste:
```bash
npm install pg
git add package.json package-lock.json
git commit -m "Asegura dependencia pg"
git push origin main
```

#### Error: "DATABASE_URL no está configurada"

**Causa**: La variable de entorno no está configurada en Vercel.

**Solución**:
1. Ve a **Settings → Environment Variables**
2. Añade `DATABASE_URL` con el valor correcto
3. Guarda y haz un **Redeploy**

### 📝 Notas

- Este proyecto usa conexión **directa** a la base de datos principal
- **NO** necesitas branches automáticos por deployment
- La configuración está en `vercel.json` para evitar integraciones automáticas
- El endpoint `/api/db-check` confirma que la conexión es directa (`connectionType: "direct"`)

