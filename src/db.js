import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// --- DATABASE DEFINITION ---
export const db = new Dexie('JournalDB');

db.version(1).stores({
  entries: '++id, date, mood, *tags' // Index these fields for fast searching
});

// --- HELPER: IMAGE URL HOOK ---
// Use this in your components to safely display Blob images
import { useState, useEffect } from 'react';

export const useBlobUrl = (imageFile) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setUrl('');
      return;
    }

    // If it's already a string (legacy data or URL), use it
    if (typeof imageFile === 'string') {
      setUrl(imageFile);
      return;
    }

    // If it's a Blob/File, create a temporary URL
    if (imageFile instanceof Blob) {
      const objectUrl = URL.createObjectURL(imageFile);
      setUrl(objectUrl);
      
      // Cleanup memory when component unmounts or image changes
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [imageFile]);

  return url;
};

// --- MIGRATION UTILITY ---
// Run this once to move LocalStorage data to IndexedDB
export const migrateFromLocalStorage = async () => {
  const raw = localStorage.getItem('journal_entries');
  if (raw) {
    try {
      const entries = JSON.parse(raw);
      if (Array.isArray(entries) && entries.length > 0) {
        console.log(`Migrating ${entries.length} entries to IndexedDB...`);
        // We save them "as is" (Base64 strings) for now. 
        // They will work fine with the useBlobUrl hook above.
        await db.entries.bulkPut(entries);
        localStorage.removeItem('journal_entries'); // Clear old storage
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
  
  // 1. Fetch all data
  const entries = await db.entries.toArray();
  
  // 2. Separate JSON data from Binary Images
  const cleanEntries = entries.map(entry => {
    // Clone entry to avoid mutating DB objects
    const doc = { ...entry, images: [] };

    if (entry.images && Array.isArray(entry.images)) {
      entry.images.forEach((img, index) => {
        // Handle Legacy Base64 strings (convert to Blob)
        if (typeof img === 'string' && img.startsWith('data:')) {
           // Basic base64 to blob conversion for legacy data
           const arr = img.split(',');
           const mime = arr[0].match(/:(.*?);/)[1];
           const bstr = atob(arr[1]);
           let n = bstr.length;
           const u8arr = new Uint8Array(n);
           while(n--) u8arr[n] = bstr.charCodeAt(n);
           const blob = new Blob([u8arr], {type:mime});
           
           const fileName = `${entry.id}_${index}.jpg`; // Assume jpg for simplicity
           imgFolder.file(fileName, blob);
           doc.images.push(fileName);
        } 
        // Handle actual Blobs (New data)
        else if (img instanceof Blob) {
           const ext = img.type.split('/')[1] || 'jpg';
           const fileName = `${entry.id}_${index}.${ext}`;
           imgFolder.file(fileName, img);
           doc.images.push(fileName);
        }
        // Handle External URLs (keep as is)
        else if (typeof img === 'string') {
          doc.images.push(img);
        }
      });
    }
    return doc;
  });

  // 3. Add JSON to zip
  zip.file("journal.json", JSON.stringify(cleanEntries, null, 2));

  // 4. Generate and Download
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `journal_backup_${new Date().toISOString().split('T')[0]}.zip`);
};

// --- ZIP IMPORT ---
export const importFromZip = async (file) => {
  const zip = await JSZip.loadAsync(file);
  
  // 1. Parse JSON
  const jsonFile = zip.file("journal.json");
  if (!jsonFile) throw new Error("Invalid backup: journal.json not found");
  
  const jsonStr = await jsonFile.async("string");
  const entries = JSON.parse(jsonStr);
  const imgFolder = zip.folder("images");

  const processedEntries = [];

  // 2. Reattach Images
  for (const entry of entries) {
    const newImages = [];
    if (entry.images && Array.isArray(entry.images)) {
      for (const imgRef of entry.images) {
        // If it looks like a filename in our folder
        if (imgFolder && imgFolder.file(imgRef)) {
          const blob = await imgFolder.file(imgRef).async("blob");
          newImages.push(blob);
        } else {
          // Keep external URLs or broken refs as strings
          newImages.push(imgRef);
        }
      }
    }
    processedEntries.push({ ...entry, images: newImages });
  }

  // 3. Save to DB
  await db.entries.bulkPut(processedEntries);
  return processedEntries.length;
};