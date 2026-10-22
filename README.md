# Cloud File Storage System — Full MERN Stack Cloud Project

A secure, multi-user cloud file storage application (Google Drive clone) built with **MongoDB Atlas (AWS)**, **Express.js**, **React.js (Vite)**, and **Node.js**.

---

## 🌟 Unique Features (Differentiating from standard projects)

1. **🗑️ Recycle Bin (Trash System & Soft Delete)**:
   - Deleting a file moves it to the **Recycle Bin** instead of deleting it immediately.
   - Users can **Restore** files back to My Drive anytime.
   - Users can **Permanently Delete** individual files or click **Empty Recycle Bin** to clear disk space.

2. **📊 Cloud Storage Analytics Dashboard**:
   - Visual breakdown of cloud storage consumption by category:
     - 📄 **Documents** (PDF, TXT, DOC, DOCX)
     - 🖼️ **Images** (PNG, JPG, JPEG)
     - 📦 **Archives** (ZIP)
     - 📎 **Other files**
   - Statistics for **Active Files Count**, **Trashed Files Count**, **Storage Quota Percentage (50 MB)**, and **Largest File Uploaded**.

3. **🔗 Public Shareable Link Generator**:
   - Users can click **Share** on any file to generate a unique public link (`/api/files/public/:shareToken/download`).
   - Anyone with the link can download the file without an account (demonstrating cloud file sharing permissions).
   - The owner can revoke/disable public sharing at any time with one click.

4. **⭐ Starred / Favorite Files**:
   - One-click file starring to organize and quickly filter important documents.

5. **🔍 Instant Live Search & Category Filtering**:
   - Instant search bar that filters files in real-time by filename.

6. **🔒 Multi-Tenant Cloud Security**:
   - Strict data isolation: User A can never see, access, download, or delete User B's files.
   - Hashed passwords via `bcryptjs`, signed `JWT` authentication, and path traversal prevention.

---

## 🛠️ Complete API Reference

### Authentication
- `POST /api/auth/register` — Register new user account.
- `POST /api/auth/login` — Sign in and receive JWT Bearer token.
- `GET /api/auth/me` — Get authenticated user profile (Protected).

### File Management
- `POST /api/files/upload` — Upload file (up to 10MB, PDF/JPG/PNG/DOCX/ZIP/TXT) (Protected).
- `GET /api/files` — List active user files (Protected).
- `GET /api/files/:id` — Get single file details (Protected).
- `GET /api/files/:id/download` — Download file (Protected).
- `DELETE /api/files/:id` — Move file to Recycle Bin (Soft Delete) (Protected).

### Recycle Bin (Trash)
- `GET /api/files/trash` — List all trashed files in Recycle Bin (Protected).
- `PATCH /api/files/:id/restore` — Restore file back to My Drive (Protected).
- `DELETE /api/files/:id/permanent` — Permanently delete physical file and DB record (Protected).
- `DELETE /api/files/trash/empty` — Permanently delete all trashed files (Protected).

### Starred & Public Sharing
- `PATCH /api/files/:id/star` — Toggle Star/Favorite status (Protected).
- `POST /api/files/:id/share` — Toggle public share link on/off (Protected).
- `GET /api/files/public/:shareToken` — View public file info (Public, no login).
- `GET /api/files/public/:shareToken/download` — Download shared file (Public, no login).

### Analytics Dashboard
- `GET /api/files/analytics` — Detailed storage usage breakdown by category and file size (Protected).

---

## 🚀 How to Run the Project

### One-Click Run (Easiest)
Double-click:
📁 `D:\cloudFileProject\start-project.bat`

### Manual Run (2 Terminals)
**Terminal 1 (Backend)**:
```cmd
cd /d D:\cloudFileProject\backend
npm run dev
```

**Terminal 2 (Frontend)**:
```cmd
cd /d D:\cloudFileProject\frontend
npm run dev
```

Open your browser:
👉 **http://localhost:3000**

Live Demo of this project
https://cloud-file-storage-gilt.vercel.app
