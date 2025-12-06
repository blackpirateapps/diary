
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

// --- POPULATE DEFAULT DATA ---
db.on('populate', () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Add Default Person
  db.people.add({
    id: '1',
    name: 'Future Self',
    relationship: 'Me',
    description: 'The person I am becoming.',
    dates: [{ label: 'Started Journaling', icon: 'Star', date: todayStr, hasYear: true }],
    giftIdeas: ['Peace of mind', 'New experiences'],
    image: null // Placeholder
  });

  // 2. Add Welcome Entry
  db.entries.add({
    date: now.toISOString(),
    mood: 8,
    tags: ['welcome', 'guide'],
    location: 'My Mind Palace',
    weather: 'Clear',
    content: "# Welcome to your new Journal! 📔\n\nThis is a safe, offline-first space for your thoughts. Here are a few things you can do:\n\n* **Rich Text:** Use bold, italics, lists, and more.\n* **Mentions:** Go to the People page to add contacts, then type '@' in the editor to link them.\n* **Privacy:** Your data stays on your device.\n\nTry exploring the menu to see stats, maps, and more. Happy journaling!",
    preview: "Welcome to your new Journal! 📔 This is a safe, offline-first space for your thoughts...",
    people: ['1']
  });

  // 3. Add Default Sleep Data (Showcase Charts)
  // We generate 3 simple sessions for the past 3 nights
  const oneDay = 24 * 60 * 60 * 1000;
  
  const sleepSamples = [
    {
      id: (now.getTime() - oneDay * 1).toString(),
      dateString: new Date(now.getTime() - oneDay * 1).toLocaleDateString(),
      startTime: now.getTime() - oneDay * 1 - (8 * 60 * 60 * 1000), // Yesterday night
      duration: 7.5,
      rating: 4.2,
      deepSleepPerc: 0.45,
      snore: 0,
      noiseLevel: 30,
      metadata: {},
      movementData: [], // Empty for lightweight default
      sensorData: [],
      hypnogram: [] // Empty means it will use basic calculation in UI
    },
    {
      id: (now.getTime() - oneDay * 2).toString(),
      dateString: new Date(now.getTime() - oneDay * 2).toLocaleDateString(),
      startTime: now.getTime() - oneDay * 2 - (7 * 60 * 60 * 1000), // 2 days ago
      duration: 6.8,
      rating: 3.5,
      deepSleepPerc: 0.30,
      snore: 150,
      noiseLevel: 45,
      metadata: {},
      movementData: [],
      sensorData: [],
      hypnogram: [] 
    }
  ];
  
  db.sleep_sessions.bulkAdd(sleepSamples);
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
  const people = await db.people.toArray();
  
  // 2. Process Journal Images
  const cleanEntries = entries.map(entry => {
    const doc = { ...entry, images: [] };

    if (entry.images && Array.isArray(entry.images)) {
      entry.images.forEach((img, index) => {
        if (img instanceof Blob) {
           const ext = img.type.split('/')[1] || 'webp';
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

  // 3. Process People Images (Profile & Gallery)
  if (people.length > 0) {
    const cleanPeople = people.map(p => {
      const doc = { ...p };
      
      // A. Profile Picture
      if (doc.image instanceof Blob) {
         const ext = doc.image.type.split('/')[1] || 'webp';
         const fileName = `person_${doc.id}_avatar.${ext}`;
         imgFolder.file(fileName, doc.image);
         doc.image = fileName; 
      }

      // B. Gallery Images
      if (doc.gallery && Array.isArray(doc.gallery)) {
         doc.gallery = doc.gallery.map((img, idx) => {
             if (img instanceof Blob) {
                 const ext = img.type.split('/')[1] || 'webp';
                 const fileName = `person_${doc.id}_gallery_${idx}.${ext}`;
                 imgFolder.file(fileName, img);
                 return fileName;
             }
             return img;
         });
      }
      return doc;
    });
    zip.file("people_data.json", JSON.stringify(cleanPeople, null, 2));
  }

  // 4. Add Files to Zip
  zip.file("journal.json", JSON.stringify(cleanEntries, null, 2));
  
  if (sleepSessions.length > 0) zip.file("sleep_data.json", JSON.stringify(sleepSessions, null, 2));
  if (chats.length > 0) zip.file("chat_data.json", JSON.stringify(chats, null, 2));
  if (meditations.length > 0) zip.file("meditation_data.json", JSON.stringify(meditations, null, 2));

  // 5. Generate Blob
  const content = await zip.generateAsync({ type: "blob" });
  
  if (triggerDownload) {
    saveAs(content, `journal_backup_${new Date().toISOString().split('T')[0]}.zip`);
  }

  return content;
};

// --- ZIP IMPORT ---
export const importFromZip = async (file) => {
  const zip = await JSZip.loadAsync(file);
  const imgFolder = zip.folder("images");
  let importCount = 0;
  
  // 1. Parse Journal Entries
  const jsonFile = zip.file("journal.json");
  if (jsonFile) {
      const jsonStr = await jsonFile.async("string");
      const entries = JSON.parse(jsonStr);

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

  // 2. Parse People Data (With Images)
  const peopleFile = zip.file("people_data.json");
  if (peopleFile) {
      const pStr = await peopleFile.async("string");
      const pData = JSON.parse(pStr);
      
      const processedPeople = [];
      for (const p of pData) {
          const doc = { ...p };
          
          // A. Profile Picture
          if (doc.image && typeof doc.image === 'string' && imgFolder && imgFolder.file(doc.image)) {
             doc.image = await imgFolder.file(doc.image).async("blob");
          }

          // B. Gallery
          if (doc.gallery && Array.isArray(doc.gallery)) {
              const newGallery = [];
              for (const imgRef of doc.gallery) {
                  if (typeof imgRef === 'string' && imgFolder && imgFolder.file(imgRef)) {
                      newGallery.push(await imgFolder.file(imgRef).async("blob"));
                  } else {
                      newGallery.push(imgRef);
                  }
              }
              doc.gallery = newGallery;
          }
          processedPeople.push(doc);
      }

      if (processedPeople.length > 0) {
          await db.people.bulkPut(processedPeople);
      }
  }

  // 3. Other Data Types
  const sleepFile = zip.file("sleep_data.json");
  if (sleepFile) {
      const sleepSessions = JSON.parse(await sleepFile.async("string"));
      if (Array.isArray(sleepSessions)) await db.sleep_sessions.bulkPut(sleepSessions);
  }

  const chatFile = zip.file("chat_data.json");
  if (chatFile) {
      const chats = JSON.parse(await chatFile.async("string"));
      if (Array.isArray(chats)) await db.chat_analytics.bulkPut(chats);
  }
  
  const medFile = zip.file("meditation_data.json");
  if (medFile) {
      const medData = JSON.parse(await medFile.async("string"));
      if (Array.isArray(medData)) await db.meditation_sessions.bulkPut(medData);
  }

  return importCount;
};
