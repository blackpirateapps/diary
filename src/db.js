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

// Version 5: Added People/Contacts
db.version(5).stores({
  entries: '++id, date, mood, *tags, *people',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name',
  meditation_sessions: '++id, startTime, duration',
  people: '++id, name, relationship'
});

// Version 6: Added support for Location History
db.version(6).stores({
  entries: '++id, date, mood, *tags, *people',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name',
  meditation_sessions: '++id, startTime, duration',
  people: '++id, name, relationship'
});

// --- [NEW] Version 7: Optimized Travel Route Storage ---
// Implements Strategy A & C: Separate Metadata from Heavy Data
// Implements Strategy B: Support for compressed strings
db.version(7).stores({
  entries: '++id, date, mood, *tags, *people',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name',
  meditation_sessions: '++id, startTime, duration',
  people: '++id, name, relationship',
  
  // LIGHTWEIGHT: For the sidebar list (Fast queries, small size)
  // Indexing 'year' and 'month' allows for fast filtering without loading all data
  routes_meta: 'id, date, year, month', 
  
  // HEAVYWEIGHT: For the map view (Lazy loaded only when needed)
  // 'id' matches the meta store. 'compressedPath' stores the encoded polyline string.
  routes_data: 'id' 
});

// --- [NEW] Version 8: Sync Metadata + Tombstones ---
db.version(8).stores({
  entries: '++id, date, mood, *tags, *people, updated_at, sync_status',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name',
  meditation_sessions: '++id, startTime, duration, updated_at, sync_status',
  people: '++id, name, relationship, updated_at, sync_status',
  routes_meta: 'id, date, year, month',
  routes_data: 'id',
  tombstones: '++id, store, key, deleted_at, sync_status'
}).upgrade(async (tx) => {
  const now = new Date().toISOString();
  await tx.table('entries').toCollection().modify((entry) => {
    if (!entry.updated_at) entry.updated_at = now;
    if (!entry.sync_status) entry.sync_status = 'synced';
  });
  await tx.table('people').toCollection().modify((person) => {
    if (!person.updated_at) person.updated_at = now;
    if (!person.sync_status) person.sync_status = 'synced';
  });
  await tx.table('meditation_sessions').toCollection().modify((session) => {
    if (!session.updated_at) session.updated_at = now;
    if (!session.sync_status) session.sync_status = 'synced';
  });
});

// --- [NEW] Version 9: Image Sync Queue ---
db.version(9).stores({
  entries: '++id, date, mood, *tags, *people, updated_at, sync_status',
  sleep_sessions: 'id, startTime',
  chat_analytics: 'id, name',
  meditation_sessions: '++id, startTime, duration, updated_at, sync_status',
  people: '++id, name, relationship, updated_at, sync_status',
  routes_meta: 'id, date, year, month',
  routes_data: 'id',
  tombstones: '++id, store, key, deleted_at, sync_status',
  image_sync: '++id, [owner_type+owner_id+slot], hash, status, updated_at'
});

// --- [NEW] Strategy D: Persistence Request ---
// Tries to prevent the browser from wiping data if disk space is low
export const requestPersistence = async () => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      const result = await navigator.storage.persist();
      console.log(`[Storage] Persistent storage granted: ${result}`);
    } else {
      console.log('[Storage] Already persisted.');
    }
  }
};
// Trigger once on load
requestPersistence();

// --- [NEW] Sync Hook Helpers ---
let suppressSyncHooks = false;

export const runWithSyncBypass = async (fn) => {
  suppressSyncHooks = true;
  try {
    return await fn();
  } finally {
    suppressSyncHooks = false;
  }
};

const setSyncDirty = (mods) => {
  const now = new Date().toISOString();
  return { ...mods, updated_at: now, sync_status: 'dirty' };
};

const registerSyncHooks = (tableName) => {
  const table = db[tableName];
  table.hook('creating', (primKey, obj, tx) => {
    if (suppressSyncHooks) return;
    obj.updated_at = new Date().toISOString();
    obj.sync_status = 'dirty';
  });
  table.hook('updating', (mods) => {
    if (suppressSyncHooks) return;
    return setSyncDirty(mods);
  });
  table.hook('deleting', (primKey, obj, tx) => {
    if (suppressSyncHooks) return;
    const tombstones = tx.table('tombstones');
    return tombstones.add({
      store: tableName,
      key: primKey,
      deleted_at: new Date().toISOString(),
      sync_status: 'dirty'
    });
  });
};

registerSyncHooks('entries');
registerSyncHooks('people');
registerSyncHooks('meditation_sessions');

