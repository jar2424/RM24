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
    const { From, Body, NumMedia, MediaUrl0, MediaContentType0 } = req.body;
    
    console.log('📱 Incoming WhatsApp message:');
    console.log('From:', From);
    console.log('Body:', Body);
    console.log('Media count:', NumMedia);

    // Sofort antworten (Twilio erwartet schnelle Antwort)
    res.status(200).send('OK');

    // Nachricht verarbeiten (asynchron)
    await processMessage(From, Body, NumMedia, MediaUrl0, MediaContentType0);

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function processMessage(from, body, numMedia, mediaUrl, mediaType) {
  try {
    let messageText = body || '';

    // Sprachnachricht verarbeiten (falls vorhanden)
    if (numMedia > 0 && mediaType && mediaType.startsWith('audio')) {
      console.log('🎤 Processing voice message...');
      // TODO: Whisper Integration später
      messageText = '[Sprachnachricht - noch nicht implementiert]';
    }

    // Einfache Echo-Antwort für den Start
    const response = `🤖 Hallo! Du hast geschrieben: "${messageText}"\n\nIch bin dein WhatsApp-Reminder-Bot. Bald kann ich dir helfen, Erinnerungen zu setzen!`;

    // Antwort senden
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: response
    });

    console.log('✅ Response sent successfully');

  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}
