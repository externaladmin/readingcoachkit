// Vercel Serverless Function: /api/feedback
// Handles "What's missing?" feedback submissions
// - Emails feedback to site owner via Resend
// - If email provided, adds to Beehiiv tagged as feedback subscriber

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, email } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Feedback text required' });
  }

  const RESEND_API_KEY  = process.env.RESEND_API_KEY;
  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB_ID  = process.env.BEEHIIV_PUBLICATION_ID;
  const OWNER_EMAIL     = process.env.OWNER_EMAIL || 'inform1ar@gmail.com';

  try {
    // ── 1. Email feedback to owner ───────────────────────────────────────────
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from:    'ReadingCoachKit Feedback <hello@readingcoachkit.com>',
          to:      [OWNER_EMAIL],
          subject: `New feedback: "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
              <h2 style="font-size: 18px; margin: 0 0 16px; color: #2d5a8e;">New feedback from ReadingCoachKit</h2>
              <div style="background: #f5f5f5; border-left: 4px solid #e8734a; padding: 16px; border-radius: 0 6px 6px 0; margin-bottom: 20px; font-size: 15px; line-height: 1.6; color: #1a1a2e;">
                ${text.replace(/\n/g, '<br>')}
              </div>
              ${email ? `
              <p style="font-size: 14px; color: #555; margin: 0 0 6px;"><strong>From:</strong> ${email}</p>
              <p style="font-size: 13px; color: #888; margin: 0;">This person wants to be notified when it's built.</p>
              ` : `<p style="font-size: 13px; color: #888; margin: 0;">No email provided.</p>`}
            </div>
          `,
        }),
      });
    }

    // ── 2. Add to Beehiiv if email provided ──────────────────────────────────
    if (email && email.includes('@') && BEEHIIV_API_KEY && BEEHIIV_PUB_ID) {
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
            utm_medium:          'feedback',
            utm_campaign:        'whats-missing',
          }),
        }
      );
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Feedback error:', err);
    // Return success anyway — don't show errors to the user for feedback
    return res.status(200).json({ success: true });
  }
}
