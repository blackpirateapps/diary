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
db.version(2).stores({
  entries: '++id, date, mood, *tags',
  sleep_sessions: 'id, startTime' 
});

// Version 3: Added WhatsApp Chat Analytics
db.version(3).stores({
  entries: '++id, date, mood, *tags',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name' 
});

// Version 4: Added Meditation Sessions
db.version(4).stores({
  entries: '++id, date, mood, *tags',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name',
  meditation_sessions: '++id, startTime, duration' 
});

// Version 5: Added People/Contacts [NEW]
db.version(5).stores({
  entries: '++id, date, mood, *tags, *people',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name',
  meditation_sessions: '++id, startTime, duration',
  people: '++id, name, relationship'
});

// --- HELPER: IMAGE URL HOOK ---
export const useBlobUrl = (imageFile) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setUrl('');
      return;
    }
    // Handle string (Base64/URL)
    if (typeof imageFile === 'string') {
      setUrl(imageFile);
      return;
    }
    // Handle Blob/File
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
export const exportToZip = async (triggerDownload = false) => {
  const zip = new JSZip();
  const imgFolder = zip.folder("images");
  
  // 1. Fetch All Data
  const entries = await db.entries.toArray();
  const sleepSessions = await db.sleep_sessions.toArray();
  const chats = await db.chat_analytics.toArray();
  const meditations = await db.meditation_sessions.toArray();
  const people = await db.people.toArray(); // Export People too
  
  // 2. Process Journal Images (Convert to Blobs or Filenames)
  const cleanEntries = entries.map(entry => {
    const doc = { ...entry, images: [] };

    if (entry.images && Array.isArray(entry.images)) {
      entry.images.forEach((img, index) => {
        // Handle Base64 strings
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
        // Handle Blobs (The new standard)
        else if (img instanceof Blob) {
           // Try to detect extension, default to webp or jpg
           const ext = img.type.split('/')[1] || 'webp';
           const fileName = `${entry.id}_${index}.${ext}`;
           imgFolder.file(fileName, img);
           doc.images.push(fileName);
        }
        // Handle Legacy URLs
        else if (typeof img === 'string') {
          doc.images.push(img);
        }
      });
    }
    return doc;
  });

  // 3. Add Files to Zip
  zip.file("journal.json", JSON.stringify(cleanEntries, null, 2));
  
  if (sleepSessions.length > 0) {
      zip.file("sleep_data.json", JSON.stringify(sleepSessions, null, 2));
  }

  if (chats.length > 0) {
      zip.file("chat_data.json", JSON.stringify(chats, null, 2));
  }
  
  if (meditations.length > 0) {
      zip.file("meditation_data.json", JSON.stringify(meditations, null, 2));
  }

  // Export People Data
  if (people.length > 0) {
    const peopleData = people.map(p => {
       // We need to handle people images separately if they are blobs
       // For simplicity in this version, we skip blob export for people or rely on base64
       // Ideally you'd do the same image folder logic here.
       return p; 
    });
    zip.file("people_data.json", JSON.stringify(peopleData, null, 2));
  }

  // 4. Generate Blob
  const content = await zip.generateAsync({ type: "blob" });
  
  if (triggerDownload) {
    saveAs(content, `journal_backup_${new Date().toISOString().split('T')[0]}.zip`);
  }

  return content;
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
      }
  }

  // 3. Parse Chat Analytics
  const chatFile = zip.file("chat_data.json");
  if (chatFile) {
      const chatStr = await chatFile.async("string");
      const chats = JSON.parse(chatStr);
      if (Array.isArray(chats) && chats.length > 0) {
          await db.chat_analytics.bulkPut(chats);
      }
  }
  
  // 4. Parse Meditation Data
  const medFile = zip.file("meditation_data.json");
  if (medFile) {
      const medStr = await medFile.async("string");
      const medData = JSON.parse(medStr);
      if (Array.isArray(medData) && medData.length > 0) {
          await db.meditation_sessions.bulkPut(medData);
      }
  }

  // 5. Parse People Data
  const peopleFile = zip.file("people_data.json");
  if (peopleFile) {
      const pStr = await peopleFile.async("string");
      const pData = JSON.parse(pStr);
      if (Array.isArray(pData) && pData.length > 0) {
          await db.people.bulkPut(pData);
      }
  }

  return importCount;
};