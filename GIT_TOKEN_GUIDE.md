# 🔑 Guía para Crear Token de Git

## 📋 Enlaces por Plataforma

### GitHub (Más Común)

**🔗 Link Directo:**
https://github.com/settings/tokens

**Pasos:**
1. Ve al link de arriba
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. Dale un nombre descriptivo (ej: "Flipbook Catalog")
4. Selecciona los permisos necesarios:
   - ✅ `repo` (acceso completo a repositorios)
   - ✅ `workflow` (si usas GitHub Actions)
5. Click en **"Generate token"**
6. **⚠️ COPIA EL TOKEN INMEDIATAMENTE** (solo se muestra una vez)

### GitLab

**🔗 Link Directo:**
https://gitlab.com/-/user_settings/personal_access_tokens

**Pasos:**
1. Ve al link de arriba
2. Click en **"Add new token"**
3. Dale un nombre y selecciona permisos:
   - ✅ `read_repository`
   - ✅ `write_repository`
4. Click en **"Create personal access token"**
5. **⚠️ COPIA EL TOKEN INMEDIATAMENTE**

### Bitbucket

**🔗 Link Directo:**
https://bitbucket.org/account/settings/app-passwords/

**Pasos:**
1. Ve al link de arriba
2. Click en **"Create app password"**
3. Dale un nombre
4. Selecciona permisos: **Repositories** (Read, Write)
5. Click en **"Create"**
6. **⚠️ COPIA EL TOKEN INMEDIATAMENTE**

### Azure DevOps

**🔗 Link Directo:**
https://dev.azure.com/[TU-ORGANIZACION]/_usersSettings/tokens

**Pasos:**
1. Ve a tu organización en Azure DevOps
2. Click en tu perfil → **Security** → **Personal access tokens**
3. Click en **"New Token"**
4. Configura permisos y expiración
5. Click en **"Create"**
6. **⚠️ COPIA EL TOKEN INMEDIATAMENTE**

## 🔐 Usar el Token

### Opción 1: Usar Token en URL (HTTPS)

```bash
git remote add origin https://[TU-TOKEN]@github.com/usuario/repositorio.git
```

O cuando hagas push:

```bash
git push https://[TU-TOKEN]@github.com/usuario/repositorio.git
```

### Opción 2: Usar Token como Contraseña

Cuando Git te pida credenciales:
- **Usuario**: Tu nombre de usuario de GitHub/GitLab
- **Contraseña**: El token (NO tu contraseña real)

### Opción 3: Guardar en Git Credential Manager

```bash
# Windows
git config --global credential.helper wincred

# Luego cuando hagas push, ingresa:
# Username: tu-usuario
# Password: [TU-TOKEN]
```

### Opción 4: SSH (Recomendado para Producción)

Si prefieres usar SSH en lugar de tokens:

1. Genera una clave SSH:
```bash
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"
```

2. Agrega la clave pública a GitHub:
   - GitHub: https://github.com/settings/keys
   - GitLab: https://gitlab.com/-/profile/keys
   - Bitbucket: https://bitbucket.org/account/settings/ssh-keys/

3. Usa SSH en lugar de HTTPS:
```bash
git remote add origin git@github.com:usuario/repositorio.git
```

## 📝 Ejemplo Completo (GitHub)

### 1. Crear el Token

1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token (classic)"**
3. Nombre: `Flipbook Catalog`
4. Permisos: ✅ `repo`
5. Click en **"Generate token"**
6. **COPIA EL TOKEN**

### 2. Configurar el Repositorio

```bash
# Si ya tienes un repositorio remoto configurado
git remote set-url origin https://[TU-TOKEN]@github.com/usuario/repositorio.git

# O si es nuevo
git remote add origin https://[TU-TOKEN]@github.com/usuario/repositorio.git
```

### 3. Verificar

```bash
git remote -v
```

Deberías ver:
```
origin  https://[TU-TOKEN]@github.com/usuario/repositorio.git (fetch)
origin  https://[TU-TOKEN]@github.com/usuario/repositorio.git (push)
```

### 4. Hacer Push

```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

## ⚠️ Seguridad

### ❌ NO Hacer

- ❌ NO compartas tu token públicamente
- ❌ NO lo subas a Git (está en .gitignore)
- ❌ NO lo uses en código que se comparta
- ❌ NO lo dejes en archivos de configuración públicos

### ✅ Buenas Prácticas

- ✅ Usa tokens con expiración
- ✅ Usa permisos mínimos necesarios
- ✅ Revoca tokens que ya no uses
- ✅ Usa SSH para producción cuando sea posible
- ✅ Guarda tokens en variables de entorno o gestores de secretos

## 🔄 Renovar/Revocar Token

### GitHub
https://github.com/settings/tokens

### GitLab
https://gitlab.com/-/user_settings/personal_access_tokens

### Bitbucket
https://bitbucket.org/account/settings/app-passwords/

## 🆘 Problemas Comunes

### Error: "Authentication failed"

- Verifica que el token sea correcto
- Verifica que el token tenga los permisos necesarios
- Verifica que el token no haya expirado

### Error: "Permission denied"

- Verifica que el token tenga permisos de `write` o `repo`
- Verifica que tengas acceso al repositorio

### Token no funciona

- Los tokens solo se muestran una vez al crearlos
- Si lo perdiste, debes crear uno nuevo
- Revoca el token anterior si es necesario

## 📚 Recursos Adicionales

- [GitHub: Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitLab: Personal access tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
- [Bitbucket: App passwords](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/)

