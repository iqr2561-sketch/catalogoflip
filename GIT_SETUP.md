# 🔧 Configuración de Git

Este documento explica cómo configurar Git para el proyecto cuando tengas los datos del repositorio.

## 📋 Pre-requisitos

- Git instalado en tu sistema
- Acceso al repositorio remoto (cuando lo tengas)

## 🚀 Configuración Inicial

### 1. Inicializar Git (si no está inicializado)

```bash
git init
```

### 2. Configurar el Repositorio Remoto

Cuando tengas la URL del repositorio:

```bash
git remote add origin <URL_DEL_REPOSITORIO>
```

Ejemplo:
```bash
git remote add origin https://github.com/tu-usuario/flipbook-catalog.git
```

O si usas SSH:
```bash
git remote add origin git@github.com:tu-usuario/flipbook-catalog.git
```

### 3. Verificar la Configuración

```bash
git remote -v
```

Deberías ver:
```
origin  <URL_DEL_REPOSITORIO> (fetch)
origin  <URL_DEL_REPOSITORIO> (push)
```

## 📝 Primer Commit

### 1. Agregar Archivos

```bash
git add .
```

### 2. Verificar lo que se va a commitear

```bash
git status
```

### 3. Hacer el Primer Commit

```bash
git commit -m "Initial commit: Catálogo interactivo flipbook con Next.js"
```

## 🔄 Sincronizar con el Repositorio Remoto

### Si el repositorio está vacío:

```bash
git branch -M main
git push -u origin main
```

### Si el repositorio ya tiene contenido:

```bash
git pull origin main --allow-unrelated-histories
# Resolver conflictos si los hay
git push -u origin main
```

## 📁 Archivos que NO se Suben a Git

El archivo `.gitignore` está configurado para excluir:

- `node_modules/` - Dependencias (se instalan con npm install)
- `.next/` - Build de Next.js
- Archivos de entorno local (`.env*.local`)
- Logs y archivos temporales
- Archivos del sistema operativo

### Archivos Opcionales para Excluir

Si tu PDF es muy grande (> 10MB), considera agregarlo al `.gitignore`:

```bash
# Edita .gitignore y descomenta:
/public/catalogo.pdf
```

Luego, documenta dónde obtener el PDF en el README.

## 🌿 Flujo de Trabajo Recomendado

### Para Desarrollo Diario:

```bash
# 1. Verificar cambios
git status

# 2. Agregar archivos modificados
git add .

# 3. Hacer commit
git commit -m "Descripción de los cambios"

# 4. Subir cambios
git push origin main
```

### Antes de Hacer Push:

1. **Verificar que todo funciona:**
   ```bash
   npm run check
   npm run build
   ```

2. **Revisar los cambios:**
   ```bash
   git diff
   ```

3. **Hacer commit con mensaje descriptivo:**
   ```bash
   git commit -m "feat: agregar nueva funcionalidad X"
   ```

## 📦 Comandos Útiles de Git

### Ver el Historial

```bash
git log --oneline
```

### Ver Cambios Pendientes

```bash
git status
git diff
```

### Crear una Nueva Rama

```bash
git checkout -b nombre-de-la-rama
```

### Cambiar de Rama

```bash
git checkout main
```

### Fusionar una Rama

```bash
git checkout main
git merge nombre-de-la-rama
```

### Deshacer Cambios Locales

```bash
# Descartar cambios en un archivo
git checkout -- nombre-del-archivo

# Descartar todos los cambios
git reset --hard HEAD
```

## 🔐 Configuración de Usuario (si es necesario)

Si es la primera vez que usas Git en esta máquina:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

## ✅ Checklist Antes de Hacer Push

- [ ] El proyecto compila sin errores: `npm run build`
- [ ] No hay errores de linting: `npm run lint`
- [ ] Los tests pasan (si los hay)
- [ ] El mensaje del commit es descriptivo
- [ ] No hay archivos sensibles en el commit (contraseñas, keys, etc.)
- [ ] El `.gitignore` está actualizado

## 🚨 Solución de Problemas

### Error: "fatal: remote origin already exists"

```bash
# Ver el remoto actual
git remote -v

# Eliminar el remoto
git remote remove origin

# Agregar el nuevo remoto
git remote add origin <NUEVA_URL>
```

### Error: "Updates were rejected"

```bash
# Hacer pull primero
git pull origin main --rebase

# Resolver conflictos si los hay
# Luego hacer push
git push origin main
```

### Deshacer el Último Commit (sin hacer push)

```bash
git reset --soft HEAD~1
```

### Ver qué Archivos Están Sigueados

```bash
git ls-files
```

## 📚 Recursos Adicionales

- [Documentación oficial de Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/) (para mensajes de commit)

## 💡 Tips

1. **Haz commits frecuentes** con mensajes descriptivos
2. **No commitees** `node_modules` ni archivos de build
3. **Usa ramas** para features grandes
4. **Revisa** `git status` antes de hacer commit
5. **Mantén** el `.gitignore` actualizado

