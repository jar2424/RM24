const twilio = require('twilio');
const chrono = require('chrono-node');

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

    // Nachricht verarbeiten
    await processMessage(From, Body, NumMedia);

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function processMessage(from, body, numMedia) {
  try {
    const messageText = body.toLowerCase().trim();
    let response = '';

    // Einfache Echo-Antwort erstmal
    response = `🤖 Hallo! Du hast geschrieben: "${body}"\n\nIch bin dein WhatsApp-Reminder-Bot!`;

    // Antwort senden
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: response
    });
    
    console.log('✅ Response sent:', response);

  } catch (error) {
    console.error('❌ Error processing message:', error);
    
    // Fehler-Antwort senden
    try {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: '❌ Entschuldigung, da ist etwas schiefgelaufen. Bitte versuche es nochmal.'
      });
    } catch (sendError) {
      console.error('❌ Failed to send error message:', sendError);
    }
  }
}


