const validToken = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roomDuration = 4 * 60 * 60 * 1000;
const waitingDuration = 2 * 60 * 1000;
const heartbeatInterval = 35 * 1000;

const code = 'bm11-gfk';

function pairNext(room, now) {
  while (room.waiting.length >= 2) {
    room.pairs.push({ people: room.waiting.splice(0, 2), matchedAt: now });
  }
}

function show(room, token) {
  const ownPair = room.pairs.find(pair => pair.people.some(person => person.token === token))?.people;
  const partner = ownPair?.find(person => person.token !== token);
  const self = ownPair?.find(person => person.token === token) ??
    room.waiting.find(person => person.token === token);
  return {
    code: room.code,
    waiting: room.waiting.map(person => person.name),
    pairs: room.pairs.map(pair => pair.people.map(person => person.name)),
    self: self ? { name: self.name, partner: partner?.name ?? null } : null
  };
}

function send(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function change(store, now, edit) {
  // Conditional writes serialize simultaneous arrivals without dropping a pupil.
  for (let attempt = 0; attempt < 10; attempt++) {
    const snapshot = await store.getWithMetadata(code, { type: 'json' });
    const room = snapshot?.data ?? { code, waiting: [], pairs: [], departed: [] };
    const count = room.waiting.length + room.pairs.length + room.departed.length;
    room.waiting = room.waiting.filter(person => person.seenAt > now - waitingDuration);
    room.pairs = room.pairs.filter(pair => pair.matchedAt > now - roomDuration);
    room.departed = room.departed.filter(entry => entry.at > now - roomDuration);
    const result = edit(room);
    if (result.error) return send(result, result.status);
    if (result.write || room.waiting.length + room.pairs.length + room.departed.length !== count) {
      const condition = snapshot ? { onlyIfMatch: snapshot.etag } : { onlyIfNew: true };
      const write = await store.setJSON(code, room, condition);
      if (!write.modified) continue;
    }
    return send({ ...show(room, result.token), ...result.extra });
  }
  return send({ error: 'Im Raum passiert gerade viel. Versuche es noch einmal.' }, 409);
}

export async function handle(request, store, now = Date.now()) {
  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return send({ error: 'Die Angaben konnten nicht gelesen werden.' }, 400); }
    if (!validToken.test(body?.token ?? '')) return send({ error: 'Bitte melde dich erneut an.' }, 400);
    const token = body.token;
    if (body.action === 'join') {
      const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
      if (name.length < 2 || name.length > 24 || !/^[\p{L}\p{N} .’'\-]+$/u.test(name)) {
        return send({ error: 'Gib einen Vornamen oder ein Kürzel mit 2 bis 24 Zeichen ein.' }, 400);
      }
      return change(store, now, room => {
        if (room.departed.some(entry => entry.token === token)) return { error: 'Dieser Entwurf wird bereits allein bearbeitet.', status: 409 };
        const current = show(room, token).self;
        if (current?.partner) return { token };
        const alreadyWaiting = room.waiting.find(person => person.token === token);
        if (alreadyWaiting) {
          alreadyWaiting.seenAt = now;
        } else {
          const used = [...room.waiting, ...room.pairs.flatMap(pair => pair.people)].some(person =>
            person.name.localeCompare(name, 'de', { sensitivity: 'base' }) === 0);
          if (used) return { error: 'Dieser Name ist bereits vergeben. Ergänze ein Kürzel.', status: 409 };
          room.waiting.push({ token, name, seenAt: now });
        }
        pairNext(room, now);
        return { token, write: true };
      });
    }
    if (body.action === 'solo' || body.action === 'withdraw') {
      return change(store, now, room => {
        const existing = show(room, token).self;
        if (existing?.partner) return { token, extra: { solo: false } };
        const position = room.waiting.findIndex(person => person.token === token);
        if (position !== -1) room.waiting.splice(position, 1);
        const newlyDeparted = !room.departed.some(entry => entry.token === token);
        if (newlyDeparted) room.departed.push({ token, at: now });
        return { token, write: position !== -1 || newlyDeparted, extra: { solo: true } };
      });
    }
    return send({ error: 'Unbekannte Aktion.' }, 400);
  }

  if (request.method === 'GET') {
    const token = request.headers.get('X-Duet-Member');
    return change(store, now, room => {
      const waiting = validToken.test(token ?? '') && room.waiting.find(person => person.token === token);
      if (waiting && waiting.seenAt <= now - heartbeatInterval) {
        waiting.seenAt = now;
        return { token, write: true };
      }
      return { token };
    });
  }
  return send({ error: 'Diese Anfrage wird nicht unterstützt.' }, 400);
}
