# 📝 Variables de Entorno - Ejemplo

Crea un archivo `.env.local` en la raíz del proyecto con estas variables:

```env
# Base de Datos Neon (PostgreSQL)
# IMPORTANTE: Usa la URL de la base de datos PRINCIPAL (no branches automáticos)
# La URL debe terminar en -pooler y tener sslmode=require
DATABASE_URL=postgresql://usuario:password@host-pooler.region.aws.neon.tech/nombredb?sslmode=require
```

## ⚠️ Importante

- El archivo `.env.local` **NO se sube a Git** (está en `.gitignore`)
- En **Vercel**, configura estas variables en **Settings → Environment Variables**
- Usa la URL de la base de datos **principal**, NO branches automáticos
- La URL debe incluir `sslmode=require` para conexiones seguras

## 🔒 Seguridad

- **NUNCA** subas archivos `.env.local` a Git
- **NUNCA** compartas tus credenciales de base de datos
- Usa variables de entorno en Vercel para producción

