import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
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
      const recipients = campaign.recipients.split(',');

      for (const email of recipients) {
        await transporter.sendMail({
          from: process.env.GMAIL_EMAIL,
          to: email.trim(),
          subject: campaign.subject,
          html: campaign.body,
        });
      }

      await supabase
        .from('campaigns')
        .update({ status: 'sent' })
        .eq('id', campaign.id);
    }

    res.status(200).json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}