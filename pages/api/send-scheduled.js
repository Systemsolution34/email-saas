import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // 1. Get scheduled campaigns
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled');

    if (error) throw error;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    for (const campaign of campaigns) {

      // 🔒 ATOMIC LOCK (only one process succeeds)
      const { data: locked, error: lockError } = await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id)
        .eq('status', 'scheduled') // 👈 critical condition
        .select();

      if (lockError) throw lockError;

      // ❌ If no rows updated → another cron already took it
      if (!locked || locked.length === 0) {
        continue;
      }

      // 2. Get recipients
      const { data: recipients, error: recError } = await supabase
        .from('recipients')
        .select('*')
        .eq('campaign_id', campaign.id);

      if (recError) throw recError;

      // 3. Send emails
      for (const r of recipients) {
        try {
          await transporter.sendMail({
            from: process.env.GMAIL_EMAIL,
            to: r.email,
            subject: campaign.subject,
            html: campaign.body,
          });

          await supabase
            .from('recipients')
            .update({ status: 'sent' })
            .eq('id', r.id);

        } catch (err) {
          await supabase
            .from('recipients')
            .update({ status: 'failed' })
            .eq('id', r.id);
        }
      }

      // 4. Mark campaign as sent
      await supabase
        .from('campaigns')
        .update({ status: 'sent' })
        .eq('id', campaign.id);
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('CRON ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
}