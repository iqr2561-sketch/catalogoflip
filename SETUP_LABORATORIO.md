# 🧪 Configuración para Fase de Laboratorio

## ✅ Estado Actual

- ✅ Git inicializado
- ✅ Token personal creado (NO lo guardes en este archivo)
- ✅ Proyecto listo para commit

## 🚀 Pasos Rápidos

### Opción 1: Si ya tienes el repositorio creado

Solo necesitas la URL. Ejecuta:

```bash
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git
```

### Opción 2: Si necesitas crear el repositorio

1. Ve a: https://github.com/new
2. Nombre del repositorio: `flipbook-catalog` (o el que prefieras)
3. **NO marques** "Initialize with README"
4. Click en **"Create repository"**
5. Copia la URL que te muestra
6. Usa esa URL en el comando de arriba

## 📝 Comandos Completos

Una vez configurado el remoto:

```bash
# 1. Agregar todos los archivos
git add .

# 2. Hacer commit inicial
git commit -m "Initial commit: Catálogo interactivo flipbook con Next.js"

# 3. Cambiar a rama main
git branch -M main

# 4. Hacer push
git push -u origin main
```

## 🔒 Seguridad para Producción (Después)

Cuando estés listo para producción, recuerda:

1. **Revocar tokens de desarrollo**
2. **Crear tokens con permisos mínimos**
3. **Usar variables de entorno** para tokens
4. **Implementar CI/CD seguro**
5. **Revisar dependencias** regularmente
6. **Usar SSH keys** en lugar de tokens cuando sea posible

## 📋 Checklist Pre-Producción

- [ ] Revisar todas las dependencias (`npm audit`)
- [ ] Actualizar tokens de acceso
- [ ] Configurar variables de entorno
- [ ] Revisar permisos de archivos
- [ ] Configurar secrets en Vercel/GitHub Actions
- [ ] Implementar monitoreo de seguridad

