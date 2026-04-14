import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // We store files with their UUID to avoid collisions
    // The original filename and metadata should be handled by the client or stored separately
    // For this demo, we'll just use the UUID as the filename
    const id = uuidv4();
    cb(null, id);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Store metadata in memory (for demo purposes)
// In a real app, use a database
const fileMetadata = new Map<string, {
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  expiresAt: number;
}>();

app.use(express.json());

// API Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const id = req.file.filename;
  const metadata = {
    originalName: req.body.name || 'encrypted_file',
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  fileMetadata.set(id, metadata);

  res.json({ 
    id, 
    name: metadata.originalName,
    size: metadata.size
  });
});

app.get('/api/file/:id/info', (req, res) => {
  const { id } = req.params;
  const metadata = fileMetadata.get(id);

  if (!metadata) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.json({ id, ...metadata });
});

app.get('/api/file/:id/download', (req, res) => {
  const { id } = req.params;
  const metadata = fileMetadata.get(id);
  const filePath = path.join(UPLOADS_DIR, id);

  if (!metadata || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
