import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const form = formidable({
      uploadDir: process.cwd(),
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB máximo
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;
    
    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo PDF.' });
    }

    // Verificar que sea PDF
    if (!file.mimetype || !file.mimetype.includes('pdf')) {
      // Eliminar archivo temporal
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      return res.status(400).json({ error: 'El archivo debe ser un PDF.' });
    }

    // Mover el archivo a la ubicación final
    const targetPath = path.join(process.cwd(), 'catalogo.pdf');
    const oldPath = file.filepath;

    // Si ya existe un catálogo, hacer backup
    if (fs.existsSync(targetPath)) {
      const backupPath = path.join(process.cwd(), `catalogo.backup.${Date.now()}.pdf`);
      fs.copyFileSync(targetPath, backupPath);
    }

    // Mover el nuevo archivo
    fs.renameSync(oldPath, targetPath);

    res.status(200).json({
      ok: true,
      message: 'PDF cargado exitosamente',
      filename: 'catalogo.pdf',
      size: file.size,
    });
  } catch (error) {
    console.error('Error al subir PDF:', error);
    res.status(500).json({
      error: 'Error al subir el archivo PDF.',
      details: error.message,
    });
  }
}

