// Vercel Serverless Function: /api/waitlist
// Handles signup page + sign-in notify email captures
// - Adds subscriber to Beehiiv tagged by source (signup-waitlist or signin-waitlist)
// - Sends appropriate confirmation email via Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, source } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const RESEND_API_KEY  = process.env.RESEND_API_KEY;
  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID  = process.env.BEEHIIV_PUBLICATION_ID;

  try {
    // ── 1. Add to Beehiiv ────────────────────────────────────────────────────
    if (BEEHIIV_API_KEY && BEEHIIV_PUB_ID) {
      await fetch(
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
            utm_medium:          'waitlist',
            utm_campaign:        source || 'signup-waitlist',
          }),
        }
      );
    }

    // ── 2. Send confirmation email ───────────────────────────────────────────
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from:    'ReadingCoachKit <hello@readingcoachkit.com>',
          to:      [email],
          subject: 'You\'re on the list — ReadingCoachKit accounts are coming',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a2e;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 24px;">📖</span>
                <span style="font-size: 18px; font-weight: 700; color: #2d5a8e; margin-left: 8px;">ReadingCoachKit</span>
              </div>

              <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px;">You're on the list.</h1>

              <p style="color: #555; line-height: 1.6; margin: 0 0 20px;">
                We're building accounts that let you save student data between sessions, access unlimited exports, and track progress across all tools. You'll be among the first to get access when it's ready.
              </p>

              <div style="background: #f0f7ff; border-left: 4px solid #2d5a8e; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #2d5a8e; font-weight: 600;">In the meantime — all tools are free to use</p>
                <p style="margin: 6px 0 0; font-size: 13px; color: #555; line-height: 1.5;">
                  Head to <a href="https://readingcoachkit.com" style="color: #2d5a8e;">readingcoachkit.com</a> to track fluency, plan groups, and export progress reports — no account needed yet.
                </p>
              </div>

              <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
                We'll also send you occasional free resources for reading coaches — research roundups, tool updates, and Science of Reading news. Always practical, never spammy. Unsubscribe anytime.
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
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(200).json({ success: true }); // non-fatal
  }
}
