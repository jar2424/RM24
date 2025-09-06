const twilio = require('twilio');

// Twilio Client initialisieren
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  // Nur POST-Requests erlauben
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Daten aus dem Twilio Webhook extrahieren
    const { From, Body, NumMedia } = req.body;
    
    console.log('📱 Incoming WhatsApp message:');
    console.log('From:', From);
    console.log('Body:', Body);
    console.log('Media count:', NumMedia);

    // Sofort antworten (Twilio erwartet schnelle Antwort)
    res.status(200).send('OK');

    // Twilio-Antwort senden
    try {
      const response = `🤖 Hallo! Du hast geschrieben: "${Body}"\n\nIch bin dein WhatsApp-Reminder-Bot!`;
      
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: From,
        body: response
      });
      
      console.log('✅ Twilio response sent successfully');
    } catch (twilioError) {
      console.error('❌ Twilio error:', twilioError);
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