// --- [NEW] Strategy B: Polyline Encoding Utils ---
// Google's Polyline Algorithm to compress GPS arrays by ~90%
export const PolylineUtils = {
  encode: (coords) => {
    let str = '';
    let lastLat = 0;
    let lastLng = 0;

    for (const point of coords) {
      // Input: [lat, lng]
      const lat = Math.round(point[0] * 1e5);
      const lng = Math.round(point[1] * 1e5);

      const dLat = lat - lastLat;
      const dLng = lng - lastLng;

      lastLat = lat;
      lastLng = lng;

      str += PolylineUtils._encodeValue(dLat) + PolylineUtils._encodeValue(dLng);
    }
    return str;
  },

  decode: (str) => {
    let index = 0, lat = 0, lng = 0, coords = [];
    const factor = 1e5;

    while (index < str.length) {
      let result = 1, shift = 0, b;
      do {
        b = str.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f);
      lat += (result & 1 ? ~(result >> 1) : (result >> 1));

      result = 1; shift = 0;
      do {
        b = str.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f);
      lng += (result & 1 ? ~(result >> 1) : (result >> 1));

      coords.push([lat / factor, lng / factor]);
    }
    return coords;
  },

  _encodeValue: (val) => {
    val = val < 0 ? ~(val << 1) : (val << 1);
    let str = '';
    while (val >= 0x20) {
      str += String.fromCharCode((0x20 | (val & 0x1f)) + 63);
      val >>= 5;
    }
    str += String.fromCharCode(val + 63);
    return str;
  }
};

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
    image: null
  });

  // 2. Add Welcome Entry
  db.entries.add({
    date: now.toISOString(),
    mood: 8,
    tags: ['welcome', 'guide'],
    location: 'My Mind Palace',
    weather: 'Clear',
    locationHistory: [],
    content: "# Welcome to your new Journal! 📔\n\nThis is a safe, offline-first space for your thoughts. Here are a few things you can do:\n\n* **Rich Text:** Use bold, italics, lists, and more.\n* **Mentions:** Go to the People page to add contacts, then type '@' in the editor to link them.\n* **Privacy:** Your data stays on your device.\n\nTry exploring the menu to see stats, maps, and more. Happy journaling!",
    preview: "Welcome to your new Journal! 📔 This is a safe, offline-first space for your thoughts...",
    people: ['1']
  });

  // 3. Add Default Sleep Data
  const oneDay = 24 * 60 * 60 * 1000;
  const sleepSamples = [
    {
      id: (now.getTime() - oneDay * 1).toString(),
      dateString: new Date(now.getTime() - oneDay * 1).toLocaleDateString(),
      startTime: now.getTime() - oneDay * 1 - (8 * 60 * 60 * 1000),
      duration: 7.5,
      rating: 4.2,
      deepSleepPerc: 0.45,
      snore: 0,
      noiseLevel: 30,
      metadata: {},
      movementData: [], 
      sensorData: [],
      hypnogram: [] 
    },
    {
      id: (now.getTime() - oneDay * 2).toString(),
      dateString: new Date(now.getTime() - oneDay * 2).toLocaleDateString(),
      startTime: now.getTime() - oneDay * 2 - (7 * 60 * 60 * 1000),
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

  // 4. [NEW] Add Sample Route Data (V7 Validation)
  // This helps verify the map system works immediately upon install
  const sampleRouteDate = now.toISOString().split('T')[0];
  db.routes_meta.add({
    id: `sample-${sampleRouteDate}`,
    date: sampleRouteDate,
    year: now.getFullYear(),
    month: now.toLocaleString('default', { month: 'long' }),
    distance: 2.5,
    durationStr: '30m',
    mode: 'WALKING'
  });
  
  // Encoded polyline sample (Short walk)
  db.routes_data.add({
    id: `sample-${sampleRouteDate}`,
    compressedPath: '_p~iF~ps|U_ulLnnqC_mqNvxq', 
    type: 'SAMPLE'
  });
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
export const exportToZip = async (triggerDownload = false) => {
  const zip = new JSZip();
  const imgFolder = zip.folder("images");
  
  // 1. Fetch All Data
  const entries = await db.entries.toArray();
  const sleepSessions = await db.sleep_sessions.toArray();
  const chats = await db.chat_analytics.toArray();
  const meditations = await db.meditation_sessions.toArray();
  const people = await db.people.toArray();
  
  // [NEW] Fetch Route Data (Meta + Data)
  const routesMeta = await db.routes_meta.toArray();
  const routesData = await db.routes_data.toArray();
  
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

  // 3. Process People Images
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

  // [NEW] Add Routes to Zip
  if (routesMeta.length > 0) {
    zip.file("routes_meta.json", JSON.stringify(routesMeta, null, 2));
    zip.file("routes_data.json", JSON.stringify(routesData, null, 2));
  }

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

  // 2. Parse People Data
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

  // [NEW] Parse Route Data
  const routesMetaFile = zip.file("routes_meta.json");
  if (routesMetaFile) {
      const meta = JSON.parse(await routesMetaFile.async("string"));
      if (Array.isArray(meta)) await db.routes_meta.bulkPut(meta);
  }

  const routesDataFile = zip.file("routes_data.json");
  if (routesDataFile) {
      const data = JSON.parse(await routesDataFile.async("string"));
      if (Array.isArray(data)) await db.routes_data.bulkPut(data);
  }

  return importCount;
};
