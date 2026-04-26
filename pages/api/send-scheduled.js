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
      // 2. Get recipients for this campaign
      const { data: recipients, error: recError } = await supabase
        .from('recipients')
        .select('*')
        .eq('campaign_id', campaign.id);

      if (recError) throw recError;

      for (const r of recipients) {
        try {
          await transporter.sendMail({
            from: process.env.GMAIL_EMAIL,
            to: r.email,
            subject: campaign.subject,
            html: campaign.body,
          });

          // update recipient status
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

      // 3. mark campaign as sent
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