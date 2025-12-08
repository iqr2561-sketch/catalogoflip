# 🔧 Configurar Git con Token

## ⚠️ ADVERTENCIA DE SEGURIDAD

**Tu token NUNCA debe aparecer en el código ni en el repositorio. Por seguridad:** 

1. **REVOCA este token inmediatamente** después de configurarlo
2. **Crea un nuevo token** para uso futuro
3. **NUNCA compartas tokens públicamente**

Para revocar: https://github.com/settings/tokens

## 📋 Pasos para Configurar

### 1. Inicializar Git (si no está inicializado)

```bash
git init
```

### 2. Configurar el Remoto con el Token

**Reemplaza `[USUARIO]`, `[REPOSITORIO]` y `[TOKEN_PERSONAL]` con tus datos (NO copies tu token en este archivo, solo en tu terminal):**

```bash
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git
```

**O si ya existe un remoto, actualízalo:**

```bash
git remote set-url origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git
```

### 3. Verificar

```bash
git remote -v
```

### 4. Agregar Archivos y Hacer Commit

```bash
git add .
git commit -m "Initial commit: Catálogo interactivo flipbook"
```

### 5. Hacer Push

```bash
git branch -M main
git push -u origin main
```

## 🔐 Alternativa Más Segura (Recomendada)

En lugar de poner el token en la URL, puedes:

### Opción 1: Usar Git Credential Manager

```bash
# Configurar
git config --global credential.helper wincred

# Luego cuando hagas push, Git pedirá:
# Username: tu-usuario-github
# Password: [PEGA-EL-TOKEN-AQUI]
```

### Opción 2: Usar Variable de Entorno

```powershell
# En PowerShell (EJEMPLO - escribe TU token solo en la terminal, nunca lo guardes en archivos)
$env:GIT_TOKEN = "[TOKEN_PERSONAL]"
git remote add origin https://$env:GIT_TOKEN@github.com/[USUARIO]/[REPOSITORIO].git
```

## 🚨 IMPORTANTE: Revocar Token Después

1. Ve a: https://github.com/settings/tokens
2. Encuentra el token "Flipbook Catalog" (o el nombre que le diste)
3. Click en **"Revoke"**
4. Crea un nuevo token para uso futuro

## 📝 Ejemplo Completo

```bash
# 1. Inicializar (si hace falta)
git init

# 2. Configurar remoto (REEMPLAZA [USUARIO], [REPOSITORIO] y [TOKEN_PERSONAL])
git remote add origin https://[TOKEN_PERSONAL]@github.com/[USUARIO]/[REPOSITORIO].git

# 3. Verificar
git remote -v

# 4. Agregar archivos
git add .

# 5. Commit
git commit -m "Initial commit: Catálogo interactivo flipbook"

# 6. Push
git branch -M main
git push -u origin main
```

