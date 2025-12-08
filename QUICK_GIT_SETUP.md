# ⚡ Configuración Rápida de Git

## 🎯 Todo en un Comando (EJEMPLO, NO pegues tu token aquí)

**Solo necesitas reemplazar `[USUARIO]`, `[REPOSITORIO]` y `[TOKEN_PERSONAL]`:**

```bash
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git && git add . && git commit -m "Initial commit: Catálogo interactivo flipbook" && git branch -M main && git push -u origin main
```

## 📋 Paso a Paso (Más Claro)

### 1. Configurar Remoto
```bash
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git
```

### 2. Verificar
```bash
git remote -v
```

### 3. Agregar Archivos
```bash
git add .
```

### 4. Commit
```bash
git commit -m "Initial commit: Catálogo interactivo flipbook con Next.js"
```

### 5. Cambiar a Main
```bash
git branch -M main
```

### 6. Push
```bash
git push -u origin main
```

## ❓ ¿No tienes el repositorio?

1. Ve a: https://github.com/new
2. Nombre: `flipbook-catalog`
3. **NO** inicialices con README
4. Click **"Create repository"**
5. Copia la URL
6. Úsala en el paso 1

## ✅ Listo!

Después de estos pasos, tu código estará en GitHub y listo para desplegar en Vercel.

