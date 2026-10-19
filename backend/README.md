# Cloud File Storage System — Backend (MERN Stack)

A secure, multi-user cloud file storage backend (similar to Google Drive) built with **Node.js**, **Express.js**, **MongoDB Atlas**, **Mongoose**, **JWT**, and **Multer**.

---

## 📋 Features

- **User Authentication**: Secure user registration and login with `bcryptjs` password hashing and signed JSON Web Tokens (`jsonwebtoken`).
- **Private File Storage**: Upload files (PDF, TXT, DOC, DOCX, JPG, PNG, ZIP) up to **10 MB**.
- **Multi-User Isolation**: Each user can strictly view, download, and delete only their own uploaded files. Cross-user access is completely blocked (`404 Not Found`).
- **Safe Server Storage**: Files are stored in a dedicated local `uploads/` directory with unique server-generated filenames (`timestamp-randomHash.ext`).
- **Path Traversal Protection**: User original filenames are sanitized and never used for filesystem operations.
- **Fail-Safe Cleanup**: Physical files are automatically cleaned up from disk if database saving fails or upon explicit user deletion.
- **CORS Enabled**: Ready for frontend integration with React, Vue, or vanilla HTML/JavaScript.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express.js
- **Database**: MongoDB (Local or MongoDB Atlas)
- **ODM**: Mongoose
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **File Uploads**: `multer`
- **CORS Middleware**: `cors`

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js** v18+ installed
- A **MongoDB Atlas** account (or local MongoDB running on port 27017)

### 2. Navigate to Backend Directory
Open Command Prompt / PowerShell:
```cmd
cd /d D:\cloudFileProject\backend
```

### 3. Install Dependencies
```cmd
npm install
```

### 4. Configure Environment Variables
Create or verify your `.env` file in `D:\cloudFileProject\backend\.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/cloud_file_storage?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
```

*(See `.env.example` for reference).*

### 5. Start the Server
- **Development mode (with nodemon live reload)**:
  ```cmd
  npm run dev
  ```
- **Production mode**:
  ```cmd
  npm start
  ```
- **Run automated test suite (39 automated tests)**:
  ```cmd
  npm test
  ```

---

## 📡 API Reference

All requests and responses use JSON, except file upload which uses `multipart/form-data`.

### 1. Health Check
| Endpoint | Method | Access | Description |
| :--- | :---: | :---: | :--- |
| `/api/test` | `GET` | Public | Verify backend server status |

**Response (200 OK):**
```json
{
  "message": "Cloud File Storage backend is running"
}
```

---

### 2. Authentication Endpoints

#### Register User
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Access**: Public
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "6ad4521bdcc23568e21df3b8",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-10-18T05:00:00.000Z"
    }
  }
  ```

#### Login User
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6ad4521bdcc23568e21df3b8",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-10-18T05:00:00.000Z"
    }
  }
  ```

