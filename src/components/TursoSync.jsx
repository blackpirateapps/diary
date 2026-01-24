import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, Loader2, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { diffLines } from 'diff';
import { db, runWithSyncBypass } from '../db';

const base64ToBlob = (data, type) => {
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: type || 'application/octet-stream' });
};

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const encodeBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
};

const decodeBase64 = (value) => {
  const binary = atob(value || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const deriveKey = async (passphrase, salt) => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptValue = async (value, passphrase) => {
  if (value === null || value === undefined) return null;
  if (!passphrase) throw new Error('Passphrase required.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encoded = textEncoder.encode(String(value));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipherBuffer);
  return `enc:v1:${encodeBase64(salt)}:${encodeBase64(iv)}:${encodeBase64(cipherBytes)}`;
};

const decryptValue = async (value, passphrase) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  if (!value.startsWith('enc:v1:')) return value;
  if (!passphrase) throw new Error('Passphrase required.');
  const parts = value.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted payload.');
  }
  const salt = decodeBase64(parts[2]);
  const iv = decodeBase64(parts[3]);
  const data = decodeBase64(parts[4]);
  const key = await deriveKey(passphrase, salt);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return textDecoder.decode(plainBuffer);
};

const decryptNumber = async (value, passphrase) => {
  const raw = await decryptValue(value, passphrase);
  if (raw === null || raw === undefined || raw === '') return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const serializeImages = async () => {
  // Image sync is disabled to avoid oversized payloads.
  return [];
};

const deserializeImages = async (raw) => {
  const list = Array.isArray(raw) ? raw : safeJsonParse(raw || '[]', []);
  const output = [];
  for (const item of list) {
    if (!item) continue;
    if (item.kind === 'blob') {
      output.push(base64ToBlob(item.data, item.type));
    } else if (item.kind === 'ref') {
      output.push(item.value);
    } else if (typeof item === 'string') {
      output.push(item);
    }
  }
  return output;
};

const summarizeImages = (images = []) => images.map((img) => {
  if (img instanceof Blob) return `Blob(${img.type || 'blob'}, ${img.size} bytes)`;
  if (typeof img === 'string') return img;
  if (img && img.kind === 'blob') return `Blob(${img.type || 'blob'}, ${img.data?.length || 0} chars)`;
  if (img && img.kind === 'ref') return img.value;
  return 'Unknown';
});

const TursoSync = () => {
  const [syncKey, setSyncKey] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [lastSync, setLastSync] = useState(localStorage.getItem('turso_last_sync'));
  const [conflicts, setConflicts] = useState([]);
  const [conflictIndex, setConflictIndex] = useState(0);
  const BATCH_SIZE = 5;
  const syncingRef = useRef(false);
  const [syncStats, setSyncStats] = useState(null);

  const apiUrl = useMemo(() => {
    if (!apiBase) return '/api/turso-sync';
    const trimmed = apiBase.replace(/\/+$/, '');
    return `${trimmed}/api/turso-sync`;
  }, [apiBase]);

  const authHeaders = syncKey ? { 'x-sync-key': syncKey } : {};

  const initSchema = async () => {
    try {
      await fetch(apiUrl, { headers: authHeaders });
    } catch {
      // Silent: schema init is best-effort.
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('turso_sync_key');
    const savedBase = localStorage.getItem('turso_api_base');
    const savedPassphrase = localStorage.getItem('turso_passphrase');
    const savedAutoSync = localStorage.getItem('turso_auto_sync') === 'true';
    if (savedKey) setSyncKey(savedKey);
    if (savedBase) setApiBase(savedBase);
    if (savedPassphrase) setPassphrase(savedPassphrase);
    if (savedAutoSync) setAutoSync(true);
  }, []);

  useEffect(() => {
    if (syncKey || apiBase) initSchema();
  }, [syncKey, apiBase, apiUrl]);

  const handleSave = () => {
    localStorage.setItem('turso_sync_key', syncKey);
    localStorage.setItem('turso_api_base', apiBase);
    localStorage.setItem('turso_passphrase', passphrase);
    localStorage.setItem('turso_auto_sync', autoSync ? 'true' : 'false');
    setStatus('success');
    setMessage('Settings saved locally.');
    setTimeout(() => setStatus('idle'), 2000);
    initSchema();
  };

  const serializeEntry = async (entry) => ({
    id: entry.id,
    date: await encryptValue(entry.date || null, passphrase),
    mood: await encryptValue(entry.mood ?? null, passphrase),
    tags: await encryptValue(JSON.stringify(entry.tags || []), passphrase),
    people: await encryptValue(JSON.stringify(entry.people || []), passphrase),
    location: await encryptValue(entry.location || null, passphrase),
    location_lat: await encryptValue(entry.locationLat ?? null, passphrase),
    location_lng: await encryptValue(entry.locationLng ?? null, passphrase),
    location_history: await encryptValue(JSON.stringify(entry.locationHistory || []), passphrase),
    weather: await encryptValue(entry.weather || null, passphrase),
    content: await encryptValue(entry.content || null, passphrase),
    preview: await encryptValue(entry.preview || null, passphrase),
    images: await encryptValue(JSON.stringify(await serializeImages()), passphrase),
    sessions: await encryptValue(JSON.stringify(entry.sessions || []), passphrase),
    updated_at: entry.updated_at
  });

  const serializePerson = async (person) => ({
    id: person.id,
    name: await encryptValue(person.name || null, passphrase),
    relationship: await encryptValue(person.relationship || null, passphrase),
    description: await encryptValue(person.description || null, passphrase),
    dates: await encryptValue(JSON.stringify(person.dates || []), passphrase),
    gift_ideas: await encryptValue(JSON.stringify(person.giftIdeas || []), passphrase),
    image: await encryptValue(JSON.stringify(await serializeImages()), passphrase),
    gallery: await encryptValue(JSON.stringify(await serializeImages()), passphrase),
    updated_at: person.updated_at
  });

  const serializeMeditation = async (session) => ({
    id: session.id,
    start_time: await encryptValue(session.startTime ?? null, passphrase),
    duration: await encryptValue(session.duration ?? null, passphrase),
    updated_at: session.updated_at
  });

  const deserializeEntry = async (row, existingImages) => {
    const rawImages = await decryptValue(row.images || '[]', passphrase);
    const incomingImages = await deserializeImages(rawImages || '[]');
    const mergedImages = incomingImages.length > 0 ? incomingImages : (existingImages || []);
    return {
      id: row.id,
      date: await decryptValue(row.date || null, passphrase),
      mood: await decryptNumber(row.mood ?? null, passphrase),
      tags: safeJsonParse(await decryptValue(row.tags || '[]', passphrase) || '[]', []),
      people: safeJsonParse(await decryptValue(row.people || '[]', passphrase) || '[]', []),
      location: await decryptValue(row.location || null, passphrase),
      locationLat: await decryptNumber(row.location_lat ?? null, passphrase),
      locationLng: await decryptNumber(row.location_lng ?? null, passphrase),
      locationHistory: safeJsonParse(await decryptValue(row.location_history || '[]', passphrase) || '[]', []),
      weather: await decryptValue(row.weather || null, passphrase),
      content: await decryptValue(row.content || null, passphrase),
      preview: await decryptValue(row.preview || null, passphrase),
      images: mergedImages,
      sessions: safeJsonParse(await decryptValue(row.sessions || '[]', passphrase) || '[]', []),
      updated_at: row.updated_at,
      sync_status: 'synced'
    };
  };

  const deserializePerson = async (row, existingImage, existingGallery) => {
    const rawImage = await decryptValue(row.image || '[]', passphrase);
    const rawGallery = await decryptValue(row.gallery || '[]', passphrase);
    const imageList = await deserializeImages(rawImage || '[]');
    const galleryList = await deserializeImages(rawGallery || '[]');
    const mergedImage = imageList[0] || existingImage || null;
    const mergedGallery = galleryList.length > 0 ? galleryList : (existingGallery || []);
    return {
      id: row.id,
      name: await decryptValue(row.name || '', passphrase),
      relationship: await decryptValue(row.relationship || 'Friend', passphrase),
      description: await decryptValue(row.description || '', passphrase),
      dates: safeJsonParse(await decryptValue(row.dates || '[]', passphrase) || '[]', []),
      giftIdeas: safeJsonParse(await decryptValue(row.gift_ideas || '[]', passphrase) || '[]', []),
      image: mergedImage,
      gallery: mergedGallery,
      updated_at: row.updated_at,
      sync_status: 'synced'
    };
  };

  const deserializeMeditation = async (row) => ({
    id: row.id,
    startTime: await decryptNumber(row.start_time ?? null, passphrase),
    duration: await decryptNumber(row.duration ?? null, passphrase),
    updated_at: row.updated_at,
    sync_status: 'synced'
  });

  const summarizeEntry = (entry) => ({
    id: entry.id,
    date: entry.date,
    mood: entry.mood,
    tags: entry.tags || [],
    people: entry.people || [],
    location: entry.location,
    locationLat: entry.locationLat,
    locationLng: entry.locationLng,
    locationHistory: entry.locationHistory || [],
    weather: entry.weather,
    preview: entry.preview,
    images: summarizeImages(entry.images || []),
    sessions: entry.sessions || [],
    updated_at: entry.updated_at
  });

  const summarizePerson = (person) => ({
    id: person.id,
    name: person.name,
    relationship: person.relationship,
    description: person.description,
    dates: person.dates || [],
    giftIdeas: person.giftIdeas || [],
    image: summarizeImages(person.image ? [person.image] : [])[0] || null,
    gallery: summarizeImages(person.gallery || []),
    updated_at: person.updated_at
  });

  const summarizeMeditation = (session) => ({
    id: session.id,
    startTime: session.startTime,
    duration: session.duration,
    updated_at: session.updated_at
  });

  const summarizeRemoteEntry = (row) => ({
    id: row.id,
    date: row.date,
    mood: row.mood,
    tags: row.tags || [],
    people: row.people || [],
    location: row.location,
    locationLat: row.locationLat,
    locationLng: row.locationLng,
    locationHistory: row.locationHistory || [],
    weather: row.weather,
    preview: row.preview,
    images: summarizeImages(row.images || []),
    sessions: row.sessions || [],
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  });

  const summarizeRemotePerson = (row) => ({
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    description: row.description,
    dates: row.dates || [],
    giftIdeas: row.giftIdeas || [],
    image: summarizeImages(row.image ? [row.image] : [])[0] || null,
    gallery: summarizeImages(row.gallery || []),
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  });

  const summarizeRemoteMeditation = (row) => ({
    id: row.id,
    startTime: row.startTime,
    duration: row.duration,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  });

  const formatDiff = (left, right) => {
    const leftText = JSON.stringify(left || {}, null, 2);
    const rightText = JSON.stringify(right || {}, null, 2);
    return diffLines(leftText, rightText);
  };

  const buildConflicts = async (serverConflicts, locals, deletes) => {
    const output = [];
    const deleteKey = (store, key) => `${store}:${key}`;
    const deleteMap = new Map(deletes.map((d) => [deleteKey(d.store, d.key), d]));

    const addConflicts = async (store, list) => {
      for (const item of list) {
        const local = locals[store].get(item.id) || null;
        const tombstone = deleteMap.get(deleteKey(store, item.id));
        let remote = item.remote;
        if (!tombstone) {
          if (store === 'entries') {
            remote = {
              id: item.remote.id,
              date: await decryptValue(item.remote.date || null, passphrase),
              mood: await decryptNumber(item.remote.mood ?? null, passphrase),
              tags: safeJsonParse(await decryptValue(item.remote.tags || '[]', passphrase) || '[]', []),
              people: safeJsonParse(await decryptValue(item.remote.people || '[]', passphrase) || '[]', []),
              location: await decryptValue(item.remote.location || null, passphrase),
              locationLat: await decryptNumber(item.remote.location_lat ?? null, passphrase),
              locationLng: await decryptNumber(item.remote.location_lng ?? null, passphrase),
              locationHistory: safeJsonParse(await decryptValue(item.remote.location_history || '[]', passphrase) || '[]', []),
              weather: await decryptValue(item.remote.weather || null, passphrase),
              content: await decryptValue(item.remote.content || null, passphrase),
              preview: await decryptValue(item.remote.preview || null, passphrase),
              images: safeJsonParse(await decryptValue(item.remote.images || '[]', passphrase) || '[]', []),
              sessions: safeJsonParse(await decryptValue(item.remote.sessions || '[]', passphrase) || '[]', []),
              updated_at: item.remote.updated_at,
              deleted_at: item.remote.deleted_at || null
            };
          } else if (store === 'people') {
            remote = {
              id: item.remote.id,
              name: await decryptValue(item.remote.name || '', passphrase),
              relationship: await decryptValue(item.remote.relationship || '', passphrase),
              description: await decryptValue(item.remote.description || '', passphrase),
              dates: safeJsonParse(await decryptValue(item.remote.dates || '[]', passphrase) || '[]', []),
              giftIdeas: safeJsonParse(await decryptValue(item.remote.gift_ideas || '[]', passphrase) || '[]', []),
              image: (safeJsonParse(await decryptValue(item.remote.image || '[]', passphrase) || '[]', []) || [])[0] || null,
              gallery: safeJsonParse(await decryptValue(item.remote.gallery || '[]', passphrase) || '[]', []),
              updated_at: item.remote.updated_at,
              deleted_at: item.remote.deleted_at || null
            };
          } else if (store === 'meditation_sessions') {
            remote = {
              id: item.remote.id,
              startTime: await decryptNumber(item.remote.start_time ?? null, passphrase),
              duration: await decryptNumber(item.remote.duration ?? null, passphrase),
              updated_at: item.remote.updated_at,
              deleted_at: item.remote.deleted_at || null
            };
          }
        }
        output.push({
          store,
          id: item.id,
          local: tombstone ? { deleted_at: tombstone.deleted_at, _deleted: true } : local,
          remote
        });
      }
    };

    await addConflicts('entries', serverConflicts.entries || []);
    await addConflicts('people', serverConflicts.people || []);
    await addConflicts('meditation_sessions', serverConflicts.meditation_sessions || []);
    return output;
  };

  const chunkArray = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  };

  const handleSync = useCallback(async () => {
    if (syncingRef.current) return;
    setStatus('loading');
    setMessage('Collecting changes...');
    setSyncStats(null);

    try {
      if (!passphrase) {
        setStatus('error');
        setMessage('Passphrase required.');
        return;
      }
      if (!crypto?.subtle) {
        setStatus('error');
        setMessage('Web Crypto is not supported in this browser.');
        return;
      }
      syncingRef.current = true;
      await initSchema();
      const [dirtyEntries, dirtyPeople, dirtyMeditations, dirtyDeletes] = await Promise.all([
        db.entries.where('sync_status').equals('dirty').toArray(),
        db.people.where('sync_status').equals('dirty').toArray(),
        db.meditation_sessions.where('sync_status').equals('dirty').toArray(),
        db.tombstones.where('sync_status').equals('dirty').toArray()
      ]);

      const localMaps = {
        entries: new Map(dirtyEntries.map((entry) => [entry.id, entry])),
        people: new Map(dirtyPeople.map((person) => [person.id, person])),
        meditation_sessions: new Map(dirtyMeditations.map((session) => [session.id, session]))
      };

      const peoplePayload = await Promise.all(dirtyPeople.map(serializePerson));
      const meditationPayload = await Promise.all(dirtyMeditations.map(serializeMeditation));
      const entryChunks = chunkArray(dirtyEntries, BATCH_SIZE);
      const requestCount = Math.max(entryChunks.length, 1);
      let currentLastSync = lastSync;
      const aggregatedConflicts = {
        entries: [],
        people: [],
        meditation_sessions: []
      };
      const aggregatedUpdates = {
        entries: [],
        people: [],
        meditation_sessions: []
      };
      const stats = {
        totalEntries: dirtyEntries.length,
        totalPeople: dirtyPeople.length,
        totalMeditations: dirtyMeditations.length,
        totalDeletes: dirtyDeletes.length,
        batches: requestCount,
        completedBatches: 0,
        pushedEntries: 0,
        pushedPeople: 0,
        pushedMeditations: 0,
        pushedDeletes: 0,
        pulledEntries: 0,
        pulledPeople: 0,
        pulledMeditations: 0,
        conflicts: 0
      };

      for (let i = 0; i < requestCount; i += 1) {
        setMessage(`Syncing with Turso... (${i + 1}/${requestCount})`);
        setSyncStats({ ...stats, completedBatches: i });
        const entryPayload = await Promise.all((entryChunks[i] || []).map(serializeEntry));
        stats.pushedEntries += entryPayload.length;
        if (i === 0) {
          stats.pushedPeople = peoplePayload.length;
          stats.pushedMeditations = meditationPayload.length;
          stats.pushedDeletes = dirtyDeletes.length;
        }
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            lastSync: currentLastSync,
            updates: {
              entries: entryPayload,
              people: i === 0 ? peoplePayload : [],
              meditation_sessions: i === 0 ? meditationPayload : [],
              deletes: i === 0
                ? dirtyDeletes.map((d) => ({
                    store: d.store,
                    key: d.key,
                    deleted_at: d.deleted_at
                  }))
                : []
            }
          })
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Sync failed.');
        }

        const data = await res.json();
        aggregatedConflicts.entries.push(...(data.conflicts?.entries || []));
        aggregatedConflicts.people.push(...(data.conflicts?.people || []));
        aggregatedConflicts.meditation_sessions.push(...(data.conflicts?.meditation_sessions || []));

        aggregatedUpdates.entries.push(...(data.updates?.entries || []));
        aggregatedUpdates.people.push(...(data.updates?.people || []));
        aggregatedUpdates.meditation_sessions.push(...(data.updates?.meditation_sessions || []));

        currentLastSync = data.serverTime || currentLastSync || new Date().toISOString();
        stats.completedBatches = i + 1;
        setSyncStats({ ...stats });
      }

      const newLastSync = currentLastSync || new Date().toISOString();
      localStorage.setItem('turso_last_sync', newLastSync);
      setLastSync(newLastSync);

      const conflictList = await buildConflicts(aggregatedConflicts, localMaps, dirtyDeletes);
      setConflicts(conflictList);
      setConflictIndex(0);
      stats.conflicts = conflictList.length;

      const conflictIds = {
        entries: new Set(aggregatedConflicts.entries.map((c) => c.id)),
        people: new Set(aggregatedConflicts.people.map((c) => c.id)),
        meditation_sessions: new Set(aggregatedConflicts.meditation_sessions.map((c) => c.id))
      };

      const deleteConflicts = new Set(conflictList.filter((c) => c.local?._deleted).map((c) => `${c.store}:${c.id}`));

      await runWithSyncBypass(async () => {
        for (const row of aggregatedUpdates.entries) {
          if (conflictIds.entries.has(row.id)) continue;
          if (row.deleted_at) {
            await db.entries.delete(row.id);
          } else {
            const existing = await db.entries.get(row.id);
            await db.entries.put(await deserializeEntry(row, existing?.images));
          }
        }

        for (const row of aggregatedUpdates.people) {
          if (conflictIds.people.has(row.id)) continue;
          if (row.deleted_at) {
            await db.people.delete(row.id);
          } else {
            const existing = await db.people.get(row.id);
            await db.people.put(await deserializePerson(row, existing?.image, existing?.gallery));
          }
        }

        for (const row of aggregatedUpdates.meditation_sessions) {
          if (conflictIds.meditation_sessions.has(row.id)) continue;
          if (row.deleted_at) {
            await db.meditation_sessions.delete(row.id);
          } else {
            await db.meditation_sessions.put(await deserializeMeditation(row));
          }
        }
      });
      stats.pulledEntries = aggregatedUpdates.entries.length;
      stats.pulledPeople = aggregatedUpdates.people.length;
      stats.pulledMeditations = aggregatedUpdates.meditation_sessions.length;
      setSyncStats({ ...stats });

      const markSynced = async (store, ids) => {
        if (ids.length === 0) return;
        await runWithSyncBypass(async () => {
          await db[store].where('id').anyOf(ids).modify({ sync_status: 'synced' });
        });
      };

      await markSynced('entries', dirtyEntries.map((e) => e.id).filter((id) => !conflictIds.entries.has(id)));
      await markSynced('people', dirtyPeople.map((p) => p.id).filter((id) => !conflictIds.people.has(id)));
      await markSynced('meditation_sessions', dirtyMeditations.map((m) => m.id).filter((id) => !conflictIds.meditation_sessions.has(id)));

      const deletionsToClear = dirtyDeletes
        .filter((d) => !deleteConflicts.has(`${d.store}:${d.key}`))
        .map((d) => d.id);
      if (deletionsToClear.length > 0) {
        await db.tombstones.bulkDelete(deletionsToClear);
      }

      setStatus(conflictList.length ? 'error' : 'success');
      setMessage(conflictList.length ? 'Conflicts need review.' : 'Sync complete.');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error.message || 'Sync failed.');
    } finally {
      syncingRef.current = false;
    }
  }, [apiUrl, authHeaders, buildConflicts, initSchema, lastSync, passphrase]);

  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      if (!passphrase || conflicts.length > 0) return;
      handleSync();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoSync, conflicts.length, handleSync, passphrase]);

  const resolveConflict = async (action) => {
    const current = conflicts[conflictIndex];
    if (!current) return;

    setStatus('loading');
    setMessage('Resolving conflict...');

    try {
      if (action === 'local') {
        const forcePayload = { entries: [], people: [], meditation_sessions: [], deletes: [] };
        if (current.local?._deleted) {
          forcePayload.deletes.push({
            store: current.store,
            key: current.id,
            deleted_at: current.local.deleted_at
          });
        } else if (current.store === 'entries') {
          forcePayload.entries.push(await serializeEntry(current.local));
        } else if (current.store === 'people') {
          forcePayload.people.push(await serializePerson(current.local));
        } else if (current.store === 'meditation_sessions') {
          forcePayload.meditation_sessions.push(await serializeMeditation(current.local));
        }

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            lastSync,
            force: forcePayload
          })
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Conflict resolution failed.');
        }

        const data = await res.json();
        const newLastSync = data.serverTime || new Date().toISOString();
        localStorage.setItem('turso_last_sync', newLastSync);
        setLastSync(newLastSync);

        await runWithSyncBypass(async () => {
          if (current.local?._deleted) {
            const tombstone = await db.tombstones.where({ store: current.store, key: current.id }).first();
            if (tombstone) await db.tombstones.delete(tombstone.id);
            return;
          }
          if (current.store === 'entries') {
            await db.entries.update(current.id, { sync_status: 'synced' });
          } else if (current.store === 'people') {
            await db.people.update(current.id, { sync_status: 'synced' });
          } else if (current.store === 'meditation_sessions') {
            await db.meditation_sessions.update(current.id, { sync_status: 'synced' });
          }
        });
      } else if (action === 'remote') {
        await runWithSyncBypass(async () => {
          if (current.local?._deleted) {
            const tombstone = await db.tombstones.where({ store: current.store, key: current.id }).first();
            if (tombstone) await db.tombstones.delete(tombstone.id);
          }
          if (current.store === 'entries') {
            if (current.remote.deleted_at) {
              await db.entries.delete(current.id);
            } else {
              const existing = await db.entries.get(current.id);
              await db.entries.put(await deserializeEntry(current.remote, existing?.images));
            }
          } else if (current.store === 'people') {
            if (current.remote.deleted_at) {
              await db.people.delete(current.id);
            } else {
              const existing = await db.people.get(current.id);
              await db.people.put(await deserializePerson(current.remote, existing?.image, existing?.gallery));
            }
          } else if (current.store === 'meditation_sessions') {
            if (current.remote.deleted_at) {
              await db.meditation_sessions.delete(current.id);
            } else {
              await db.meditation_sessions.put(await deserializeMeditation(current.remote));
            }
          }
        });
      }

      const nextIndex = conflictIndex + 1;
      if (nextIndex >= conflicts.length) {
        setConflicts([]);
        setConflictIndex(0);
        setStatus('success');
        setMessage('Conflicts resolved.');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setConflictIndex(nextIndex);
        setStatus('idle');
        setMessage('');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error.message || 'Conflict resolution failed.');
    }
  };

  const activeConflict = conflicts[conflictIndex];
  const conflictDiff = activeConflict
    ? formatDiff(
        activeConflict.local?._deleted
          ? { deleted_at: activeConflict.local.deleted_at }
          : activeConflict.store === 'entries'
            ? summarizeEntry(activeConflict.local || {})
            : activeConflict.store === 'people'
              ? summarizePerson(activeConflict.local || {})
              : summarizeMeditation(activeConflict.local || {}),
        activeConflict.store === 'entries'
          ? summarizeRemoteEntry(activeConflict.remote || {})
          : activeConflict.store === 'people'
            ? summarizeRemotePerson(activeConflict.remote || {})
            : summarizeRemoteMeditation(activeConflict.remote || {})
      )
    : [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Cloud className="text-[var(--accent-500)]" size={20} />
          <h3 className="font-bold text-gray-900 dark:text-white">Cloud Sync (Turso)</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">API Base URL (optional)</label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://your-app.vercel.app"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-500)] dark:text-white"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Sync Key (optional)</label>
          <input
            type="password"
            value={syncKey}
            onChange={(e) => setSyncKey(e.target.value)}
            placeholder="Matches TURSO_SYNC_KEY"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-500)] dark:text-white"
          />
        </div>

        <div className="relative">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Passphrase</label>
          <input
            type={showPassphrase ? 'text' : 'password'}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Required for encryption"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-500)] dark:text-white pr-10"
          />
          <button
            onClick={() => setShowPassphrase(!showPassphrase)}
            className="absolute right-3 top-7 text-gray-400 hover:text-gray-600"
          >
            {showPassphrase ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSave}
            className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={handleSync}
            disabled={status === 'loading'}
            className="flex-1 bg-[var(--accent-500)] hover:brightness-110 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[var(--accent-200)]"
          >
            {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Sync Now
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => {
              setAutoSync(e.target.checked);
              localStorage.setItem('turso_auto_sync', e.target.checked ? 'true' : 'false');
            }}
          />
          Auto sync every 5 seconds
        </label>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
        </div>

        {syncStats && (
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Batch: {syncStats.completedBatches}/{syncStats.batches}</div>
            <div>Pushed: entries {syncStats.pushedEntries}, people {syncStats.pushedPeople}, meditation {syncStats.pushedMeditations}, deletes {syncStats.pushedDeletes}</div>
            <div>Pulled: entries {syncStats.pulledEntries}, people {syncStats.pulledPeople}, meditation {syncStats.pulledMeditations}</div>
            <div>Conflicts: {syncStats.conflicts}</div>
          </div>
        )}

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}
            >
              {status === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeConflict && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Sync conflict</h4>
                  <p className="text-xs text-gray-500">{activeConflict.store} #{activeConflict.id}</p>
                </div>
                <button
                  onClick={() => {
                    setConflicts([]);
                    setConflictIndex(0);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 max-h-[50vh] overflow-y-auto bg-gray-50 dark:bg-gray-950">
                <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                  {conflictDiff.map((part, idx) => (
                    <span
                      key={idx}
                      className={part.added ? 'text-green-600' : part.removed ? 'text-red-600' : ''}
                    >
                      {part.value}
                    </span>
                  ))}
                </pre>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => resolveConflict('remote')}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Use Remote
                </button>
                <button
                  onClick={() => resolveConflict('local')}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--accent-500)] text-white hover:brightness-110"
                >
                  Keep Local
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TursoSync;
