import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useState, useEffect } from 'react';

// --- DATABASE DEFINITION ---
export const db = new Dexie('JournalDB');

// Version 1: Initial Release
db.version(1).stores({
  entries: '++id, date, mood, *tags' 
});

// Version 2: Added Sleep Tracking
// We use 'id' (timestamp from CSV) as the primary key to prevent duplicates
db.version(2).stores({
  entries: '++id, date, mood, *tags',
  sleep_sessions: 'id, startTime' 
});

// --- HELPER: IMAGE URL HOOK ---
export const useBlobUrl = (imageFile) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setUrl('');
      return;
    }
    if (typeof imageFile === 'string') {
      setUrl(imageFile);
      return;
    }
    if (imageFile instanceof Blob) {
      const objectUrl = URL.createObjectURL(imageFile);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [imageFile]);

  return url;
};

// --- MIGRATION UTILITY ---
export const migrateFromLocalStorage = async () => {
  const raw = localStorage.getItem('journal_entries');
  if (raw) {
    try {
      const entries = JSON.parse(raw);
      if (Array.isArray(entries) && entries.length > 0) {
        console.log(`Migrating ${entries.length} entries to IndexedDB...`);
        await db.entries.bulkPut(entries);
        localStorage.removeItem('journal_entries'); 
        return entries.length;
      }
    } catch (e) {
      console.error("Migration failed", e);
    }
  }
  return 0;
};

// --- ZIP EXPORT ---
export const exportToZip = async () => {
  const zip = new JSZip();
  const imgFolder = zip.folder("images");
  
  // 1. Fetch Journal Entries
  const entries = await db.entries.toArray();
  
  // 2. Fetch Sleep Data
  const sleepSessions = await db.sleep_sessions.toArray();
  
  // 3. Process Journal Images (Convert to Blobs or Filenames)
  const cleanEntries = entries.map(entry => {
    const doc = { ...entry, images: [] };

    if (entry.images && Array.isArray(entry.images)) {
      entry.images.forEach((img, index) => {
        if (typeof img === 'string' && img.startsWith('data:')) {
           const arr = img.split(',');
           const mime = arr[0].match(/:(.*?);/)[1];
           const bstr = atob(arr[1]);
           let n = bstr.length;
           const u8arr = new Uint8Array(n);
           while(n--) u8arr[n] = bstr.charCodeAt(n);
           const blob = new Blob([u8arr], {type:mime});
           
           const fileName = `${entry.id}_${index}.jpg`; 
           imgFolder.file(fileName, blob);
           doc.images.push(fileName);
        } 
        else if (img instanceof Blob) {
           const ext = img.type.split('/')[1] || 'jpg';
           const fileName = `${entry.id}_${index}.${ext}`;
           imgFolder.file(fileName, img);
           doc.images.push(fileName);
        }
        else if (typeof img === 'string') {
          doc.images.push(img);
        }
      });
    }
    return doc;
  });

  // 4. Add Files to Zip
  zip.file("journal.json", JSON.stringify(cleanEntries, null, 2));
  
  // Add Sleep Data if exists
  if (sleepSessions.length > 0) {
      zip.file("sleep_data.json", JSON.stringify(sleepSessions, null, 2));
  }

  // 5. Generate and Download
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `journal_backup_${new Date().toISOString().split('T')[0]}.zip`);
};

// --- ZIP IMPORT ---
export const importFromZip = async (file) => {
  const zip = await JSZip.loadAsync(file);
  let importCount = 0;
  
  // 1. Parse Journal Entries
  const jsonFile = zip.file("journal.json");
  if (jsonFile) {
      const jsonStr = await jsonFile.async("string");
      const entries = JSON.parse(jsonStr);
      const imgFolder = zip.folder("images");

      const processedEntries = [];

      for (const entry of entries) {
        const newImages = [];
        if (entry.images && Array.isArray(entry.images)) {
          for (const imgRef of entry.images) {
            if (imgFolder && imgFolder.file(imgRef)) {
              const blob = await imgFolder.file(imgRef).async("blob");
              newImages.push(blob);
            } else {
              newImages.push(imgRef);
            }
          }
        }
        processedEntries.push({ ...entry, images: newImages });
      }

      await db.entries.bulkPut(processedEntries);
      importCount += processedEntries.length;
  }

  // 2. Parse Sleep Data
  const sleepFile = zip.file("sleep_data.json");
  if (sleepFile) {
      const sleepStr = await sleepFile.async("string");
      const sleepSessions = JSON.parse(sleepStr);
      if (Array.isArray(sleepSessions) && sleepSessions.length > 0) {
          await db.sleep_sessions.bulkPut(sleepSessions);
          console.log(`Imported ${sleepSessions.length} sleep sessions.`);
      }
  }

  return importCount;
};