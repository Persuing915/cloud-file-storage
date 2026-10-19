const mongoose = require('mongoose');
const { localFileStore } = require('../services/localDB');

const fileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'File owner is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  storageName: {
    type: String,
    required: [true, 'Storage name is required'],
    unique: true
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // Recycle Bin / Soft Delete
  isTrash: {
    type: Boolean,
    default: false
  },
  trashedAt: {
    type: Date,
    default: null
  },
  // Starred / Favorites feature
  isStarred: {
    type: Boolean,
    default: false
  },
  // Public Shareable Link feature
  isShared: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    default: null
  }
});

const MongooseFile = mongoose.model('File', fileSchema);

// Intelligent Hybrid Proxy: routes to MongoDB Atlas when connected, or local fallback when offline
const FileProxy = new Proxy(MongooseFile, {
  get(target, prop, receiver) {
    if (mongoose.connection.readyState !== 1 && localFileStore[prop]) {
      return localFileStore[prop].bind(localFileStore);
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});

module.exports = FileProxy;
