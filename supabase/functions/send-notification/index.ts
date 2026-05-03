import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { type, record } = await req.json()
    if (type !== 'ELECTRICITY_LEAD') return new Response('ignored', { status: 200 })

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const TO_EMAIL = Deno.env.get('NOTIFICATION_EMAIL')
    if (!RESEND_API_KEY || !TO_EMAIL) throw new Error('Missing env vars: RESEND_API_KEY and NOTIFICATION_EMAIL must be set')

    const html = `
      <h2 style="color:#05111f;font-family:Georgia,serif">New Lead — Power Done Right</h2>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
        <tr><td style="color:#666;padding-right:16px"><b>Name</b></td><td>${record.name ?? '—'}</td></tr>
        <tr><td style="color:#666"><b>Email</b></td><td><a href="mailto:${record.email}">${record.email ?? '—'}</a></td></tr>
        <tr><td style="color:#666"><b>Phone</b></td><td>${record.phone ?? '—'}</td></tr>
        <tr><td style="color:#666"><b>Business</b></td><td>${record.property_name ?? '—'}</td></tr>
        <tr><td style="color:#666"><b>ZIP</b></td><td>${record.service_zip ?? '—'}</td></tr>
        <tr><td style="color:#666"><b>Monthly bill</b></td><td>${record.monthly_bill_estimate ? '$' + record.monthly_bill_estimate + '/mo' : '—'}</td></tr>
      </table>
      <p style="margin-top:20px;font-family:Arial,sans-serif;font-size:12px;color:#999">
        Submitted via powerdoneright.com · Source: ${record.source ?? 'power-done-right'}
      </p>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'leads@powerdoneright.com',
        to: TO_EMAIL,
        subject: `New lead: ${record.name ?? 'Unknown'} — ${record.property_name ?? record.service_zip ?? 'Power Done Right'}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error ${res.status}: ${body}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('send-notification error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
