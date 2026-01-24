import { createClient } from '@libsql/client';

const getClient = () => {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    return null;
  }
  return createClient({ url, authToken });
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
      image_refs TEXT,
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
      image_refs TEXT,
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

  try {
    await client.execute('ALTER TABLE entries ADD COLUMN image_refs TEXT');
  } catch {}
  try {
    await client.execute('ALTER TABLE people ADD COLUMN image_refs TEXT');
  } catch {}
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

const upsertEntry = async (client, row, force, conflicts) => {
  const existing = await client.execute({
    sql: 'SELECT * FROM entries WHERE id = ?',
    args: [row.id]
  });
  const current = existing.rows[0];
  const incomingTs = toTs(row.updated_at);
  const currentTs = toTs(current?.updated_at);

  if (!force && current && currentTs > incomingTs) {
    conflicts.entries.push({ id: row.id, remote: current });
    return;
  }

  await client.execute({
    sql: `
      INSERT INTO entries (
        id, date, mood, tags, people, location, location_lat, location_lng,
        location_history, weather, content, preview, images, image_refs, sessions, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        image_refs=excluded.image_refs,
        sessions=excluded.sessions,
        updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at
    `,
    args: [
      row.id,
      row.date || null,
      row.mood ?? null,
      row.tags || null,
      row.people || null,
      row.location || null,
      row.location_lat ?? null,
      row.location_lng ?? null,
      row.location_history || null,
      row.weather || null,
      row.content || null,
      row.preview || null,
      row.images || null,
      row.image_refs || null,
      row.sessions || null,
      row.updated_at,
      row.deleted_at || null
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
    conflicts.people.push({ id: row.id, remote: current });
    return;
  }

  await client.execute({
    sql: `
      INSERT INTO people (
        id, name, relationship, description, dates, gift_ideas, image, gallery, image_refs, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        relationship=excluded.relationship,
        description=excluded.description,
        dates=excluded.dates,
        gift_ideas=excluded.gift_ideas,
        image=excluded.image,
        gallery=excluded.gallery,
        image_refs=excluded.image_refs,
        updated_at=excluded.updated_at,
        deleted_at=excluded.deleted_at
    `,
    args: [
      row.id,
      row.name || null,
      row.relationship || null,
      row.description || null,
      row.dates || null,
      row.gift_ideas || null,
      row.image || null,
      row.gallery || null,
      row.image_refs || null,
      row.updated_at,
      row.deleted_at || null
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
    conflicts.meditation_sessions.push({ id: row.id, remote: current });
    return;
  }

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
      row.id,
      row.start_time ?? null,
      row.duration ?? null,
      row.updated_at,
      row.deleted_at || null
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
      conflicts.entries.push({ id: key, remote: current });
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
      conflicts.people.push({ id: key, remote: current });
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
      conflicts.meditation_sessions.push({ id: key, remote: current });
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

    if (body.probe) {
      const entryRes = await client.execute(
        'SELECT * FROM entries WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1'
      );
      const peopleRes = entryRes.rows.length === 0
        ? await client.execute('SELECT * FROM people WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1')
        : { rows: [] };
      const medRes = entryRes.rows.length === 0 && peopleRes.rows.length === 0
        ? await client.execute('SELECT * FROM meditation_sessions WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1')
        : { rows: [] };

      res.status(200).json({
        serverTime: new Date().toISOString(),
        probe: {
          entry: entryRes.rows[0] || null,
          person: peopleRes.rows[0] || null,
          meditation: medRes.rows[0] || null
        }
      });
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

    const entryUpdates = updates.entries || [];
    for (const row of entryUpdates) {
      await upsertEntry(client, row, false, conflicts);
    }

    const peopleUpdates = updates.people || [];
    for (const row of peopleUpdates) {
      await upsertPerson(client, row, false, conflicts);
    }

    const medUpdates = updates.meditation_sessions || [];
    for (const row of medUpdates) {
      await upsertMeditation(client, row, false, conflicts);
    }

    const deletes = updates.deletes || [];
    for (const tombstone of deletes) {
      await applyDelete(client, tombstone.store, tombstone.key, tombstone.deleted_at, conflicts, false);
    }

    const forcedEntries = force.entries || [];
    for (const row of forcedEntries) {
      await upsertEntry(client, row, true, conflicts);
    }

    const forcedPeople = force.people || [];
    for (const row of forcedPeople) {
      await upsertPerson(client, row, true, conflicts);
    }

    const forcedMeditations = force.meditation_sessions || [];
    for (const row of forcedMeditations) {
      await upsertMeditation(client, row, true, conflicts);
    }

    const forcedDeletes = force.deletes || [];
    for (const tombstone of forcedDeletes) {
      await applyDelete(client, tombstone.store, tombstone.key, tombstone.deleted_at, conflicts, true);
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

    res.status(200).json({
      serverTime: new Date().toISOString(),
      updates: {
        entries: entriesRes.rows,
        people: peopleRes.rows,
        meditation_sessions: medRes.rows
      },
      conflicts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
}
