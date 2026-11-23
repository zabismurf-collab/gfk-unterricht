import { readFile, stat } from 'node:fs/promises';

try {
  const requiredFiles = [
    'public/index.html',
    'public/duett.js',
    'public/mail.js',
    'public/BM11_GFK_Einstieg.png',
    'netlify/functions/duett.mjs',
    'lib/rooms.mjs'
  ];

  for (const file of requiredFiles) {
    const details = await stat(file).catch(() => null);
    if (!details?.isFile() || details.size === 0) {
      throw new Error(`Fehlende oder leere Datei: ${file}. Lade den entpackten ZIP-Inhalt ins Hauptverzeichnis des GitHub-Repositories hoch.`);
    }
  }

  const html = await readFile('public/index.html', 'utf8');
  if (!html.includes('id="notes"') || !html.includes('id="reply"')) {
    throw new Error('public/index.html enthält nicht beide Ansichten der Unterrichtswebsite.');
  }

  const endpoint = await import('../netlify/functions/duett.mjs');
  if (endpoint.config?.path !== '/api/duett' || typeof endpoint.default !== 'function') {
    throw new Error('Die Netlify Function für /api/duett ist nicht korrekt eingerichtet.');
  }

  console.log('BM11 GFK: Startseite, Bild und Netlify Function geprüft.');
} catch (error) {
  console.error('BM11 GFK: ' + error.message);
  process.exitCode = 1;
}
