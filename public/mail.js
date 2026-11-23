(() => {
  const $ = id => document.getElementById(id);
  const message = $('message');
  const key = 'bike-travel-konfliktmail.sent.v1';
  let sent = false;
  try { sent = localStorage.getItem(key) === 'true'; } catch {}

  function render() {
    message.readOnly = sent;
    message.hidden = sent;
    document.querySelector('label[for="message"]').hidden = sent;
    $('mail-reading').hidden = !sent;
    $('send-label').textContent = sent ? 'Bearbeiten' : 'Senden';
    $('send-mail').firstElementChild.textContent = sent ? '✎' : '➤';
    $('message-state').textContent = sent ? 'Gesendet' : 'Entwurf';
    $('sent-content').textContent = sent ? message.value : '';
  }

  function toggleSend() {
    if (!sent && !message.value.trim()) {
      $('status').textContent = 'Schreibe zuerst deine Antwort.';
      message.focus();
      return;
    }
    sent = !sent;
    saveDraft();
    try { localStorage.setItem(key, String(sent)); } catch {}
    render();
    $('status').textContent = sent ? '' : 'Der Entwurf ist wieder bearbeitbar.';
    if (sent) $('sent-content').focus({ preventScroll: true });
    else message.focus();
  }
  $('send-mail').addEventListener('click', toggleSend);
  render();

  function canvas(height, scale = 1) {
    const page = document.createElement('canvas');
    page.width = Math.floor(1240 * scale);
    page.height = Math.floor(height * scale);
    return page;
  }

  function drawPages(asImage) {
    const text = ['GFK-Notizen', ''];
    for (const [id, label] of Object.entries(fieldLabels)) {
      const value = $(id).value.trim();
      if (id === 'waiting-note' && !value) continue;
      text.push(label + ': ' + (value || '—'), '');
    }
    text.push(
      'Antwortmail',
      'An: Julia Kramer · Teamleitung Vertrieb',
      'Betreff: ' + $('reply-subject').textContent.trim(),
      '',
      message.value.trim()
    );
    if ($('objection-reply').value.trim()) {
      text.push('', 'Antwort auf den Einwand', $('objection-reply').value.trim());
    }
    const measure = canvas(1).getContext('2d');
    measure.font = '29px Arial, sans-serif';
    const lines = [];
    for (const paragraph of text.flatMap(value => value.split(/\r?\n/))) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const next = line + word;
        if (line && measure.measureText(next).width > 1100) {
          lines.push(line);
          line = '';
        }
        for (const character of word) {
          if (measure.measureText(line + character).width > 1100) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
        line += ' ';
      }
      lines.push(line.trimEnd());
    }
    const pages = [];
    const maxLines = asImage ? lines.length : 38;
    for (let offset = 0; offset < lines.length; offset += maxLines) {
      const group = lines.slice(offset, offset + maxLines);
      const height = asImage ? Math.max(460, 202 + group.length * 39) : 1754;
      const scale = asImage ? Math.min(1, 4096 / height) : 1;
      const page = canvas(height, scale);
      const ctx = page.getContext('2d');
      if (scale < 1) ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1240, height);
      ctx.fillStyle = '#214f7c';
      ctx.fillRect(0, 0, 1240, 112);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.fillText('Bike & Travel KG · ' + 'GFK-Notizen und Antwortmail', 70, 72);
      ctx.fillStyle = '#23354a';
      ctx.font = '29px Arial, sans-serif';
      group.forEach((line, index) => ctx.fillText(line, 70, 168 + index * 39));
      pages.push(page);
    }
    return pages;
  }

  function pdf(pages) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let length = 0;
    function add(value) {
      const bytes = typeof value === 'string' ? encoder.encode(value) : value;
      chunks.push(bytes);
      length += bytes.length;
    }
    function object(number, content, data) {
      offsets[number] = length;
      add(number + ' 0 obj\n' + content);
      if (data) { add('\nstream\n'); add(data); add('\nendstream'); }
      add('\nendobj\n');
    }
    add('%PDF-1.4\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, '<< /Type /Pages /Count ' + pages.length + ' /Kids [' +
      pages.map((_, index) => (3 + index * 3) + ' 0 R').join(' ') + '] >>');
    pages.forEach((page, index) => {
      const id = 3 + index * 3;
      const jpeg = Uint8Array.from(atob(page.toDataURL('image/jpeg', .93).split(',')[1]), char => char.charCodeAt(0));
      const draw = encoder.encode('q 595 0 0 842 0 0 cm /Im0 Do Q');
      object(id, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ' +
        (id + 1) + ' 0 R >> >> /Contents ' + (id + 2) + ' 0 R >>');
      object(id + 1, '<< /Type /XObject /Subtype /Image /Width ' + page.width + ' /Height ' + page.height +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>', jpeg);
      object(id + 2, '<< /Length ' + draw.length + ' >>', draw);
    });
    const xref = length;
    add('xref\n0 ' + offsets.length + '\n0000000000 65535 f \n');
    for (const offset of offsets.slice(1)) add(String(offset).padStart(10, '0') + ' 00000 n \n');
    add('trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function download(blob, extension) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'BM11_Antwort_an_Julia_Kramer.' + extension;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    $('export-status').textContent = 'Datei zum Speichern bereit.';
  }
  function exportMail(asImage) {
    if (!message.value.trim()) {
      $('export-status').textContent = 'Schreibe zuerst deine Antwort.';
      message.focus();
      return;
    }
    try {
      const pages = drawPages(asImage);
      if (!asImage) download(pdf(pages), 'pdf');
      else {
        const encoded = pages[0].toDataURL('image/png').split(',')[1];
        if (!encoded) throw new Error('PNG export failed');
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        download(new Blob([bytes], { type: 'image/png' }), 'png');
      }
    } catch {
      $('export-status').textContent = 'Die Datei konnte in diesem Browser nicht erstellt werden.';
    }
  }
  $('save-pdf').addEventListener('click', () => exportMail(false));
  $('save-image').addEventListener('click', () => exportMail(true));
})();
