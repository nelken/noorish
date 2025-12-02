// api/subscribe.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey // server-only
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const payload =
    typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
  const { email, phone, first_name, last_name } = payload;

  // basic validation
  if (!email) return res.status(400).json({ error: 'email required' })

  const { error } = await supabase
    .from('contacts')
    .insert({ email, phone, first_name, last_name })

  if (error) {
    console.error(error)
    return res.status(500).json({ error: 'db error' })
  }

  res.status(200).json({ ok: true })
}
