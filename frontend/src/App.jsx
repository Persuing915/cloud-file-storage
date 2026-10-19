import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  Folder,
  FileText,
  Image as ImageIcon,
  Archive,
  Upload,
  Download,
  Trash2,
  Search,
  LogOut,
  HardDrive,
  LayoutGrid,
  List as ListIcon,
  Star,
  Share2,
  RotateCcw,
  BarChart3,
  X,
  Copy,
  Check,
  File as GenericFile
} from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000');
const MAX_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB

// Safe API Fetch helper
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || res.statusText };
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { message: 'Cannot connect to backend server. Please verify backend is running on port 5000.' }
    };
  }
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [trashFiles, setTrashFiles] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Navigation & Views
  const [activeTab, setActiveTab] = useState('drive'); // 'drive' | 'starred' | 'trash' | 'analytics'
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'documents' | 'images' | 'archives'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Share Modal State
  const [sharingFile, setSharingFile] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auth Form State
  const [authTab, setAuthTab] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const fileInputRef = useRef(null);

  const notify = (text, type = 'success') => {
    setStatusMessage({ text, type });
    if (type !== 'error') {
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchFiles();
      fetchTrash();
      fetchAnalytics();
    }
  }, [token]);

  // Load User Profile
  const fetchUserProfile = async () => {
    const { ok, status, data } = await apiFetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (status === 401) {
      handleLogout();
      return;
    }
    if (ok && data.user) setUser(data.user);
  };

  // Load Active Files
  const fetchFiles = async () => {
    const { ok, status, data } = await apiFetch(`${API_BASE}/files`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (status === 401) {
      handleLogout();
      return;
    }
    if (ok && data.files) setFiles(data.files);
  };

  // Load Recycle Bin (Trash) Files
  const fetchTrash = async () => {
    const { ok, data } = await apiFetch(`${API_BASE}/files/trash`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (ok && data.files) setTrashFiles(data.files);
  };

  // Load Analytics Data
  const fetchAnalytics = async () => {
    const { ok, data } = await apiFetch(`${API_BASE}/files/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (ok && data.analytics) setAnalytics(data.analytics);
  };

  const refreshAll = () => {
    fetchFiles();
    fetchTrash();
    fetchAnalytics();
  };

  // 1. Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setStatusMessage(null);

    const { ok, data } = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPassword })
    });

    setAuthLoading(false);
    if (!ok) {
      notify(data.message || 'Login failed', 'error');
      return;
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    notify('Logged in successfully!');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setStatusMessage(null);

    const { ok, data } = await apiFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
    });

    setAuthLoading(false);
    if (!ok) {
      notify(data.message || 'Registration failed', 'error');
      return;
    }

    notify('Account created! Please sign in.', 'success');
    setAuthTab('login');
    setAuthEmail(authEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setFiles([]);
    setTrashFiles([]);
    setAnalytics(null);
  };

  // 2. Upload Handler
  const handleUploadFile = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      notify('File too large! Maximum allowed size is 10 MB.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    notify(`Uploading "${file.name}"...`, 'info');

    try {
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      notify(`"${data.file.originalName}" uploaded successfully!`);
      refreshAll();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      notify(err.message || 'Upload failed', 'error');
    }
  };

  // 3. Download Handler
  const handleDownloadFile = async (fileId, originalName) => {
    try {
      const res = await fetch(`${API_BASE}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // 4. Recycle Bin: Soft Delete
  const handleMoveToTrash = async (fileId, originalName) => {
    const { ok, data } = await apiFetch(`${API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!ok) {
      notify(data.message || 'Failed to move to trash', 'error');
      return;
    }

    notify(`"${originalName}" moved to Recycle Bin.`);
    refreshAll();
  };

  // 5. Recycle Bin: Restore File
  const handleRestoreFile = async (fileId, originalName) => {
    const { ok, data } = await apiFetch(`${API_BASE}/files/${fileId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!ok) {
      notify(data.message || 'Failed to restore file', 'error');
      return;
    }

    notify(`"${originalName}" restored to My Drive.`);
    refreshAll();
  };

  // 6. Recycle Bin: Permanent Delete
  const handlePermanentDelete = async (fileId, originalName) => {
    if (!window.confirm(`Permanently delete "${originalName}"? This cannot be undone.`)) return;

    const { ok, data } = await apiFetch(`${API_BASE}/files/${fileId}/permanent`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!ok) {
      notify(data.message || 'Permanent deletion failed', 'error');
      return;
    }

    notify(`"${originalName}" permanently deleted.`);
    refreshAll();
  };

  // 7. Recycle Bin: Empty Trash
  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty entire Recycle Bin? All trashed files will be permanently deleted.')) return;

    const { ok, data } = await apiFetch(`${API_BASE}/files/trash/empty`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!ok) {
      notify(data.message || 'Failed to empty trash', 'error');
      return;
    }

    notify(data.message || 'Recycle Bin emptied.');
    refreshAll();
  };

  // 8. Star / Favorite Toggle
  const handleToggleStar = async (fileId) => {
    const { ok, data } = await apiFetch(`${API_BASE}/files/${fileId}/star`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (ok) {
      setFiles(files.map(f => f.id === fileId ? { ...f, isStarred: data.isStarred } : f));
      notify(data.message);
    }
  };

  // 9. Public Share Toggle
  const handleToggleShare = async (file) => {
    const { ok, data } = await apiFetch(`${API_BASE}/files/${file.id}/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (ok) {
      setSharingFile({
        ...file,
        isShared: data.isShared,
        shareToken: data.shareToken
      });
      fetchFiles();
      notify(data.message);
    }
  };

  // Copy Public Link
  const copyShareLink = (shareToken) => {
    const link = `${BACKEND_BASE}/api/files/public/${shareToken}/download`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Drag & drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Storage calculation
  const totalStorageUsed = files.reduce((acc, f) => acc + (f.size || 0), 0) + trashFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const storagePercentage = Math.min(100, Math.round((totalStorageUsed / MAX_STORAGE_BYTES) * 100));

  // Category counts
  const categoryCounts = {
    all: files.length,
    starred: files.filter(f => f.isStarred).length,
    documents: files.filter(f => /pdf|text|msword|wordprocessingml/i.test(f.mimeType)).length,
    images: files.filter(f => /image/i.test(f.mimeType)).length,
    archives: files.filter(f => /zip/i.test(f.mimeType)).length,
    trash: trashFiles.length
  };

  // Filtered files depending on activeTab and activeCategory
  const displayedFiles = (activeTab === 'starred' ? files.filter(f => f.isStarred) : files).filter((f) => {
    let matchesCategory = true;
    if (activeCategory === 'documents') {
      matchesCategory = /pdf|text|msword|wordprocessingml/i.test(f.mimeType);
    } else if (activeCategory === 'images') {
      matchesCategory = /image/i.test(f.mimeType);
    } else if (activeCategory === 'archives') {
      matchesCategory = /zip/i.test(f.mimeType);
    }
    const matchesSearch = f.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getFileIcon = (mimeType) => {
    if (/pdf/i.test(mimeType)) return <FileText size={20} color="#ea4335" />;
    if (/image/i.test(mimeType)) return <ImageIcon size={20} color="#34a853" />;
    if (/zip/i.test(mimeType)) return <Archive size={20} color="#fbbc05" />;
    if (/text|word/i.test(mimeType)) return <FileText size={20} color="#1a73e8" />;
    return <GenericFile size={20} color="#5f6368" />;
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Auth Screen
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1><Cloud size={32} /> CloudDrive</h1>
            <p style={{ color: '#5f6368', fontSize: '0.9rem' }}>Secure Cloud File Storage</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthTab('login'); setStatusMessage(null); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthTab('register'); setStatusMessage(null); }}
            >
              Create Account
            </button>
          </div>

          {statusMessage && (
            <div className={`alert-banner ${statusMessage.type}`}>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {authTab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="auth-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              <div className="auth-form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={authLoading}>
                {authLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="auth-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="User"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              </div>
              <div className="auth-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              <div className="auth-form-group">
                <label>Password (at least 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={authLoading}>
                {authLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand" onClick={() => setActiveTab('drive')} style={{ cursor: 'pointer' }}>
          <Cloud size={28} />
          <span>CloudDrive</span>
        </div>

        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search in Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="user-profile">
          <div className="avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-meta">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="app-sidebar">
          <div>
            <div className="upload-btn-container">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.zip"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadFile(e.target.files[0]);
                  }
                }}
              />
              <button
                className="btn-new-upload"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <Upload size={18} />
                <span>Upload File</span>
              </button>
            </div>

            <ul className="nav-links">
              <li
                className={`nav-item ${activeTab === 'drive' && activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => { setActiveTab('drive'); setActiveCategory('all'); }}
              >
                <span className="nav-label">
                  <Folder size={18} />
                  <span>All Files</span>
                </span>
                <span className="nav-count">{categoryCounts.all}</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'starred' ? 'active' : ''}`}
                onClick={() => { setActiveTab('starred'); setActiveCategory('all'); }}
              >
                <span className="nav-label">
                  <Star size={18} color="#fbbc04" />
                  <span>Starred Files</span>
                </span>
                <span className="nav-count">{categoryCounts.starred}</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'drive' && activeCategory === 'documents' ? 'active' : ''}`}
                onClick={() => { setActiveTab('drive'); setActiveCategory('documents'); }}
              >
                <span className="nav-label">
                  <FileText size={18} />
                  <span>Documents</span>
                </span>
                <span className="nav-count">{categoryCounts.documents}</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'drive' && activeCategory === 'images' ? 'active' : ''}`}
                onClick={() => { setActiveTab('drive'); setActiveCategory('images'); }}
              >
                <span className="nav-label">
                  <ImageIcon size={18} />
                  <span>Images</span>
                </span>
                <span className="nav-count">{categoryCounts.images}</span>
              </li>

              <li
                className={`nav-item ${activeTab === 'drive' && activeCategory === 'archives' ? 'active' : ''}`}
                onClick={() => { setActiveTab('drive'); setActiveCategory('archives'); }}
              >
                <span className="nav-label">
                  <Archive size={18} />
                  <span>Archives</span>
                </span>
                <span className="nav-count">{categoryCounts.archives}</span>
              </li>

              <div className="nav-divider"></div>

              {/* Recycle Bin Tab */}
              <li
                className={`nav-item ${activeTab === 'trash' ? 'active' : ''}`}
                onClick={() => setActiveTab('trash')}
              >
                <span className="nav-label">
                  <Trash2 size={18} color="#d93025" />
                  <span>Recycle Bin</span>
                </span>
                <span className="nav-count">{categoryCounts.trash}</span>
              </li>

              {/* Analytics Dashboard Tab */}
              <li
                className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => { setActiveTab('analytics'); fetchAnalytics(); }}
              >
                <span className="nav-label">
                  <BarChart3 size={18} color="#1a73e8" />
                  <span>Storage Analytics</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Quick Storage Card at bottom */}
          <div className="storage-card" onClick={() => { setActiveTab('analytics'); fetchAnalytics(); }}>
            <div className="storage-title">
              <HardDrive size={16} color="#1a73e8" />
              <span>Storage Used</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${storagePercentage}%` }}
              ></div>
            </div>
            <div className="storage-text">
              {formatBytes(totalStorageUsed)} of 50 MB ({storagePercentage}%)
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="app-content">
          {statusMessage && (
            <div className={`alert-banner ${statusMessage.type}`}>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* VIEW 1: RECYCLE BIN */}
          {activeTab === 'trash' ? (
            <div>
              <div className="content-toolbar">
                <div className="section-title">
                  <Trash2 size={22} color="#d93025" />
                  <span>Recycle Bin</span>
                </div>
                {trashFiles.length > 0 && (
                  <button className="btn-action btn-delete" onClick={handleEmptyTrash}>
                    <Trash2 size={14} />
                    <span>Empty Recycle Bin</span>
                  </button>
                )}
              </div>

              <div className="alert-banner info" style={{ marginBottom: 20 }}>
                Files in the Recycle Bin do not appear in My Drive. You can restore them anytime or delete them forever.
              </div>

              {trashFiles.length === 0 ? (
                <div className="empty-state">
                  <Trash2 size={48} className="empty-icon" />
                  <h3>Recycle Bin is empty</h3>
                  <p>Deleted files will stay here until you empty the bin.</p>
                </div>
              ) : (
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Date Deleted</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashFiles.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <div className="file-name-cell">
                            {getFileIcon(file.mimeType)}
                            <span>{file.originalName}</span>
                          </div>
                        </td>
                        <td>{file.mimeType}</td>
                        <td>{formatBytes(file.size)}</td>
                        <td>{file.trashedAt ? new Date(file.trashedAt).toLocaleString() : 'Recently'}</td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn-action btn-restore"
                              onClick={() => handleRestoreFile(file.id, file.originalName)}
                              title="Restore to My Drive"
                            >
                              <RotateCcw size={14} />
                              <span>Restore</span>
                            </button>
                            <button
                              className="btn-action btn-delete"
                              onClick={() => handlePermanentDelete(file.id, file.originalName)}
                              title="Permanently Delete"
                            >
                              <Trash2 size={14} />
                              <span>Delete Forever</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : activeTab === 'analytics' ? (
            /* VIEW 2: STORAGE ANALYTICS DASHBOARD */
            <div>
              <div className="content-toolbar">
                <div className="section-title">
                  <BarChart3 size={22} color="#1a73e8" />
                  <span>Cloud Storage Analytics Dashboard</span>
                </div>
              </div>

              {analytics && (
                <div>
                  {/* Stat Cards */}
                  <div className="analytics-grid">
                    <div className="stat-card">
                      <div className="stat-icon-wrapper" style={{ background: '#e8f0fe', color: '#1a73e8' }}>
                        <HardDrive size={24} />
                      </div>
                      <div>
                        <div className="stat-val">{formatBytes(analytics.totalStorageUsed)}</div>
                        <div className="stat-lbl">Used of {formatBytes(analytics.maxStorage)} ({analytics.percentageUsed}%)</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-wrapper" style={{ background: '#e6f4ea', color: '#137333' }}>
                        <Folder size={24} />
                      </div>
                      <div>
                        <div className="stat-val">{analytics.activeCount}</div>
                        <div className="stat-lbl">Active Cloud Files</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-wrapper" style={{ background: '#fce8e6', color: '#d93025' }}>
                        <Trash2 size={24} />
                      </div>
                      <div>
                        <div className="stat-val">{analytics.trashCount}</div>
                        <div className="stat-lbl">In Recycle Bin ({formatBytes(analytics.trashSize)})</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-wrapper" style={{ background: '#fef7e0', color: '#b06000' }}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <div className="stat-val">{analytics.largestFile ? formatBytes(analytics.largestFile.size) : '0 B'}</div>
                        <div className="stat-lbl">Largest File: {analytics.largestFile ? analytics.largestFile.name : 'None'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown Progress */}
                  <div className="analytics-breakdown-card">
                    <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Storage Breakdown by File Type</h3>

                    {/* Documents */}
                    <div className="breakdown-row">
                      <div className="breakdown-header">
                        <span>📄 Documents (PDF, TXT, DOCX)</span>
                        <span>{formatBytes(analytics.breakdown.documents.size)} ({analytics.breakdown.documents.count} files)</span>
                      </div>
                      <div className="breakdown-progress-bg">
                        <div
                          className="breakdown-progress-fill"
                          style={{
                            width: `${(analytics.breakdown.documents.size / (analytics.totalStorageUsed || 1)) * 100}%`,
                            background: '#1a73e8'
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="breakdown-row">
                      <div className="breakdown-header">
                        <span>🖼️ Images (PNG, JPG, JPEG)</span>
                        <span>{formatBytes(analytics.breakdown.images.size)} ({analytics.breakdown.images.count} files)</span>
                      </div>
                      <div className="breakdown-progress-bg">
                        <div
                          className="breakdown-progress-fill"
                          style={{
                            width: `${(analytics.breakdown.images.size / (analytics.totalStorageUsed || 1)) * 100}%`,
                            background: '#34a853'
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Archives */}
                    <div className="breakdown-row">
                      <div className="breakdown-header">
                        <span>📦 Archives (ZIP)</span>
                        <span>{formatBytes(analytics.breakdown.archives.size)} ({analytics.breakdown.archives.count} files)</span>
                      </div>
                      <div className="breakdown-progress-bg">
                        <div
                          className="breakdown-progress-fill"
                          style={{
                            width: `${(analytics.breakdown.archives.size / (analytics.totalStorageUsed || 1)) * 100}%`,
                            background: '#fbbc05'
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Others */}
                    <div className="breakdown-row">
                      <div className="breakdown-header">
                        <span>📎 Other Files</span>
                        <span>{formatBytes(analytics.breakdown.others.size)} ({analytics.breakdown.others.count} files)</span>
                      </div>
                      <div className="breakdown-progress-bg">
                        <div
                          className="breakdown-progress-fill"
                          style={{
                            width: `${(analytics.breakdown.others.size / (analytics.totalStorageUsed || 1)) * 100}%`,
                            background: '#5f6368'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 3: MY DRIVE & STARRED */
            <div>
              {/* Drag & drop upload banner */}
              <div
                className={`dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <Upload size={32} className="dropzone-icon" />
                <div className="dropzone-title">Drag & drop files here, or browse</div>
                <div className="dropzone-subtitle">Supported: PDF, TXT, DOC, DOCX, JPG, PNG, ZIP (Max 10 MB)</div>
              </div>

              {/* Toolbar */}
              <div className="content-toolbar">
                <div className="section-title">
                  {activeTab === 'starred' && <span>⭐ Starred Files</span>}
                  {activeTab === 'drive' && activeCategory === 'all' && <span>My Cloud Drive</span>}
                  {activeTab === 'drive' && activeCategory === 'documents' && <span>Documents</span>}
                  {activeTab === 'drive' && activeCategory === 'images' && <span>Images</span>}
                  {activeTab === 'drive' && activeCategory === 'archives' && <span>Archive Files</span>}
                  {searchQuery && <small style={{ color: '#5f6368' }}> (Matching "{searchQuery}")</small>}
                </div>

                <div className="view-actions">
                  <button
                    className={`btn-icon ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table View"
                  >
                    <ListIcon size={18} />
                  </button>
                  <button
                    className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </div>

              {/* Files Display */}
              {displayedFiles.length === 0 ? (
                <div className="empty-state">
                  <Folder size={48} className="empty-icon" />
                  <h3>No files found</h3>
                  <p>Upload a file or drag it into this window.</p>
                </div>
              ) : viewMode === 'table' ? (
                <table className="files-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Date Modified</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedFiles.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <button
                            className={`star-btn ${file.isStarred ? 'starred' : ''}`}
                            onClick={() => handleToggleStar(file.id)}
                            title={file.isStarred ? 'Unstar file' : 'Star file'}
                          >
                            <Star size={16} fill={file.isStarred ? '#fbbc04' : 'none'} />
                          </button>
                        </td>
                        <td>
                          <div className="file-name-cell">
                            {getFileIcon(file.mimeType)}
                            <span>{file.originalName}</span>
                            {file.isShared && (
                              <span title="Public link active" style={{ color: '#1a73e8', cursor: 'pointer' }} onClick={() => setSharingFile(file)}>
                                <Share2 size={14} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{file.mimeType}</td>
                        <td>{formatBytes(file.size)}</td>
                        <td>{new Date(file.uploadedAt).toLocaleString()}</td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn-action btn-share"
                              onClick={() => handleToggleShare(file)}
                              title="Public Share Link"
                            >
                              <Share2 size={14} />
                              <span>Share</span>
                            </button>
                            <button
                              className="btn-action btn-download"
                              onClick={() => handleDownloadFile(file.id, file.originalName)}
                              title="Download File"
                            >
                              <Download size={14} />
                              <span>Download</span>
                            </button>
                            <button
                              className="btn-action btn-delete"
                              onClick={() => handleMoveToTrash(file.id, file.originalName)}
                              title="Move to Recycle Bin"
                            >
                              <Trash2 size={14} />
                              <span>Trash</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="files-grid">
                  {displayedFiles.map((file) => (
                    <div className="file-card" key={file.id}>
                      <div>
                        <div className="card-header">
                          <button
                            className={`star-btn ${file.isStarred ? 'starred' : ''}`}
                            onClick={() => handleToggleStar(file.id)}
                          >
                            <Star size={16} fill={file.isStarred ? '#fbbc04' : 'none'} />
                          </button>
                          {getFileIcon(file.mimeType)}
                          <div className="card-title" title={file.originalName}>
                            {file.originalName}
                          </div>
                        </div>
                        <div className="card-meta">
                          {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="card-actions">
                        <button
                          className="btn-action btn-share"
                          onClick={() => handleToggleShare(file)}
                          title="Share"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          className="btn-action btn-download"
                          onClick={() => handleDownloadFile(file.id, file.originalName)}
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleMoveToTrash(file.id, file.originalName)}
                          title="Trash"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Share Modal */}
      {sharingFile && (
        <div className="modal-overlay" onClick={() => setSharingFile(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Share "{sharingFile.originalName}"</div>
              <button onClick={() => setSharingFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: 12 }}>
              Anyone with this public download link can download this file without an account.
            </p>
            <div className="share-link-input-group">
              <input
                type="text"
                readOnly
                value={`${BACKEND_BASE}/api/files/public/${sharingFile.shareToken}/download`}
              />
              <button
                className="btn-action btn-download"
                onClick={() => copyShareLink(sharingFile.shareToken)}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