#### Get Authenticated User Profile
- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Access**: Private (Requires `Authorization: Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "6ad4521bdcc23568e21df3b8",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-10-18T05:00:00.000Z"
    }
  }
  ```

---

### 3. File Management Endpoints

> **Note**: All file routes require the header `Authorization: Bearer <your_jwt_token>`.

#### Upload File
- **URL**: `/api/files/upload`
- **Method**: `POST`
- **Access**: Private
- **Headers**:
  - `Authorization`: `Bearer <token>`
- **Body**: `multipart/form-data` with field named `file`.
- **Allowed Formats**: `.pdf`, `.txt`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png`, `.zip` (Max: 10 MB).
- **Response (201 Created):**
  ```json
  {
    "message": "File uploaded successfully",
    "file": {
      "id": "6ad45288dc0f430f0b196ae1",
      "originalName": "final_presentation.pdf",
      "mimeType": "application/pdf",
      "size": 524288,
      "uploadedAt": "2026-10-18T05:10:00.000Z"
    }
  }
  ```

#### List All Files
- **URL**: `/api/files`
- **Method**: `GET`
- **Access**: Private
- **Response (200 OK):**
  ```json
  {
    "count": 1,
    "files": [
      {
        "id": "6ad45288dc0f430f0b196ae1",
        "originalName": "final_presentation.pdf",
        "size": 524288,
        "mimeType": "application/pdf",
        "uploadedAt": "2026-10-18T05:10:00.000Z"
      }
    ]
  }
  ```

#### Get File Details
- **URL**: `/api/files/:id`
- **Method**: `GET`
- **Access**: Private
- **Response (200 OK):**
  ```json
  {
    "file": {
      "id": "6ad45288dc0f430f0b196ae1",
      "originalName": "final_presentation.pdf",
      "size": 524288,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-10-18T05:10:00.000Z"
    }
  }
  ```

#### Download File
- **URL**: `/api/files/:id/download`
- **Method**: `GET`
- **Access**: Private
- **Response (200 OK)**: File stream with `Content-Disposition: attachment; filename="<originalName>"`.

#### Delete File
- **URL**: `/api/files/:id`
- **Method**: `DELETE`
- **Access**: Private
- **Response (200 OK):**
  ```json
  {
    "message": "File deleted successfully",
    "fileId": "6ad45288dc0f430f0b196ae1"
  }
  ```

---

## 📮 Postman Testing Guide

### 1. Register a User
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/register`
- **Body** $\rightarrow$ `raw` $\rightarrow$ `JSON`:
  ```json
  {
    "name": "Jane",
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```

### 2. Login & Copy Token
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/login`
- **Body** $\rightarrow$ `raw` $\rightarrow$ `JSON`:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Copy** the `token` string from the response.

### 3. Setting Authorization in Postman
For all subsequent private endpoints:
1. Go to the **Authorization** tab.
2. Select **Bearer Token**.
3. Paste your token in the **Token** field.

### 4. Upload a File
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/files/upload`
- **Authorization**: Bearer Token
- **Body** $\rightarrow$ select `form-data`:
  - **Key**: `file` (Change dropdown on hover from *Text* to *File*).
  - **Value**: Click *Select Files* and pick a `.pdf`, `.jpg`, `.txt`, etc. (< 10MB).
- Click **Send**.

### 5. Download a File
- **Method**: `GET`
- **URL**: `http://localhost:5000/api/files/<file_id>/download`
- **Authorization**: Bearer Token
- Click the dropdown arrow next to **Send** $\rightarrow$ select **Send and Download**.

---

## 💻 Frontend Fetch API Integration Examples

Here are simple, ready-to-use JavaScript Fetch API examples for connecting any frontend (HTML, React, Vue, etc.):

### 1. User Registration
```javascript
async function registerUser(name, email, password) {
  const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  return await response.json();
}
```

### 2. User Login & Token Storage
```javascript
async function loginUser(email, password) {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (response.ok) {
    // Save token in browser storage
    localStorage.setItem('token', data.token);
  }
  return data;
}
```

### 3. Upload a File (FormData)
```javascript
async function uploadFile(fileInput) {
  const token = localStorage.getItem('token');
  const file = fileInput.files[0];

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:5000/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Do NOT set Content-Type header manually when using FormData!
    },
    body: formData
  });

  return await response.json();
}
```

### 4. List Files
```javascript
async function fetchMyFiles() {
  const token = localStorage.getItem('token');

  const response = await fetch('http://localhost:5000/api/files', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}
```

### 5. Download a File
```javascript
async function downloadFile(fileId, originalName) {
  const token = localStorage.getItem('token');

  const response = await fetch(`http://localhost:5000/api/files/${fileId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  // Convert response to Blob and trigger browser download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
```

### 6. Delete a File
```javascript
async function deleteFile(fileId) {
  const token = localStorage.getItem('token');

  const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}
```

---

## 🔒 Security Architecture Highlights

1. **Passwords**: Salted & hashed using `bcryptjs` (Cost factor 10) before hitting database.
2. **Tokens**: Stateless signed JWTs with 7-day expiration.
3. **Paths**: Physical files stored by unique generated hashes. Raw user paths are stripped using `path.basename` to prevent directory traversal (`../../`).
4. **Error Sanitization**: Server stack traces and internal filesystem paths are never leaked in API error responses.
5. **NoSQL Injection Guard**: Input field types are strictly checked to prevent query selector injections.
