# 🚀 Comandos Rápidos para Configurar Git

## ⚠️ ADVERTENCIA DE SEGURIDAD

**Tu token ha sido expuesto. Por favor:**
1. Úsalo para configurar el repositorio
2. **REVÓCALO INMEDIATAMENTE** después: https://github.com/settings/tokens
3. Crea un nuevo token para uso futuro

## 📋 Opción 1: Script Automático (Recomendado)

### Windows (PowerShell):
```powershell
.\configurar-repositorio.ps1
```

### Linux/Mac:
```bash
bash configurar-repositorio.sh
```

El script te pedirá:
- Usuario de GitHub
- Nombre del repositorio

## 📋 Opción 2: Comando Manual (EJEMPLO, NO pegues tu token aquí)

### 1. Configurar el Remoto

**Reemplaza `[USUARIO]`, `[REPOSITORIO]` y `[TOKEN_PERSONAL]` con tus datos (el token solo debe ir en tu terminal):**

```bash
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git
```

**Ejemplo:**
```bash
git remote add origin https://[TOKEN_PERSONAL]@github.com/mi-usuario/flipbook-catalog.git
```

### 2. Verificar

```bash
git remote -v
```

### 3. Agregar y Commitear

```bash
git add .
git commit -m "Initial commit: Catálogo interactivo flipbook"
```

### 4. Hacer Push

```bash
git branch -M main
git push -u origin main
```

## 🔐 Opción 3: Más Segura (Sin Token en URL)

### Configurar Credential Helper

```bash
git config --global credential.helper wincred
```

### Configurar Remoto (sin token en URL)

```bash
git remote add origin https://github.com/[USUARIO]/[REPOSITORIO].git
```

### Cuando hagas push, Git pedirá:
- **Username**: tu-usuario-github
- **Password**: `[TOKEN_PERSONAL]` (pega el token manualmente, sin guardarlo en archivos)

## 📝 Ejemplo Completo

```bash
# 1. Verificar que estás en el directorio correcto
cd "C:\Users\mjsis\Desktop\Proyecto Flipbook"

# 2. Configurar remoto (REEMPLAZA [USUARIO], [REPOSITORIO] y [TOKEN_PERSONAL])
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git

# 3. Verificar
git remote -v

# 4. Agregar todos los archivos
git add .

# 5. Hacer commit
git commit -m "Initial commit: Catálogo interactivo flipbook con Next.js"

# 6. Cambiar a rama main
git branch -M main

# 7. Hacer push
git push -u origin main
```

## 🚨 Después de Configurar

### 1. Revocar el Token

Ve a: https://github.com/settings/tokens
- Encuentra el token
- Click en **"Revoke"**

### 2. Crear Nuevo Token

Para uso futuro, crea un nuevo token:
- https://github.com/settings/tokens
- **Generate new token (classic)**
- Permisos: `repo`
- **Guárdalo en un lugar seguro**

## ❓ ¿Necesitas la URL del Repositorio?

Si aún no has creado el repositorio en GitHub:

1. Ve a: https://github.com/new
2. Nombre: `flipbook-catalog` (o el que prefieras)
3. **NO** inicialices con README, .gitignore o licencia
4. Click en **"Create repository"**
5. Copia la URL que te muestra (ej: `https://github.com/tu-usuario/flipbook-catalog.git`)

## 🆘 Problemas Comunes

### Error: "remote origin already exists"

```bash
# Eliminar remoto existente
git remote remove origin

# Agregar nuevo remoto (REEMPLAZA [USUARIO], [REPOSITORIO] y [TOKEN_PERSONAL])
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git
```

### Error: "Authentication failed"

- Verifica que el token sea correcto
- Verifica que el token tenga permisos de `repo`
- Verifica que la URL del repositorio sea correcta

### Error: "Permission denied"

- Verifica que tengas acceso al repositorio
- Verifica que el token tenga permisos de escritura

