// Funzione pubblica di Supabase: il calendario dei turni di un utente, per Google Calendar e altri calendari
// che si "abbonano" a un indirizzo (issue #4). L'indirizzo contiene un token segreto; del token il database
// conserva solo l'impronta (calendar_feed_events, migrazione 20261023120000_team-turni.sql).
//
// Pubblicazione (senza controllo del login, perché Google non può accedere):
//   supabase functions deploy turni-ics --no-verify-jwt --project-ref <progetto>
import { buildIcs } from '../_shared/ics.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Metodo non consentito', { status: 405 });
  const token = (new URL(req.url).searchParams.get('token') ?? '').replace(/\.ics$/, '');
  if (!/^[0-9a-f]{64}$/.test(token)) return new Response('Calendario non trovato', { status: 404 });
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/calendar_feed_events', {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return new Response('Calendario non disponibile', { status: 502 });
  const shifts = await res.json();
  return new Response(req.method === 'HEAD' ? null : buildIcs(shifts), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="turni-modreport.ics"',
      'Cache-Control': 'private, max-age=900',
      'X-Robots-Tag': 'noindex',
    },
  });
});
