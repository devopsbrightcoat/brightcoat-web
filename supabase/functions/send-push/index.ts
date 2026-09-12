// ---------------------------------------------------------------------------
// BrightCoat Ops — Edge Function que envía el push nativo a Android cuando
// se crea una fila nueva en `notifications`.
//
// No se llama directo desde el cliente: la dispara un Database Webhook
// (Supabase Dashboard -> Database -> Webhooks) configurado a mano sobre
// "insert on notifications", apuntando a la URL de esta función. El
// webhook manda el payload {type, table, record, ...} automáticamente.
//
// --- Deploy (Javier, desde ops-web/, con el Supabase CLI instalado) ---
//   supabase functions deploy send-push --no-verify-jwt
//
// --- Secrets que necesita (una sola vez) ---
//   supabase secrets set \
//     FIREBASE_SERVICE_ACCOUNT_JSON='<contenido completo del JSON de la cuenta de servicio de Firebase>' \
//     SUPABASE_URL='https://<tu-proyecto>.supabase.co' \
//     SUPABASE_SERVICE_ROLE_KEY='<service role key — Dashboard -> Settings -> API>' \
//     PUSH_WEBHOOK_SECRET='<una cadena random que vos inventes>'
//
// --- Configurar el Database Webhook (Dashboard -> Database -> Webhooks) ---
//   Tabla: notifications | Evento: Insert | Tipo: HTTP Request
//   URL: la que te da `supabase functions deploy` al terminar
//   Header extra: x-webhook-secret: <el mismo PUSH_WEBHOOK_SECRET de arriba>
//
// El header x-webhook-secret es lo que verifica esta función abajo, para
// que nadie pueda mandar pushes falsos aunque adivine la URL
// (--no-verify-jwt hace falta porque el webhook no manda un JWT de
// usuario real).
// ---------------------------------------------------------------------------

import { cert, getApps, initializeApp } from 'npm:firebase-admin@12/app'
import { getMessaging } from 'npm:firebase-admin@12/messaging'
import { createClient } from 'npm:@supabase/supabase-js@2'

const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET')

if (serviceAccountJson && !getApps().length) {
  initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) })
}

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

type NotificationRecord = {
  id: string
  recipient_id: string
  message: string
  entity_type: string | null
  entity_id: string | null
}

Deno.serve(async (req) => {
  if (webhookSecret && req.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('unauthorized', { status: 401 })
  }
  if (!supabase || !serviceAccountJson) {
    console.error(
      'send-push: faltan variables de entorno (FIREBASE_SERVICE_ACCOUNT_JSON / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    )
    return new Response('missing config', { status: 500 })
  }

  const payload = await req.json().catch(() => null)
  const notification = payload?.record as NotificationRecord | undefined
  if (!notification) return new Response('ok — sin record')

  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('profile_id', notification.recipient_id)

  if (error) {
    console.error('send-push: error leyendo device_tokens', error)
    return new Response('error leyendo tokens', { status: 500 })
  }
  if (!tokens || tokens.length === 0) return new Response('ok — sin tokens registrados')

  const messaging = getMessaging()

  await Promise.all(
    tokens.map(async ({ token }: { token: string }) => {
      try {
        await messaging.send({
          token,
          notification: {
            title: 'BrightCoat Ops',
            body: notification.message,
          },
          data: {
            notificationId: notification.id,
            entityType: notification.entity_type ?? '',
            entityId: notification.entity_id ?? '',
          },
          android: { priority: 'high' },
        })
      } catch (err) {
        console.error('send-push: error mandando a', token, err)
        // Token vencido/desinstalado — Firebase lo marca así; lo borramos
        // para no reintentar en vano en el próximo aviso.
        const message = String(err)
        if (message.includes('registration-token-not-registered') || message.includes('invalid-argument')) {
          await supabase.from('device_tokens').delete().eq('token', token)
        }
      }
    }),
  )

  return new Response('ok')
})
