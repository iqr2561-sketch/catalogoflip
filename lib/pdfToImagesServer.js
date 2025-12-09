/**
 * Convierte un PDF a imágenes en el servidor usando PDF.js
 * Nota: Esta función requiere que las imágenes se generen en el cliente
 * o usando un servicio externo. Para Vercel, es mejor generar las imágenes
 * cuando se sube el PDF y guardarlas.
 * 
 * Por ahora, retornamos null para indicar que las imágenes deben generarse
 * en el cliente o mediante otro proceso.
 */
export async function pdfToImagesServer(pdfBuffer, scale = 2.0) {
  // En un entorno serverless como Vercel, es mejor generar las imágenes
  // cuando se sube el PDF usando un proceso en background o servicio externo
  // Por ahora, retornamos null para indicar que debe hacerse en el cliente
  return null;
}

