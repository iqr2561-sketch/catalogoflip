# 📝 Variables de Entorno - Ejemplo

Crea un archivo `.env.local` en la raíz del proyecto con estas variables:

```env
# Base de Datos MongoDB Atlas
# IMPORTANTE: Usa la URI de conexión completa de MongoDB Atlas
# Formato: mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

## ⚠️ Importante

- El archivo `.env.local` **NO se sube a Git** (está en `.gitignore`)
- En **Vercel**, configura estas variables en **Settings → Environment Variables**
- Usa la URI completa de MongoDB Atlas con el formato `mongodb+srv://...`
- Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas (o usa `0.0.0.0/0` para permitir todas)

## 🔒 Seguridad

- **NUNCA** subas archivos `.env.local` a Git
- **NUNCA** compartas tus credenciales de base de datos
- Usa variables de entorno en Vercel para producción

