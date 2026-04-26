import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignName, subject, body, recipients } = req.body;

  // 1. Validate input
  if (!campaignName || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 2. Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert([
        {
          name: campaignName,
          subject,
          body,
          status: 'scheduled'
        }
      ])
      .select()
      .single();

    if (campaignError) throw campaignError;

    // 3. Parse recipients (IMPORTANT FIX)
    if (recipients && typeof recipients === 'string') {
      const recipientList = recipients
        .split(',')
        .map(email => email.trim())
        .filter(Boolean);

      if (recipientList.length > 0) {
        const recipientRows = recipientList.map(email => ({
          campaign_id: campaign.id,
          email,
          status: 'pending'
        }));

        const { error: recipientError } = await supabase
          .from('recipients')
          .insert(recipientRows);

        if (recipientError) throw recipientError;
      }
    }

    // 4. Return success + campaign id
    return res.status(200).json({
      success: true,
      campaignId: campaign.id
    });

  } catch (error) {
    console.error('CREATE CAMPAIGN ERROR:', error);

    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}