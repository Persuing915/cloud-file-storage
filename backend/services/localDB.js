const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const dataDir = path.resolve(__dirname, '..', 'data');
const usersFilePath = path.join(dataDir, 'users.json');
const filesFilePath = path.join(dataDir, 'files.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readJSON(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return content ? JSON.parse(content) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
  }
}

// Wrap a user object with mongoose-like methods
function wrapUser(userObj) {
  if (!userObj) return null;
  return {
    ...userObj,
    _id: userObj._id.toString(),
    async matchPassword(enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    }
  };
}

// Wrap a file object with mongoose-like methods
function wrapFile(fileObj) {
  if (!fileObj) return null;
  const instance = {
    ...fileObj,
    _id: fileObj._id.toString(),
    owner: fileObj.owner ? fileObj.owner.toString() : null,
    async save() {
      const allFiles = readJSON(filesFilePath, []);
      const index = allFiles.findIndex(f => f._id.toString() === this._id.toString());
      const cleanData = { ...this };
      delete cleanData.save;
      if (index >= 0) {
        allFiles[index] = cleanData;
      } else {
        allFiles.push(cleanData);
      }
      writeJSON(filesFilePath, allFiles);
      return this;
    }
  };
  return instance;
}

class QueryChain {
  constructor(promise) {
    this.promise = promise;
  }

  sort(sortCriteria) {
    this.promise = this.promise.then(result => {
      if (!Array.isArray(result)) return result;
      return [...result].sort((a, b) => {
        for (const [key, dir] of Object.entries(sortCriteria)) {
          const valA = a[key] instanceof Date ? a[key].getTime() : (new Date(a[key]).getTime() || a[key]);
          const valB = b[key] instanceof Date ? b[key].getTime() : (new Date(b[key]).getTime() || b[key]);
          if (valA < valB) return dir === -1 ? 1 : -1;
          if (valA > valB) return dir === -1 ? -1 : 1;
        }
        return 0;
      });
    });
    return this;
  }

  select(fields) {
    if (typeof fields === 'string' && fields.includes('-password')) {
      this.promise = this.promise.then(item => {
        if (!item) return item;
        const copy = { ...item };
        delete copy.password;
        return copy;
      });
    }
    return this;
  }

  then(onResolve, onReject) {
    return this.promise.then(onResolve, onReject);
  }

  catch(onReject) {
    return this.promise.catch(onReject);
  }
}

const localUserStore = {
  async findOne(query = {}) {
    const users = readJSON(usersFilePath, []);
    const found = users.find(u => {
      if (query.email && u.email.toLowerCase() !== query.email.toLowerCase()) return false;
      if (query._id && u._id.toString() !== query._id.toString()) return false;
      return true;
    });
    return wrapUser(found);
  },

  findById(id) {
    const promise = (async () => {
      const users = readJSON(usersFilePath, []);
      const found = users.find(u => u._id.toString() === (id ? id.toString() : ''));
      return wrapUser(found);
    })();
    return new QueryChain(promise);
  },

  async create({ name, email, password }) {
    const users = readJSON(usersFilePath, []);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      _id: crypto.randomBytes(12).toString('hex'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON(usersFilePath, users);
    return wrapUser(newUser);
  }
};

const localFileStore = {
  find(query = {}) {
    const promise = (async () => {
      const files = readJSON(filesFilePath, []);
      const filtered = files.filter(f => {
        if (query.owner && f.owner && f.owner.toString() !== query.owner.toString()) return false;
        if (query.isTrash === true && !f.isTrash) return false;
        if (query.isTrash === false && f.isTrash) return false;
        if (query.isTrash && query.isTrash.$ne === true && f.isTrash) return false;
        if (query.isStarred === true && !f.isStarred) return false;
        return true;
      });
      return filtered.map(wrapFile);
    })();
    return new QueryChain(promise);
  },

  findOne(query = {}) {
    const promise = (async () => {
      const files = readJSON(filesFilePath, []);
      const found = files.find(f => {
        if (query._id && f._id.toString() !== query._id.toString()) return false;
        if (query.owner && f.owner && f.owner.toString() !== query.owner.toString()) return false;
        if (query.shareToken && f.shareToken !== query.shareToken) return false;
        if (query.isShared !== undefined && f.isShared !== query.isShared) return false;
        if (query.isTrash === true && !f.isTrash) return false;
        if (query.isTrash === false && f.isTrash) return false;
        if (query.isTrash && query.isTrash.$ne === true && f.isTrash) return false;
        return true;
      });
      return wrapFile(found);
    })();
    return new QueryChain(promise);
  },

  async create(fileData) {
    const files = readJSON(filesFilePath, []);
    const newFile = {
      _id: crypto.randomBytes(12).toString('hex'),
      owner: fileData.owner ? fileData.owner.toString() : null,
      originalName: fileData.originalName,
      storageName: fileData.storageName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      uploadedAt: new Date().toISOString(),
      isTrash: false,
      trashedAt: null,
      isStarred: false,
      isShared: false,
      shareToken: null
    };

    files.push(newFile);
    writeJSON(filesFilePath, files);
    return wrapFile(newFile);
  },

  async deleteOne(query = {}) {
    const files = readJSON(filesFilePath, []);
    const initialLen = files.length;
    const remaining = files.filter(f => {
      if (query._id && f._id.toString() === query._id.toString()) return false;
      return true;
    });
    writeJSON(filesFilePath, remaining);
    return { deletedCount: initialLen - remaining.length };
  },

  async deleteMany(query = {}) {
    const files = readJSON(filesFilePath, []);
    const initialLen = files.length;
    const remaining = files.filter(f => {
      if (query.owner && f.owner && f.owner.toString() === query.owner.toString()) {
        if (query.isTrash === true && f.isTrash) return false;
      }
      return true;
    });
    writeJSON(filesFilePath, remaining);
    return { deletedCount: initialLen - remaining.length };
  }
};

module.exports = {
  localUserStore,
  localFileStore
};
