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

    // Einfache Echo-Antwort (erstmal ohne Twilio)
    console.log('✅ Webhook received successfully');

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

