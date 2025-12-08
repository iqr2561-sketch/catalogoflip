#!/usr/bin/env node

/**
 * Script de verificación del entorno
 * Ejecuta: node scripts/check-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración del proyecto...\n');

let hasErrors = false;
let hasWarnings = false;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function checkFile(filePath, required = true) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`${colors.green}✅${colors.reset} ${filePath}`);
    return true;
  } else {
    if (required) {
      console.log(`${colors.red}❌${colors.reset} ${filePath} (REQUERIDO)`);
      hasErrors = true;
    } else {
      console.log(`${colors.yellow}⚠️${colors.reset} ${filePath} (OPCIONAL)`);
      hasWarnings = true;
    }
    return false;
  }
}

function checkDirectory(dirPath, required = true) {
  const fullPath = path.join(process.cwd(), dirPath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`${colors.green}✅${colors.reset} ${dirPath}/`);
    return true;
  } else {
    if (required) {
      console.log(`${colors.red}❌${colors.reset} ${dirPath}/ (REQUERIDO)`);
      hasErrors = true;
    } else {
      console.log(`${colors.yellow}⚠️${colors.reset} ${dirPath}/ (OPCIONAL)`);
      hasWarnings = true;
    }
    return false;
  }
}

// Verificar archivos de configuración
console.log(`${colors.blue}📋 Archivos de Configuración:${colors.reset}`);
checkFile('package.json');
checkFile('next.config.js');
checkFile('tailwind.config.js');
checkFile('postcss.config.js');
checkFile('.gitignore');

console.log(`\n${colors.blue}📁 Estructura de Carpetas:${colors.reset}`);
checkDirectory('components');
checkDirectory('pages');
checkDirectory('lib');
checkDirectory('store');
checkDirectory('data');
checkDirectory('styles');
checkDirectory('public');
checkDirectory('public/productos', false);

console.log(`\n${colors.blue}⚛️ Componentes:${colors.reset}`);
checkFile('components/FlipbookCatalog.jsx');
checkFile('components/Hotspot.jsx');
checkFile('components/ProductModal.jsx');
checkFile('components/Cart.jsx');

console.log(`\n${colors.blue}📄 Páginas:${colors.reset}`);
checkFile('pages/index.js');
checkFile('pages/catalog.js');
checkFile('pages/_app.js');

console.log(`\n${colors.blue}🛠️ Utilidades:${colors.reset}`);
checkFile('lib/pdfToImages.js');
checkFile('store/cartStore.js');
checkFile('data/catalog.json');
checkFile('styles/globals.css');

console.log(`\n${colors.blue}📚 Archivos Estáticos:${colors.reset}`);
checkFile('public/catalogo.pdf', false);
checkFile('README.md');
checkFile('SETUP.md', false);
checkFile('TESTING.md', false);

// Verificar node_modules
console.log(`\n${colors.blue}📦 Dependencias:${colors.reset}`);
const nodeModulesExists = checkDirectory('node_modules', false);
if (!nodeModulesExists) {
  console.log(`${colors.yellow}⚠️${colors.reset} Ejecuta 'npm install' para instalar las dependencias`);
  hasWarnings = true;
}

// Verificar package.json tiene las dependencias necesarias
if (checkFile('package.json')) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['next', 'react', 'react-dom', 'page-flip', 'pdfjs-dist', 'zustand'];
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies || !packageJson.dependencies[dep]
    );
    
    if (missingDeps.length > 0) {
      console.log(`\n${colors.red}❌ Dependencias faltantes:${colors.reset}`);
      missingDeps.forEach(dep => console.log(`   - ${dep}`));
      hasErrors = true;
    } else {
      console.log(`\n${colors.green}✅ Todas las dependencias están en package.json${colors.reset}`);
    }
  } catch (error) {
    console.log(`\n${colors.red}❌ Error al leer package.json${colors.reset}`);
    hasErrors = true;
  }
}

// Resumen
console.log(`\n${'='.repeat(50)}`);
if (hasErrors) {
  console.log(`${colors.red}❌ Se encontraron errores. Por favor, corrígelos antes de continuar.${colors.reset}`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${colors.yellow}⚠️ Todo está bien, pero hay algunas advertencias.${colors.reset}`);
  console.log(`${colors.yellow}   Revisa los archivos marcados como opcionales.${colors.reset}`);
  process.exit(0);
} else {
  console.log(`${colors.green}✅ ¡Todo está configurado correctamente!${colors.reset}`);
  console.log(`\n${colors.blue}Próximos pasos:${colors.reset}`);
  console.log(`   1. Ejecuta: npm install`);
  console.log(`   2. Agrega tu PDF en: public/catalogo.pdf`);
  console.log(`   3. Configura: data/catalog.json`);
  console.log(`   4. Ejecuta: npm run dev`);
  process.exit(0);
}

