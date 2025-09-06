const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  // Nur GET erlauben (für Vercel Cron)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🕐 Cron job running...');
    
    // Einfacher Test - sende eine Test-Nachricht
    const testMessage = '🕐 Cron Job Test - ' + new Date().toLocaleString('de-DE');
    
    // Nur senden wenn MY_WHATSAPP_NUMBER gesetzt ist
    if (process.env.MY_WHATSAPP_NUMBER) {
      try {
        await client.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: process.env.MY_WHATSAPP_NUMBER,
          body: testMessage
        });
        
        console.log('✅ Test message sent');
      } catch (sendError) {
        console.error('❌ Failed to send test message:', sendError);
      }
    }

    const result = {
      message: 'Cron job completed',
      timestamp: new Date().toISOString(),
      testMessage: testMessage
    };

    console.log('📊 Cron job result:', result);
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Cron job error:', error);
    res.status(500).json({ error: 'Cron job failed', details: error.message });
  }
}
