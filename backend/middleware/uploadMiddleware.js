const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configurable upload directory outside publicly served static folders
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '../uploads');

// Ensure the local uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer DiskStorage with unique server-side filenames and safe path handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize extension and prevent path traversal
    const safeExt = path.extname(path.basename(file.originalname)).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${uniqueSuffix}${safeExt}`);
  }
});

// Allowed file extensions
const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip'];

// Allowed MIME types
const allowedMimeTypes = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
  'application/octet-stream'
];

// File filter to reject unsupported file types
const fileFilter = (req, file, cb) => {
  const cleanOriginalName = path.basename(file.originalname);
  const ext = path.extname(cleanOriginalName).toLowerCase();

  const isExtAllowed = allowedExtensions.includes(ext);
  const isMimeAllowed = allowedMimeTypes.includes(file.mimetype.toLowerCase());

  if (isExtAllowed && isMimeAllowed) {
    return cb(null, true);
  }

  const err = new Error('Unsupported file type. Only PDF, TXT, DOC, DOCX, JPG, PNG, and ZIP files are allowed.');
  err.code = 'UNSUPPORTED_FILE_TYPE';
  return cb(err, false);
};

// 10 MB maximum file size limit
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter
});

module.exports = {
  upload,
  uploadDir
};
