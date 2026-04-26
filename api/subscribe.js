// Vercel Serverless Function: /api/subscribe
// Handles email capture for ReadingCoachKit PDF export gate
// - Adds subscriber to Beehiiv (v2 API) with state tag
// - Sends confirmation email via Resend

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, state } = req.body;

  // Basic validation
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const RESEND_API_KEY  = process.env.RESEND_API_KEY;
  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID  = process.env.BEEHIIV_PUBLICATION_ID;

  if (!RESEND_API_KEY || !BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    console.error('Missing environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // ── 1. Add subscriber to Beehiiv v2 ─────────────────────────────────────
    const beehiivRes = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email:  false,
          utm_source:          'readingcoachkit',
          utm_medium:          'tool',
          utm_campaign:        'fluency-tracker',
          custom_fields: state
            ? [{ name: 'state', value: state }]
            : [],
        }),
      }
    );

    if (!beehiivRes.ok) {
      const errBody = await beehiivRes.text();
      console.error('Beehiiv error:', beehiivRes.status, errBody);
      // Non-fatal — continue to send email
    }

    // ── 2. Send confirmation via Resend ──────────────────────────────────────
    // NOTE: Using Resend's shared "onboarding" sender until readingcoachkit.com
    // domain is verified in Resend. Swap to hello@readingcoachkit.com after verification.
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    'ReadingCoachKit <hello@readingcoachkit.com>',
        to:      [email],
        subject: 'Your Fluency Tracker Results',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a2e;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 24px;">📖</span>
              <span style="font-size: 18px; font-weight: 700; color: #2d5a8e; margin-left: 8px;">ReadingCoachKit</span>
            </div>

            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px;">Your fluency tracker is ready to print.</h1>

            <p style="color: #555; line-height: 1.6; margin: 0 0 20px;">
              Head back to the tab you had open — your results are waiting. Use your browser's <strong>Print</strong> function (Ctrl/Cmd + P) to save as PDF or send to your printer.
            </p>

            <div style="background: #f0f7ff; border-left: 4px solid #2d5a8e; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #2d5a8e; font-weight: 600;">🔒 Your student data is private</p>
              <p style="margin: 6px 0 0; font-size: 13px; color: #555; line-height: 1.5;">
                No scores, names, or student information were sent to us. Everything stayed on your device.
              </p>
            </div>

            <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
              We'll occasionally send you free reading intervention resources, tools, and research roundups — always practical, never spammy. You can unsubscribe anytime.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="font-size: 12px; color: #999; margin: 0;">
              ReadingCoachKit · Free tools for reading intervention coaches<br>
              <a href="https://readingcoachkit.com" style="color: #2d5a8e;">readingcoachkit.com</a>
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('Resend error:', resendRes.status, errBody);
      return res.status(500).json({ error: 'Failed to send confirmation email' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
