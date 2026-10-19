const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const {
  uploadFile,
  getFiles,
  getFileById,
  downloadFile,
  deleteFile,
  getTrashFiles,
  restoreFile,
  permanentDeleteFile,
  emptyTrash,
  toggleStar,
  toggleShare,
  getPublicFile,
  downloadPublicFile,
  getStorageAnalytics
} = require('../controllers/fileController');

// Multer error handling wrapper
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'File too large. Maximum allowed file size is 10 MB.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            message: 'Unexpected file field. Please upload the file under the form field named "file".'
          });
        }
        return res.status(400).json({
          message: `Upload error: ${err.message}`
        });
      }

      if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(400).json({
          message: err.message
        });
      }

      return res.status(400).json({
        message: err.message || 'File upload failed'
      });
    }

    next();
  });
};

// 1. Upload
router.post('/upload', protect, handleUpload, uploadFile);

// 2. Storage Analytics Dashboard (Specific route before :id)
router.get('/analytics', protect, getStorageAnalytics);

// 3. Recycle Bin Routes (Specific routes before :id)
router.get('/trash', protect, getTrashFiles);
router.delete('/trash/empty', protect, emptyTrash);

// 4. Public Shareable Links (No JWT required)
router.get('/public/:shareToken', getPublicFile);
router.get('/public/:shareToken/download', downloadPublicFile);

// 5. Active Files List
router.get('/', protect, getFiles);

// 6. Single File Details & Actions
router.get('/:id', protect, getFileById);
router.get('/:id/download', protect, downloadFile);
router.patch('/:id/restore', protect, restoreFile);
router.patch('/:id/star', protect, toggleStar);
router.post('/:id/share', protect, toggleShare);
router.delete('/:id/permanent', protect, permanentDeleteFile);
router.delete('/:id', protect, deleteFile); // Soft delete (Recycle Bin)

module.exports = router;
