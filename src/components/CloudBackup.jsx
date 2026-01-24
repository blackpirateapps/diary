import React, { useState, useEffect } from 'react';
import { 
  Cloud, Save, RotateCcw, CheckCircle2, AlertCircle, 
  Loader2, Eye, EyeOff, Trash2, DownloadCloud, UploadCloud 
} from 'lucide-react';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { motion, AnimatePresence } from 'framer-motion';
import { exportToZip, importFromZip } from '../db'; 

// --- HELPERS: R2 CLIENT ---
const normalizeCreds = (input) => ({
  accountId: input.accountId.trim(),
  accessKeyId: input.accessKeyId.trim(),
  secretAccessKey: input.secretAccessKey.trim(),
  bucketName: input.bucketName.trim()
});

const getMissingCreds = (input) => {
  const missing = [];
  if (!input.accountId) missing.push('Account ID');
  if (!input.accessKeyId) missing.push('Access Key ID');
  if (!input.secretAccessKey) missing.push('Secret Access Key');
  if (!input.bucketName) missing.push('Bucket Name');
  return missing;
};

const readBodyAsBytes = async (body) => {
  if (!body) throw new Error('Empty response body.');
  if (typeof body.transformToByteArray === 'function') {
    return body.transformToByteArray();
  }
  const arrayBuffer = await new Response(body).arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

const createR2Client = (creds) => {
  return new S3Client({
    region: "auto",
    endpoint: `https://${creds.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
    forcePathStyle: true, // <--- ADD THIS LINE!
  });
};

const CloudBackup = () => {
  // --- STATE ---
  const [creds, setCreds] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: ''
  });
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [backups, setBackups] = useState([]);
  const [view, setView] = useState('settings'); // settings, list

  // Load creds on mount
  useEffect(() => {
    const saved = localStorage.getItem('r2_credentials');
    if (saved) setCreds(JSON.parse(saved));
  }, []);

  // --- HANDLERS ---
  const handleSaveCreds = () => {
    const normalized = normalizeCreds(creds);
    const missing = getMissingCreds(normalized);
    if (missing.length > 0) {
      setStatus('error');
      setMessage(`Missing: ${missing.join(', ')}`);
      return;
    }
    setCreds(normalized);
    localStorage.setItem('r2_credentials', JSON.stringify(normalized));
    setStatus('success');
    setMessage('Credentials saved locally.');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleBackup = async () => {
    const normalized = normalizeCreds(creds);
    const missing = getMissingCreds(normalized);
    if (missing.length > 0) {
      setStatus('error');
      setMessage(`Missing: ${missing.join(', ')}`);
      return;
    }
    setStatus('loading');
    setMessage('Generating backup...');

    try {
      // 1. Export Data
      const blob = await exportToZip(); // This returns a Blob
      const fileName = `journal_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;

      // 2. Prepare Upload Body (Convert Blob to Uint8Array)
      // This fixes the "getReader is not a function" error by avoiding Streams
      const arrayBuffer = await blob.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      setMessage('Uploading to Cloudflare R2...');
      const client = createR2Client(normalized);
      
      const command = new PutObjectCommand({
        Bucket: normalized.bucketName,
        Key: fileName,
        Body: body,
        ContentType: 'application/zip',
        ContentLength: body.length // Explicit length prevents "unknown length" warnings
      });

      await client.send(command);
      
      setStatus('success');
      setMessage(`Backup successful! (${fileName})`);
    } catch (error) {
      console.error(error);
      setStatus('error');
      // Helpful error message for common CORS issues
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        setMessage('Network Error: Check R2 CORS Policy settings.');
      } else {
        setMessage(`Upload failed: ${error.message}`);
      }
    }
  };

  const fetchBackups = async () => {
    const normalized = normalizeCreds(creds);
    const missing = getMissingCreds(normalized);
    if (missing.length > 0) {
      setStatus('error');
      setMessage(`Missing: ${missing.join(', ')}`);
      return;
    }
    setView('list');
    setStatus('loading');
    setMessage('Fetching file list...');
    
    try {
      const client = createR2Client(normalized);
      const command = new ListObjectsV2Command({ Bucket: normalized.bucketName });
      const response = await client.send(command);
      
      // Sort by date (newest first)
      const sorted = (response.Contents || []).sort((a, b) => b.LastModified - a.LastModified);
      setBackups(sorted);
      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        setMessage('Network Error: Check R2 CORS Policy settings.');
      } else {
        setMessage('Failed to list backups. Check credentials.');
      }
    }
  };

  const handleRestore = async (key) => {
    if (!window.confirm(`Overwrite current data with ${key}?`)) return;

    const normalized = normalizeCreds(creds);
    const missing = getMissingCreds(normalized);
    if (missing.length > 0) {
      setStatus('error');
      setMessage(`Missing: ${missing.join(', ')}`);
      return;
    }
    
    setStatus('loading');
    setMessage('Downloading backup...');

    try {
      const client = createR2Client(normalized);
      const command = new GetObjectCommand({ Bucket: normalized.bucketName, Key: key });
      const response = await client.send(command);
      
      // Convert stream to Blob
      const bytes = await readBodyAsBytes(response.Body);
      const file = new File([bytes], key, { type: 'application/zip' });

      setMessage('Importing data...');
      await importFromZip(file);

      setStatus('success');
      setMessage('Restore complete! reloading...');
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
          <Cloud className="text-[var(--accent-500)]" size={20} />
          <h3 className="font-bold text-gray-900 dark:text-white">Cloud Backup (R2)</h3>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setView('settings')}
             className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${view === 'settings' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
           >
             Settings
           </button>
           <button 
             onClick={fetchBackups}
             className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
           >
             Restore
           </button>
        </div>
      </div>

      <div className="p-4">
        {/* VIEW: SETTINGS */}
        {view === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Account ID</label>
              <input 
                type="text" 
                value={creds.accountId}
                onChange={(e) => setCreds({...creds, accountId: e.target.value})}
                placeholder="Cloudflare Account ID"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-500)] dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Access Key ID</label>
                <input 
                  type="text" 
                  value={creds.accessKeyId}
                  onChange={(e) => setCreds({...creds, accessKeyId: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-500)] dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Bucket Name</label>
                <input 
                  type="text" 
                  value={creds.bucketName}
                  onChange={(e) => setCreds({...creds, bucketName: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-500)] dark:text-white"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Secret Access Key</label>
              <input 
                type={showSecret ? "text" : "password"} 
                value={creds.secretAccessKey}
                onChange={(e) => setCreds({...creds, secretAccessKey: e.target.value})}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-500)] dark:text-white pr-10"
              />
              <button 
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-7 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSaveCreds}
                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={16} /> Save Settings
              </button>
              <button 
                onClick={handleBackup}
                disabled={status === 'loading'}
                className="flex-1 bg-[var(--accent-500)] hover:brightness-110 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[var(--accent-200)]"
              >
                {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                Backup Now
              </button>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center">
              Note: Ensure your R2 Bucket allows CORS for this domain.
            </p>
          </div>
        )}

        {/* VIEW: RESTORE LIST */}
        {view === 'list' && (
          <div className="space-y-2">
            {backups.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Cloud size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No backups found</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2">
                {backups.map((file) => (
                  <div key={file.Key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{file.Key}</p>
                      <p className="text-xs text-gray-400">{new Date(file.LastModified).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => handleRestore(file.Key)}
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

        {/* STATUS MESSAGE */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}
            >
              {status === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CloudBackup;
