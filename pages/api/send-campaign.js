import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ⏱ delay function (prevents spam flagging)
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ error: 'Missing campaignId' });
  }

  try {
    // 1. Get campaign
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campErr) throw campErr;

    // 2. Get recipients
    const { data: recipients, error: recErr } = await supabase
      .from('recipients')
      .select('*')
      .eq('campaign_id', campaignId);

    if (recErr) throw recErr;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        error: 'No recipients found for this campaign',
      });
    }

    // 3. Send emails (with delay + better formatting)
    for (const r of recipients) {
      try {
        await delay(2000); // ⏱ 2 seconds between emails

        const info = await transporter.sendMail({
          from: `"${process.env.SENDER_NAME}" <${process.env.GMAIL_EMAIL}>`,
          to: r.email,
          subject: campaign.subject,
          text: campaign.body.replace(/<[^>]*>?/gm, ''), // plain text fallback
          html: campaign.body,
        });

        console.log(`EMAIL SENT → ${r.email}`, info.messageId);

        // mark as sent
        await supabase
          .from('recipients')
          .update({ status: 'sent' })
          .eq('id', r.id);

      } catch (err) {
        console.error(`EMAIL FAILED → ${r.email}`, err.message);

        await supabase
          .from('recipients')
          .update({ status: 'failed' })
          .eq('id', r.id);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Email sending completed',
    });

  } catch (error) {
    console.error('SEND CAMPAIGN ERROR:', error);

    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}