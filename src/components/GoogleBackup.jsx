import React, { useState, useEffect } from 'react';
import { 
  Save, RotateCcw, CheckCircle2, AlertCircle, 
  Loader2, DownloadCloud, UploadCloud, LogOut 
} from 'lucide-react';
import { exportToZip, importFromZip } from '../db';

// SCOPES: drive.file means we only see files WE created. Safe & Secure.
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

const GoogleBackup = () => {
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [backups, setBackups] = useState([]);
  const [view, setView] = useState('home'); // home, list

  // --- 1. CONFIGURATION ---
  // PASTE YOUR GOOGLE CLIENT ID HERE
  const CLIENT_ID = '640977666110-4lvm2gj9otb78k0a2ju0eere49lfhe98.apps.googleusercontent.com';

  // --- 2. LOAD GOOGLE SCRIPTS DYNAMICALLY ---
  useEffect(() => {
    const loadGsi = () => {
      if (window.google) return; // Already loaded
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    };

    const initGsi = () => {
      if (!window.google) return;
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            fetchUserInfo(tokenResponse.access_token);
          }
        },
      });
      setTokenClient(client);
    };

    loadGsi();
  }, []);

  // --- 3. AUTHENTICATION ---
  const handleAuth = () => {
    if (tokenClient) {
      // Trigger the Google Popup
      tokenClient.requestAccessToken();
    } else {
      alert("Google Services not loaded yet. Check your connection.");
    }
  };

  const handleSignOut = () => {
    const confirm = window.confirm("Disconnect from Google Drive?");
    if (confirm) {
      if (window.google) window.google.accounts.oauth2.revoke(accessToken, () => {});
      setAccessToken(null);
      setUserInfo(null);
      setBackups([]);
      setView('home');
    }
  };

  const fetchUserInfo = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUserInfo(data);
    } catch (e) {
      console.error(e);
    }
  };

  // --- 4. BACKUP (UPLOAD) ---
  const handleBackup = async () => {
    if (!accessToken) return handleAuth();
    setStatus('loading');
    setMessage('Packing data...');

    try {
      // A. Get Zip Blob
      const blob = await exportToZip();
      const fileName = `journal_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      
      // B. Create Metadata
      const metadata = {
        name: fileName,
        mimeType: 'application/zip',
        // Optional: Put in a specific folder if you want logic for that
      };

      // C. Prepare Multipart Body
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      setMessage('Uploading to Google Drive...');

      // D. Upload via Fetch
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      setStatus('success');
      setMessage(`Saved to Drive: ${fileName}`);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Upload failed. See console.');
    }
  };

  // --- 5. LIST BACKUPS ---
  const fetchBackups = async () => {
    if (!accessToken) return handleAuth();
    setView('list');
    setStatus('loading');
    setMessage('Scanning Drive...');

    try {
      // Query: Not in trash, matches mimeType, sorted by time
      const q = "mimeType='application/zip' and trashed=false and name contains 'journal_backup'";
      const params = new URLSearchParams({ q, orderBy: 'createdTime desc', fields: 'files(id, name, createdTime, size)' });

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const data = await res.json();
      setBackups(data.files || []);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage('Failed to list files.');
    }
  };

  // --- 6. RESTORE (DOWNLOAD) ---
  const handleRestore = async (fileId, fileName) => {
    if (!window.confirm(`Restore from ${fileName}? Current data will be overwritten.`)) return;
    setStatus('loading');
    setMessage('Downloading...');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob(); // Convert stream to blob
      const file = new File([blob], fileName, { type: 'application/zip' });

      setMessage('Restoring database...');
      await importFromZip(file);

      setStatus('success');
      setMessage('Restore complete! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Restore failed.');
    }
  };

  // --- RENDER ---
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Google Logo SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <h3 className="font-bold text-gray-900 dark:text-white">Google Drive</h3>
        </div>
        
        {accessToken && (
          <div className="flex gap-2">
             <button onClick={() => setView('home')} className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${view === 'home' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Back up</button>
             <button onClick={fetchBackups} className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Restore</button>
          </div>
        )}
      </div>

      <div className="p-4">
        {!accessToken ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-4">Connect to save backups securely to your personal Google Drive.</p>
            <button 
              onClick={handleAuth}
              className="bg-white border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 mx-auto"
            >
              Connect Google Drive
            </button>
          </div>
        ) : (
          <>
            {/* VIEW: HOME */}
            {view === 'home' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    {userInfo?.picture && <img src={userInfo.picture} alt="" className="w-8 h-8 rounded-full" />}
                    <div className="text-sm">
                      <p className="font-bold text-gray-900 dark:text-white">{userInfo?.name || 'Connected'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.email}</p>
                    </div>
                  </div>
                  <button onClick={handleSignOut} className="text-red-500 hover:bg-red-100 p-2 rounded-lg"><LogOut size={16} /></button>
                </div>

                <button 
                  onClick={handleBackup}
                  disabled={status === 'loading'}
                  className="w-full bg-[var(--accent-500)] hover:brightness-110 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[var(--accent-200)]"
                >
                  {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  Backup to Drive
                </button>
              </div>
            )}

            {/* VIEW: LIST */}
            {view === 'list' && (
              <div className="space-y-2">
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No backups found.</p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2">
                    {backups.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(file.createdTime).toLocaleString()} • {(file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRestore(file.id, file.name)}
                          disabled={status === 'loading'}
                          className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:hover:bg-gray-600 transition-colors"
                        >
                          <DownloadCloud size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STATUS */}
            {message && (
              <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {status === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                {message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleBackup;