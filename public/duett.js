(() => {
  const $ = id => document.getElementById(id);
  const key = 'bike-travel-lerntempoduett.single.v1';
  let state = {};
  let ready = false;
  let busy = false;
  let waiting = false;
  let leaving = false;
  let polling = false;
  try { state = JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch {}

  function remember() {
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch {}
  }

  async function api(action, body, timeout = 10000) {
    const headers = action ? { 'Content-Type': 'application/json' } : {};
    if (!action && state.token) headers['X-Duet-Member'] = state.token;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), timeout);
    let response;
    try {
      response = await fetch('/api/duett', {
        method: action ? 'POST' : 'GET', headers,
        body: action ? JSON.stringify({ action, ...body }) : undefined,
        signal: controller.signal
      });
    } finally {
      clearTimeout(deadline);
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Der Raumdienst antwortet gerade nicht.');
    return result;
  }

  function list(id, values, empty) {
    $(id).replaceChildren();
    for (const value of values.length ? values : [empty]) {
      const item = document.createElement('li');
      item.textContent = value;
      $(id).append(item);
    }
  }

  function apply(room, open = true) {
    list('room-pairs', room.pairs.map(pair => pair.join(' und ')), 'Noch keine Arbeitsteams');
    list('room-waiting', room.waiting, 'Niemand wartet');
    $('room-status').textContent = room.pairs.length + (room.pairs.length === 1 ? ' Arbeitsteam, ' : ' Arbeitsteams, ') + room.waiting.length + ' wartend';
    if (!state.token || state.solo) return;
    if (room.self?.partner) unlock(room.self.partner, false, open);
    else if (room.self?.name) {
      waiting = true;
      renderDialog();
      $('match-status').textContent = room.self.name + ', du stehst auf der Warteliste.';
      $('work-status').textContent = 'Du stehst auf der Warteliste.';
    } else if (waiting || ready) {
      waiting = false;
      ready = false;
      state = {};
      remember();
      resetAccess();
      $('work-status').textContent = 'Deine Anmeldung ist abgelaufen.';
    }
  }

  function renderDialog() {
    $('match-form').hidden = waiting;
    $('waiting-controls').hidden = !waiting;
  }

  function resetAccess() {
    document.querySelector('.view-tabs [data-view="reply"]').setAttribute('aria-disabled', 'true');
    for (const button of document.querySelectorAll('[data-solo]')) button.hidden = false;
    $('start-duet').textContent = 'Notizen fertig · Arbeitsteam finden';
    $('partner-line').hidden = true;
    if ($('team-dialog').open) $('team-dialog').close();
    renderDialog();
  }

  function unlock(partner, solo, open = true) {
    const goSolo = solo && open && !ready;
    const showTeam = !solo && state.partner !== partner;
    ready = true;
    waiting = false;
    document.querySelector('.view-tabs [data-view="reply"]').removeAttribute('aria-disabled');
    for (const button of document.querySelectorAll('[data-solo]')) button.hidden = true;
    $('start-duet').textContent = 'Zur Antwortmail';
    $('partner-line').hidden = solo;
    $('partner-line').textContent = solo ? '' : 'Dein Arbeitsteam mit ' + partner;
    $('work-status').textContent = solo ? '' : 'Dein Arbeitsteam mit ' + partner + ' steht fest.';
    if ($('solo-dialog').open) $('solo-dialog').close();
    if ($('match-dialog').open) $('match-dialog').close();
    $('solo-warning').hidden = !solo || !state.connectionLost;
    if (showTeam) {
      state.partner = partner;
      remember();
      $('team-members').textContent = state.name ? state.name + ' und ' + partner : 'Du und ' + partner;
      $('team-dialog').showModal();
    }
    if (goSolo) showView('reply');
  }

  $('team-continue').addEventListener('click', () => {
    $('team-dialog').close();
    showView('reply');
  });

  async function refresh(open = true) {
    const overviewVisible = !$('notes').hidden && $('room-overview').open;
    const lookingForTeam = !ready && state.token && !state.solo;
    if (busy || leaving || polling || !(lookingForTeam || overviewVisible)) return;
    const token = state.token;
    polling = true;
    try {
      const room = await api();
      if (token === state.token && !busy) apply(room, open);
    } catch (error) {
      $('room-status').textContent = 'Die Übersicht lädt gerade nicht.';
      if (waiting) $('match-status').textContent = error.message;
    } finally { polling = false; }
  }

  $('room-overview').addEventListener('toggle', () => {
    if ($('room-overview').open) void refresh(false);
  });
  $('start-duet').addEventListener('click', () => {
    if (ready) return showView('reply');
    renderDialog();
    $('match-dialog').showModal();
  });
  $('close-match').addEventListener('click', () => $('match-dialog').close());
  $('show-overview').addEventListener('click', () => {
    $('match-dialog').close();
    $('room-overview').open = true;
    $('room-overview').scrollIntoView({ block: 'nearest' });
  });

  $('match-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const name = $('match-name').value.trim();
    const token = state.token || crypto.randomUUID();
    state = { token, name };
    remember();
    busy = true;
    $('join-duet').disabled = true;
    $('match-status').textContent = 'Arbeitsteam wird gesucht …';
    try {
      const room = await api('join', { name, token });
      if (!leaving && state.token === token) apply(room);
    } catch (error) { if (!leaving && state.token === token) $('match-status').textContent = error.message; }
    finally {
      busy = false;
      $('join-duet').disabled = false;
    }
  });

  async function leave(solo) {
    if (leaving || ready) return;
    leaving = true;
    let connectionLost = false;
    try {
      if (state.token) {
        const room = await api(solo ? 'solo' : 'withdraw', { token: state.token }, 2200);
        if (room.self?.partner) return apply(room);
      }
    } catch (error) {
      if (!solo) {
        $('match-status').textContent = 'Die Anmeldung konnte noch nicht zurückgenommen werden. Versuche es erneut.';
        return;
      }
      connectionLost = true;
    } finally { leaving = false; }
    state = solo ? { solo: true, connectionLost } : {};
    waiting = false;
    remember();
    if (solo) unlock(null, true);
    else {
      renderDialog();
      $('match-status').textContent = 'Anmeldung zurückgenommen.';
      $('work-status').textContent = 'Anmeldung zurückgenommen.';
      void refresh(false);
    }
  }

  $('withdraw-duet').addEventListener('click', () => void leave(false));
  for (const button of document.querySelectorAll('[data-solo]')) {
    button.addEventListener('click', () => {
      if (!ready && !leaving) $('solo-dialog').showModal();
    });
  }
  $('solo-confirm').addEventListener('click', () => {
    $('solo-dialog').close();
    void leave(true);
  });
  $('match-name').value = state.name || '';
  if (state.solo) unlock(null, true, false);
  void refresh(false);
  setInterval(() => { if (!document.hidden) void refresh(); }, 6000);
})();
