const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const File = require('../models/File');
const { uploadDir } = require('../middleware/uploadMiddleware');

const MAX_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB quota

/**
 * @desc    Upload a single file and store metadata
 * @route   POST /api/files/upload
 * @access  Private (Requires JWT)
 */
const uploadFile = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'Please provide a file to upload in the field named "file"'
    });
  }

  const uploadedFilePath = req.file.path;

  try {
    const cleanOriginalName = path.basename(req.file.originalname);

    const fileRecord = await File.create({
      owner: req.user._id,
      originalName: cleanOriginalName,
      storageName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord._id,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        uploadedAt: fileRecord.uploadedAt,
        isStarred: fileRecord.isStarred,
        isShared: fileRecord.isShared
      }
    });
  } catch (error) {
    if (fs.existsSync(uploadedFilePath)) {
      try {
        await fs.promises.unlink(uploadedFilePath);
      } catch (cleanupErr) {
        console.error('Failed to remove uploaded file after error:', cleanupErr.message);
      }
    }
    next(error);
  }
};

/**
 * @desc    Get all active files (excluding Recycle Bin)
 * @route   GET /api/files
 * @access  Private (Requires JWT)
 */
const getFiles = async (req, res, next) => {
  try {
    const files = await File.find({
      owner: req.user._id,
      isTrash: { $ne: true }
    })
      .sort({ uploadedAt: -1 })
      .select('originalName size mimeType uploadedAt isStarred isShared shareToken _id');

    const formattedFiles = files.map((file) => ({
      id: file._id,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      isStarred: !!file.isStarred,
      isShared: !!file.isShared,
      shareToken: file.shareToken || null
    }));

    return res.status(200).json({
      count: formattedFiles.length,
      files: formattedFiles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details for a single file
 * @route   GET /api/files/:id
 * @access  Private (Requires JWT)
 */
const getFileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid file ID format'
      });
    }

    const file = await File.findOne({
      _id: id,
      owner: req.user._id
    }).select('originalName size mimeType uploadedAt isTrash isStarred isShared shareToken _id');

    if (!file) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    return res.status(200).json({
      file: {
        id: file._id,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        isTrash: !!file.isTrash,
        isStarred: !!file.isStarred,
        isShared: !!file.isShared,
        shareToken: file.shareToken || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download a file by ID
 * @route   GET /api/files/:id/download
 * @access  Private (Requires JWT)
 */
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid file ID format'
      });
    }

    const file = await File.findOne({
      _id: id,
      owner: req.user._id
    });

    if (!file) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    const safeStorageName = path.basename(file.storageName);
    const resolvedPath = path.resolve(uploadDir, safeStorageName);

    if (!resolvedPath.startsWith(uploadDir)) {
      return res.status(403).json({
        message: 'Access denied: Invalid file path'
      });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        message: 'Physical file not found on server'
      });
    }

    return res.download(resolvedPath, file.originalName, (err) => {
      if (err && !res.headersSent) {
        return res.status(500).json({
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete: Move file to Recycle Bin
 * @route   DELETE /api/files/:id
 * @access  Private (Requires JWT)
 */
const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid file ID format'
      });
    }

    const file = await File.findOne({
      _id: id,
      owner: req.user._id,
      isTrash: { $ne: true }
    });

    if (!file) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    file.isTrash = true;
    file.trashedAt = new Date();
    await file.save();

    return res.status(200).json({
      message: 'File moved to Recycle Bin',
      fileId: file._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all files in the Recycle Bin
 * @route   GET /api/files/trash
 * @access  Private (Requires JWT)
 */
const getTrashFiles = async (req, res, next) => {
  try {
    const trashFiles = await File.find({
      owner: req.user._id,
      isTrash: true
    })
      .sort({ trashedAt: -1 })
      .select('originalName size mimeType uploadedAt trashedAt _id');

    const formatted = trashFiles.map((f) => ({
      id: f._id,
      originalName: f.originalName,
      size: f.size,
      mimeType: f.mimeType,
      uploadedAt: f.uploadedAt,
      trashedAt: f.trashedAt
    }));

    return res.status(200).json({
      count: formatted.length,
      files: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Restore file from Recycle Bin
 * @route   PATCH /api/files/:id/restore
 * @access  Private (Requires JWT)
 */
const restoreFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid file ID format'
      });
    }

    const file = await File.findOne({
      _id: id,
      owner: req.user._id,
      isTrash: true
    });

    if (!file) {
      return res.status(404).json({
        message: 'File not found in Recycle Bin'
      });
    }

    file.isTrash = false;
    file.trashedAt = null;
    await file.save();

    return res.status(200).json({
      message: 'File restored successfully',
      fileId: file._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently delete a file from disk and database
 * @route   DELETE /api/files/:id/permanent
 * @access  Private (Requires JWT)
 */
const permanentDeleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid file ID format'
      });
    }

    const file = await File.findOne({
      _id: id,
      owner: req.user._id
    });

    if (!file) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    const safeStorageName = path.basename(file.storageName);
    const resolvedPath = path.resolve(uploadDir, safeStorageName);

    if (fs.existsSync(resolvedPath)) {
      try {
        await fs.promises.unlink(resolvedPath);
      } catch (unlinkErr) {
        console.error('Error unlinking physical file:', unlinkErr.message);
      }
    }

    await File.deleteOne({ _id: file._id });

    return res.status(200).json({
      message: 'File permanently deleted',
      fileId: file._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Empty entire Recycle Bin (permanently deletes all trashed files)
 * @route   DELETE /api/files/trash/empty
 * @access  Private (Requires JWT)
 */
const emptyTrash = async (req, res, next) => {
  try {
    const trashedFiles = await File.find({
      owner: req.user._id,
      isTrash: true
    });

    let deletedCount = 0;
    for (const file of trashedFiles) {
      const safeStorageName = path.basename(file.storageName);
      const resolvedPath = path.resolve(uploadDir, safeStorageName);
      if (fs.existsSync(resolvedPath)) {
        try {
          await fs.promises.unlink(resolvedPath);
        } catch (_) {}
      }
      await File.deleteOne({ _id: file._id });
      deletedCount++;
    }

    return res.status(200).json({
      message: `Recycle Bin emptied successfully. ${deletedCount} file(s) permanently deleted.`,
      deletedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Star / Favorite status
 * @route   PATCH /api/files/:id/star
 * @access  Private (Requires JWT)
 */
const toggleStar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid file ID format'
      });
    }

    const file = await File.findOne({
      _id: id,
      owner: req.user._id,
      isTrash: { $ne: true }
    });

    if (!file) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    file.isStarred = !file.isStarred;
    await file.save();

    return res.status(200).json({
      message: file.isStarred ? 'File added to Starred' : 'File removed from Starred',
      isStarred: file.isStarred,
      fileId: file._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Public Shareable Link
 * @route   POST /api/files/:id/share
 * @access  Private (Requires JWT)
 */
const toggleShare = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid file ID format'
      });
    }

    const file = await File.findOne({
      _id: id,
      owner: req.user._id,
      isTrash: { $ne: true }
    });

    if (!file) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    if (!file.isShared) {
      file.isShared = true;
      file.shareToken = crypto.randomBytes(16).toString('hex');
    } else {
      file.isShared = false;
      file.shareToken = null;
    }

    await file.save();

    return res.status(200).json({
      message: file.isShared ? 'Public link generated' : 'Public link disabled',
      isShared: file.isShared,
      shareToken: file.shareToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public file metadata (No auth required)
 * @route   GET /api/files/public/:shareToken
 * @access  Public
 */
const getPublicFile = async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const file = await File.findOne({
      shareToken,
      isShared: true,
      isTrash: { $ne: true }
    }).select('originalName size mimeType uploadedAt _id');

    if (!file) {
      return res.status(404).json({
        message: 'Shared file not found or sharing has been disabled'
      });
    }

    return res.status(200).json({
      file: {
        id: file._id,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download public file (No auth required)
 * @route   GET /api/files/public/:shareToken/download
 * @access  Public
 */
const downloadPublicFile = async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const file = await File.findOne({
      shareToken,
      isShared: true,
      isTrash: { $ne: true }
    });

    if (!file) {
      return res.status(404).json({
        message: 'Shared file not found or sharing disabled'
      });
    }

    const safeStorageName = path.basename(file.storageName);
    const resolvedPath = path.resolve(uploadDir, safeStorageName);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        message: 'Physical file not found on server'
      });
    }

    return res.download(resolvedPath, file.originalName);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Storage Analytics Dashboard Data
 * @route   GET /api/files/analytics
 * @access  Private (Requires JWT)
 */
const getStorageAnalytics = async (req, res, next) => {
  try {
    const activeFiles = await File.find({
      owner: req.user._id,
      isTrash: { $ne: true }
    });

    const trashFiles = await File.find({
      owner: req.user._id,
      isTrash: true
    });

    const activeSize = activeFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const trashSize = trashFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const totalStorageUsed = activeSize + trashSize;

    const breakdown = {
      documents: { count: 0, size: 0 },
      images: { count: 0, size: 0 },
      archives: { count: 0, size: 0 },
      others: { count: 0, size: 0 }
    };

    let largestFile = null;

    activeFiles.forEach((file) => {
      const mime = (file.mimeType || '').toLowerCase();
      const s = file.size || 0;

      if (!largestFile || s > largestFile.size) {
        largestFile = {
          name: file.originalName,
          size: s,
          mimeType: file.mimeType
        };
      }

      if (/pdf|text|msword|wordprocessingml/i.test(mime)) {
        breakdown.documents.count++;
        breakdown.documents.size += s;
      } else if (/image/i.test(mime)) {
        breakdown.images.count++;
        breakdown.images.size += s;
      } else if (/zip/i.test(mime)) {
        breakdown.archives.count++;
        breakdown.archives.size += s;
      } else {
        breakdown.others.count++;
        breakdown.others.size += s;
      }
    });

    return res.status(200).json({
      analytics: {
        totalStorageUsed,
        activeSize,
        trashSize,
        maxStorage: MAX_STORAGE_BYTES,
        percentageUsed: Math.min(100, parseFloat(((totalStorageUsed / MAX_STORAGE_BYTES) * 100).toFixed(1))),
        activeCount: activeFiles.length,
        trashCount: trashFiles.length,
        breakdown,
        largestFile
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
