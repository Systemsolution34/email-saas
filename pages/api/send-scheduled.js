import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // 1. Get campaigns that need processing
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['scheduled', 'sending']);

    if (error) throw error;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    for (const campaign of campaigns) {

      // 🔒 Try to lock if still scheduled
      if (campaign.status === 'scheduled') {
        const { data: locked } = await supabase
          .from('campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id)
          .eq('status', 'scheduled')
          .select();

        if (!locked || locked.length === 0) continue;
      }

      // 2. Get ONLY 5 unsent recipients
      const { data: recipients, error: recError } = await supabase
        .from('recipients')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .limit(5);

      if (recError) throw recError;

      // 👉 If no more recipients → mark campaign done
      if (!recipients || recipients.length === 0) {
        await supabase
          .from('campaigns')
          .update({ status: 'sent' })
          .eq('id', campaign.id);

        continue;
      }

      // 3. Send batch of 5
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
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('CRON ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
}