import { getStore } from '@netlify/blobs';
import { handle } from '../../lib/rooms.mjs';

export const config = { path: '/api/duett' };

export default async request => {
  try {
    return await handle(request, getStore({ name: 'gfk-lerntempoduett', consistency: 'strong' }));
  } catch (error) {
    console.error('Arbeitsteams:', error);
    return Response.json({ error: 'Der Raumdienst ist gerade nicht erreichbar.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
};
