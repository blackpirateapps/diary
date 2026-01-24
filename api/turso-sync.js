import { createClient } from '@libsql/client';
import crypto from 'crypto';

const getClient = () => {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    return null;
  }
  return createClient({ url, authToken });
};

const getCryptoKey = () => {
  const secret = process.env.TURSO_SYNC_SECRET;
  if (!secret) return null;
  return crypto.createHash('sha256').update(secret).digest();
};

const requireSyncKey = (req, res) => {
  const expected = process.env.TURSO_SYNC_KEY;
  if (!expected) return true;
  const provided = req.headers['x-sync-key'];
  if (provided !== expected) {
    res.status(401).json({ error: 'Invalid sync key.' });
    return false;
  }
  return true;
};

const toTs = (value) => {
  const ts = Date.parse(value || '');
  return Number.isNaN(ts) ? 0 : ts;
};

const ensureSchema = async (client) => {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY,
      date TEXT,
      mood TEXT,
      tags TEXT,
      people TEXT,
      location TEXT,
      location_lat TEXT,
      location_lng TEXT,
      location_history TEXT,
      weather TEXT,
      content TEXT,
      preview TEXT,
      images TEXT,
      sessions TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at)`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY,
      name TEXT,
      relationship TEXT,
      description TEXT,
      dates TEXT,
      gift_ideas TEXT,
      image TEXT,
      gallery TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_people_updated_at ON people(updated_at)`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS meditation_sessions (
      id INTEGER PRIMARY KEY,
      start_time TEXT,
      duration TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_meditation_updated_at ON meditation_sessions(updated_at)`);
};

const readJsonBody = (req) => {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
};

const encryptValue = (value, key) => {
  if (value === null || value === undefined) return null;
  const plain = String(value);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decryptValue = (value, key) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  if (!value.startsWith('enc:')) return value;
  const parts = value.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload.');
  }
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const data = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};

const decryptNumber = (value, key) => {
  const raw = decryptValue(value, key);
  if (raw === null || raw === undefined || raw === '') return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const decodeEntryRow = (row, key) => {
  if (!row) return row;
  return {
    ...row,
    date: decryptValue(row.date, key),
    mood: decryptNumber(row.mood, key),
    tags: decryptValue(row.tags, key),
    people: decryptValue(row.people, key),
    location: decryptValue(row.location, key),
    location_lat: decryptNumber(row.location_lat, key),
    location_lng: decryptNumber(row.location_lng, key),
    location_history: decryptValue(row.location_history, key),
    weather: decryptValue(row.weather, key),
    content: decryptValue(row.content, key),
    preview: decryptValue(row.preview, key),
    images: decryptValue(row.images, key),
    sessions: decryptValue(row.sessions, key)
  };
};

const decodePersonRow = (row, key) => {
  if (!row) return row;
  return {
    ...row,
    name: decryptValue(row.name, key),
    relationship: decryptValue(row.relationship, key),
    description: decryptValue(row.description, key),
    dates: decryptValue(row.dates, key),
    gift_ideas: decryptValue(row.gift_ideas, key),
    image: decryptValue(row.image, key),
    gallery: decryptValue(row.gallery, key)
  };
};

const decodeMeditationRow = (row, key) => {
  if (!row) return row;
  return {
    ...row,
    start_time: decryptNumber(row.start_time, key),
    duration: decryptNumber(row.duration, key)
  };
};

const upsertEntry = async (client, row, force, conflicts) => {
  const existing = await client.execute({
    sql: 'SELECT * FROM entries WHERE id = ?',
    args: [row.id]
  });
  const current = existing.rows[0];
  const incomingTs = toTs(row.updated_at);
  const currentTs = toTs(current?.updated_at);

  if (!force && current && currentTs > incomingTs) {
    conflicts.entries.push({ id: row.id, remote: decodeEntryRow(current, conflicts.key) });
    return;
  }

  const key = conflicts.key;
  const encrypted = {
    id: row.id,
    date: encryptValue(row.date, key),
    mood: encryptValue(row.mood, key),
    tags: encryptValue(row.tags, key),
    people: encryptValue(row.people, key),
    location: encryptValue(row.location, key),
    location_lat: encryptValue(row.location_lat, key),
    location_lng: encryptValue(row.location_lng, key),
    location_history: encryptValue(row.location_history, key),
    weather: encryptValue(row.weather, key),
    content: encryptValue(row.content, key),
    preview: encryptValue(row.preview, key),
    images: encryptValue(row.images, key),
    sessions: encryptValue(row.sessions, key),
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  };

  await client.execute({
    sql: `
      INSERT INTO entries (
        id, date, mood, tags, people, location, location_lat, location_lng,
        location_history, weather, content, preview, images, sessions, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date=excluded.date,
        mood=excluded.mood,
        tags=excluded.tags,
        people=excluded.people,
        location=excluded.location,
        location_lat=excluded.location_lat,
        location_lng=excluded.location_lng,
        location_history=excluded.location_history,
        weather=excluded.weather,
        content=excluded.content,
        preview=excluded.preview,
        images=excluded.images,
        sessions=excluded.sessions,
        updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at
    `,
    args: [
      encrypted.id,
      encrypted.date,
      encrypted.mood,
      encrypted.tags,
      encrypted.people,
      encrypted.location,
      encrypted.location_lat,
      encrypted.location_lng,
      encrypted.location_history,
      encrypted.weather,
      encrypted.content,
      encrypted.preview,
      encrypted.images,
      encrypted.sessions,
      encrypted.updated_at,
      encrypted.deleted_at
    ]
  });
};

const upsertPerson = async (client, row, force, conflicts) => {
  const existing = await client.execute({
    sql: 'SELECT * FROM people WHERE id = ?',
    args: [row.id]
  });
  const current = existing.rows[0];
  const incomingTs = toTs(row.updated_at);
  const currentTs = toTs(current?.updated_at);

  if (!force && current && currentTs > incomingTs) {
    conflicts.people.push({ id: row.id, remote: decodePersonRow(current, conflicts.key) });
    return;
  }

  const key = conflicts.key;
  const encrypted = {
    id: row.id,
    name: encryptValue(row.name, key),
    relationship: encryptValue(row.relationship, key),
    description: encryptValue(row.description, key),
    dates: encryptValue(row.dates, key),
    gift_ideas: encryptValue(row.gift_ideas, key),
    image: encryptValue(row.image, key),
    gallery: encryptValue(row.gallery, key),
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  };

  await client.execute({
    sql: `
      INSERT INTO people (
        id, name, relationship, description, dates, gift_ideas, image, gallery, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        relationship=excluded.relationship,
        description=excluded.description,
        dates=excluded.dates,
        gift_ideas=excluded.gift_ideas,
        image=excluded.image,
        gallery=excluded.gallery,
        updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at
    `,
    args: [
      encrypted.id,
      encrypted.name,
      encrypted.relationship,
      encrypted.description,
      encrypted.dates,
      encrypted.gift_ideas,
      encrypted.image,
      encrypted.gallery,
      encrypted.updated_at,
      encrypted.deleted_at
    ]
  });
};

const upsertMeditation = async (client, row, force, conflicts) => {
  const existing = await client.execute({
    sql: 'SELECT * FROM meditation_sessions WHERE id = ?',
    args: [row.id]
  });
  const current = existing.rows[0];
  const incomingTs = toTs(row.updated_at);
  const currentTs = toTs(current?.updated_at);

  if (!force && current && currentTs > incomingTs) {
    conflicts.meditation_sessions.push({ id: row.id, remote: decodeMeditationRow(current, conflicts.key) });
    return;
  }

  const key = conflicts.key;
  const encrypted = {
    id: row.id,
    start_time: encryptValue(row.start_time, key),
    duration: encryptValue(row.duration, key),
    updated_at: row.updated_at,
    deleted_at: row.deleted_at || null
  };

  await client.execute({
    sql: `
      INSERT INTO meditation_sessions (
        id, start_time, duration, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        start_time=excluded.start_time,
        duration=excluded.duration,
        updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at
    `,
    args: [
      encrypted.id,
      encrypted.start_time,
      encrypted.duration,
      encrypted.updated_at,
      encrypted.deleted_at
    ]
  });
};

const applyDelete = async (client, store, key, deletedAt, conflicts, force) => {
  if (!deletedAt) return;
  if (store === 'entries') {
    const existing = await client.execute({
      sql: 'SELECT * FROM entries WHERE id = ?',
      args: [key]
    });
    const current = existing.rows[0];
    if (!force && current && toTs(current.updated_at) > toTs(deletedAt)) {
      conflicts.entries.push({ id: key, remote: decodeEntryRow(current, conflicts.key) });
      return;
    }
    await client.execute({
      sql: 'UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ?',
      args: [deletedAt, deletedAt, key]
    });
    return;
  }

  if (store === 'people') {
    const existing = await client.execute({
      sql: 'SELECT * FROM people WHERE id = ?',
      args: [key]
    });
    const current = existing.rows[0];
    if (!force && current && toTs(current.updated_at) > toTs(deletedAt)) {
      conflicts.people.push({ id: key, remote: decodePersonRow(current, conflicts.key) });
      return;
    }
    await client.execute({
      sql: 'UPDATE people SET deleted_at = ?, updated_at = ? WHERE id = ?',
      args: [deletedAt, deletedAt, key]
    });
    return;
  }

  if (store === 'meditation_sessions') {
    const existing = await client.execute({
      sql: 'SELECT * FROM meditation_sessions WHERE id = ?',
      args: [key]
    });
    const current = existing.rows[0];
    if (!force && current && toTs(current.updated_at) > toTs(deletedAt)) {
      conflicts.meditation_sessions.push({ id: key, remote: decodeMeditationRow(current, conflicts.key) });
      return;
    }
    await client.execute({
      sql: 'UPDATE meditation_sessions SET deleted_at = ?, updated_at = ? WHERE id = ?',
      args: [deletedAt, deletedAt, key]
    });
  }
};

export default async function handler(req, res) {
  const client = getClient();
  if (!client) {
    res.status(503).json({ error: 'Turso is not configured.' });
    return;
  }

  const cryptoKey = getCryptoKey();
  if (!cryptoKey) {
    res.status(503).json({ error: 'Turso encryption secret is not configured.' });
    return;
  }

  if (!requireSyncKey(req, res)) return;

  try {
    await ensureSchema(client);

    if (req.method === 'GET') {
      res.status(200).json({ ok: true, serverTime: new Date().toISOString() });
      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const body = readJsonBody(req);
    if (!body) {
      res.status(400).json({ error: 'Invalid payload.' });
      return;
    }

    const lastSync = body.lastSync || null;
    const updates = body.updates || {};
    const force = body.force || {};

    const conflicts = {
      entries: [],
      people: [],
      meditation_sessions: []
    };
    const conflictsWithKey = { ...conflicts, key: cryptoKey };

    const entryUpdates = updates.entries || [];
    for (const row of entryUpdates) {
      await upsertEntry(client, row, false, conflictsWithKey);
    }

    const peopleUpdates = updates.people || [];
    for (const row of peopleUpdates) {
      await upsertPerson(client, row, false, conflictsWithKey);
    }

    const medUpdates = updates.meditation_sessions || [];
    for (const row of medUpdates) {
      await upsertMeditation(client, row, false, conflictsWithKey);
    }

    const deletes = updates.deletes || [];
    for (const tombstone of deletes) {
      await applyDelete(client, tombstone.store, tombstone.key, tombstone.deleted_at, conflictsWithKey, false);
    }

    const forcedEntries = force.entries || [];
    for (const row of forcedEntries) {
      await upsertEntry(client, row, true, conflictsWithKey);
    }

    const forcedPeople = force.people || [];
    for (const row of forcedPeople) {
      await upsertPerson(client, row, true, conflictsWithKey);
    }

    const forcedMeditations = force.meditation_sessions || [];
    for (const row of forcedMeditations) {
      await upsertMeditation(client, row, true, conflictsWithKey);
    }

    const forcedDeletes = force.deletes || [];
    for (const tombstone of forcedDeletes) {
      await applyDelete(client, tombstone.store, tombstone.key, tombstone.deleted_at, conflictsWithKey, true);
    }

    const updatedAfter = lastSync || '1970-01-01T00:00:00.000Z';
    const entriesRes = await client.execute({
      sql: 'SELECT * FROM entries WHERE updated_at > ? ORDER BY updated_at ASC',
      args: [updatedAfter]
    });
    const peopleRes = await client.execute({
      sql: 'SELECT * FROM people WHERE updated_at > ? ORDER BY updated_at ASC',
      args: [updatedAfter]
    });
    const medRes = await client.execute({
      sql: 'SELECT * FROM meditation_sessions WHERE updated_at > ? ORDER BY updated_at ASC',
      args: [updatedAfter]
    });

    const decodedEntries = entriesRes.rows.map((row) => decodeEntryRow(row, cryptoKey));
    const decodedPeople = peopleRes.rows.map((row) => decodePersonRow(row, cryptoKey));
    const decodedMeditations = medRes.rows.map((row) => decodeMeditationRow(row, cryptoKey));

    res.status(200).json({
      serverTime: new Date().toISOString(),
      updates: {
        entries: decodedEntries,
        people: decodedPeople,
        meditation_sessions: decodedMeditations
      },
      conflicts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
}
