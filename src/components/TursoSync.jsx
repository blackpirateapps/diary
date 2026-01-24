import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, Loader2, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { diffLines } from 'diff';
import { db, runWithSyncBypass } from '../db';

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result === 'string') {
      resolve(result.split(',')[1] || '');
    } else {
      reject(new Error('Failed to encode blob.'));
    }
  };
  reader.onerror = () => reject(reader.error || new Error('Failed to encode blob.'));
  reader.readAsDataURL(blob);
});

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

const serializeImages = async (images = []) => {
  const payload = await Promise.all(images.map(async (img) => {
    if (img instanceof Blob) {
      const data = await blobToBase64(img);
      return { kind: 'blob', type: img.type || 'application/octet-stream', data };
    }
    if (typeof img === 'string') {
      return { kind: 'ref', value: img };
    }
    return null;
  }));
  return payload.filter(Boolean);
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
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [lastSync, setLastSync] = useState(localStorage.getItem('turso_last_sync'));
  const [conflicts, setConflicts] = useState([]);
  const [conflictIndex, setConflictIndex] = useState(0);

  useEffect(() => {
    const savedKey = localStorage.getItem('turso_sync_key');
    const savedBase = localStorage.getItem('turso_api_base');
    if (savedKey) setSyncKey(savedKey);
    if (savedBase) setApiBase(savedBase);
  }, []);

  const apiUrl = useMemo(() => {
    if (!apiBase) return '/api/turso-sync';
    const trimmed = apiBase.replace(/\/+$/, '');
    return `${trimmed}/api/turso-sync`;
  }, [apiBase]);

  const authHeaders = syncKey ? { 'x-sync-key': syncKey } : {};

  const handleSave = () => {
    localStorage.setItem('turso_sync_key', syncKey);
    localStorage.setItem('turso_api_base', apiBase);
    setStatus('success');
    setMessage('Settings saved locally.');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const serializeEntry = async (entry) => ({
    id: entry.id,
    date: entry.date || null,
    mood: entry.mood ?? null,
    tags: JSON.stringify(entry.tags || []),
    people: JSON.stringify(entry.people || []),
    location: entry.location || null,
    location_lat: entry.locationLat ?? null,
    location_lng: entry.locationLng ?? null,
    location_history: JSON.stringify(entry.locationHistory || []),
    weather: entry.weather || null,
    content: entry.content || null,
    preview: entry.preview || null,
    images: JSON.stringify(await serializeImages(entry.images || [])),
    sessions: JSON.stringify(entry.sessions || []),
    updated_at: entry.updated_at
  });

  const serializePerson = async (person) => ({
    id: person.id,
    name: person.name || null,
    relationship: person.relationship || null,
    description: person.description || null,
    dates: JSON.stringify(person.dates || []),
    gift_ideas: JSON.stringify(person.giftIdeas || []),
    image: JSON.stringify(await serializeImages(person.image ? [person.image] : [])),
    gallery: JSON.stringify(await serializeImages(person.gallery || [])),
    updated_at: person.updated_at
  });

  const serializeMeditation = async (session) => ({
    id: session.id,
    start_time: session.startTime ?? null,
    duration: session.duration ?? null,
    updated_at: session.updated_at
  });

  const deserializeEntry = async (row) => ({
    id: row.id,
    date: row.date || null,
    mood: row.mood ?? null,
    tags: safeJsonParse(row.tags || '[]', []),
    people: safeJsonParse(row.people || '[]', []),
    location: row.location || null,
    locationLat: row.location_lat ?? null,
    locationLng: row.location_lng ?? null,
    locationHistory: safeJsonParse(row.location_history || '[]', []),
    weather: row.weather || null,
    content: row.content || null,
    preview: row.preview || null,
    images: await deserializeImages(row.images || '[]'),
    sessions: safeJsonParse(row.sessions || '[]', []),
    updated_at: row.updated_at,
    sync_status: 'synced'
  });

  const deserializePerson = async (row) => {
    const imageList = await deserializeImages(row.image || '[]');
    return {
      id: row.id,
      name: row.name || '',
      relationship: row.relationship || 'Friend',
      description: row.description || '',
      dates: safeJsonParse(row.dates || '[]', []),
      giftIdeas: safeJsonParse(row.gift_ideas || '[]', []),
      image: imageList[0] || null,
      gallery: await deserializeImages(row.gallery || '[]'),
      updated_at: row.updated_at,
      sync_status: 'synced'
    };
  };

  const deserializeMeditation = async (row) => ({
    id: row.id,
    startTime: row.start_time ?? null,
    duration: row.duration ?? null,
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
    tags: safeJsonParse(row.tags || '[]', []),
    people: safeJsonParse(row.people || '[]', []),
    location: row.location,
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    locationHistory: safeJsonParse(row.location_history || '[]', []),
    weather: row.weather,
    preview: row.preview,
    images: summarizeImages(safeJsonParse(row.images || '[]', [])),
    sessions: safeJsonParse(row.sessions || '[]', []),
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  });

  const summarizeRemotePerson = (row) => ({
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    description: row.description,
    dates: safeJsonParse(row.dates || '[]', []),
    giftIdeas: safeJsonParse(row.gift_ideas || '[]', []),
    image: summarizeImages(safeJsonParse(row.image || '[]', []))[0] || null,
    gallery: summarizeImages(safeJsonParse(row.gallery || '[]', [])),
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  });

  const summarizeRemoteMeditation = (row) => ({
    id: row.id,
    startTime: row.start_time,
    duration: row.duration,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  });

  const formatDiff = (left, right) => {
    const leftText = JSON.stringify(left || {}, null, 2);
    const rightText = JSON.stringify(right || {}, null, 2);
    return diffLines(leftText, rightText);
  };

  const buildConflicts = (serverConflicts, locals, deletes) => {
    const output = [];
    const deleteKey = (store, key) => `${store}:${key}`;
    const deleteMap = new Map(deletes.map((d) => [deleteKey(d.store, d.key), d]));

    const addConflicts = (store, list) => {
      for (const item of list) {
        const local = locals[store].get(item.id) || null;
        const tombstone = deleteMap.get(deleteKey(store, item.id));
        output.push({
          store,
          id: item.id,
          local: tombstone ? { deleted_at: tombstone.deleted_at, _deleted: true } : local,
          remote: item.remote
        });
      }
    };

    addConflicts('entries', serverConflicts.entries || []);
    addConflicts('people', serverConflicts.people || []);
    addConflicts('meditation_sessions', serverConflicts.meditation_sessions || []);
    return output;
  };

  const handleSync = async () => {
    setStatus('loading');
    setMessage('Collecting changes...');

    try {
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

      const entriesPayload = await Promise.all(dirtyEntries.map(serializeEntry));
      const peoplePayload = await Promise.all(dirtyPeople.map(serializePerson));
      const meditationPayload = await Promise.all(dirtyMeditations.map(serializeMeditation));

      setMessage('Syncing with Turso...');
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          lastSync,
          updates: {
            entries: entriesPayload,
            people: peoplePayload,
            meditation_sessions: meditationPayload,
            deletes: dirtyDeletes.map((d) => ({
              store: d.store,
              key: d.key,
              deleted_at: d.deleted_at
            }))
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Sync failed.');
      }

      const data = await res.json();
      const newLastSync = data.serverTime || new Date().toISOString();
      localStorage.setItem('turso_last_sync', newLastSync);
      setLastSync(newLastSync);

      const conflictList = buildConflicts(data.conflicts || {}, localMaps, dirtyDeletes);
      setConflicts(conflictList);
      setConflictIndex(0);

      const conflictIds = {
        entries: new Set((data.conflicts?.entries || []).map((c) => c.id)),
        people: new Set((data.conflicts?.people || []).map((c) => c.id)),
        meditation_sessions: new Set((data.conflicts?.meditation_sessions || []).map((c) => c.id))
      };

      const deleteConflicts = new Set(conflictList.filter((c) => c.local?._deleted).map((c) => `${c.store}:${c.id}`));

      await runWithSyncBypass(async () => {
        for (const row of data.updates?.entries || []) {
          if (conflictIds.entries.has(row.id)) continue;
          if (row.deleted_at) {
            await db.entries.delete(row.id);
          } else {
            await db.entries.put(await deserializeEntry(row));
          }
        }

        for (const row of data.updates?.people || []) {
          if (conflictIds.people.has(row.id)) continue;
          if (row.deleted_at) {
            await db.people.delete(row.id);
          } else {
            await db.people.put(await deserializePerson(row));
          }
        }

        for (const row of data.updates?.meditation_sessions || []) {
          if (conflictIds.meditation_sessions.has(row.id)) continue;
          if (row.deleted_at) {
            await db.meditation_sessions.delete(row.id);
          } else {
            await db.meditation_sessions.put(await deserializeMeditation(row));
          }
        }
      });

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
    }
  };

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
              await db.entries.put(await deserializeEntry(current.remote));
            }
          } else if (current.store === 'people') {
            if (current.remote.deleted_at) {
              await db.people.delete(current.id);
            } else {
              await db.people.put(await deserializePerson(current.remote));
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

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
        </div>

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
