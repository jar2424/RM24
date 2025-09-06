const twilio = require('twilio');
const chrono = require('chrono-node');
const { createClient } = require('@supabase/supabase-js');

// Twilio Client initialisieren
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
    // User erstellen oder finden
    const user = await getOrCreateUser(from);
    console.log('👤 User:', user);

    const messageText = body.toLowerCase().trim();
    let response = '';

    // Reminder-Erkennung
    if (messageText.includes('erinnere') || messageText.includes('erinnerung') || messageText.includes('remind')) {
      response = await handleReminder(user, body);
    }
    // Listen-Erkennung
    else if (messageText.includes('liste') || messageText.includes('hinzufügen') || messageText.includes('füge')) {
      response = await handleList(user, body);
    }
    // Hilfe
    else if (messageText.includes('hilfe') || messageText.includes('help')) {
      response = getHelpMessage();
    }
    // Standard-Antwort
    else {
      response = `🤖 Hallo! Du kannst mir sagen:\n\n• "Erinnere mich in 5 Minuten an Müll rausbringen"\n• "Füge Milch zur Einkaufsliste hinzu"\n• "Zeige mir meine Einkaufsliste"\n• "Hilfe" für mehr Befehle`;
    }

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

async function getOrCreateUser(phone) {
  try {
    // Prüfe ob User existiert
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Erstelle neuen User
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ phone }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      throw insertError;
    }

    return newUser;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
}

async function handleReminder(user, messageText) {
  try {
    // Datum/Zeit mit Chrono parsen
    const parsed = chrono.parse(messageText);
    
    if (parsed.length === 0) {
      return '❓ Ich konnte keine Zeitangabe erkennen. Versuche: "Erinnere mich in 5 Minuten an..." oder "Erinnere mich morgen um 8 Uhr an..."';
    }

    const dueDate = parsed[0].start.date();
    const reminderText = messageText.replace(parsed[0].text, '').trim();
    
    if (!reminderText) {
      return '❓ Was soll ich dich erinnern? Versuche: "Erinnere mich in 5 Minuten an Müll rausbringen"';
    }

    // Wiederholung erkennen
    let recurrence = null;
    if (messageText.includes('täglich') || messageText.includes('jeden tag')) {
      recurrence = 'DAILY';
    } else if (messageText.includes('wöchentlich') || messageText.includes('jeden woche')) {
      recurrence = 'WEEKLY';
    }

    // Reminder in DB speichern
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert([{
        user_id: user.id,
        text: reminderText,
        due_at: dueDate.toISOString(),
        recurrence
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return '❌ Fehler beim Speichern der Erinnerung.';
    }
    
    const dateStr = dueDate.toLocaleString('de-DE', { 
      dateStyle: 'short', 
      timeStyle: 'short',
      timeZone: 'Europe/Berlin'
    });

    let response = `✅ Erinnerung gespeichert!\n\n📝 "${reminderText}"\n⏰ ${dateStr}`;
    
    if (recurrence) {
      response += `\n🔄 Wiederholung: ${recurrence}`;
    }

    return response;

  } catch (error) {
    console.error('❌ Error handling reminder:', error);
    return '❌ Fehler beim Erstellen der Erinnerung. Bitte versuche es nochmal.';
  }
}

async function handleList(user, messageText) {
  try {
    // Liste erstellen
    if (messageText.includes('erstell') || messageText.includes('neue liste')) {
      const listName = extractListName(messageText) || 'Notizen';
      const list = await getOrCreateList(user.id, listName);
      return `✅ Liste "${listName}" wurde erstellt!`;
    }

    // Item hinzufügen
    if (messageText.includes('hinzufügen') || messageText.includes('füge')) {
      const { listName, item } = extractListItem(messageText);
      if (!item) {
        return '❓ Was soll ich zur Liste hinzufügen?';
      }
      
      const list = await getOrCreateList(user.id, listName);
      await addListItem(list.id, item);
      return `✅ "${item}" wurde zur Liste "${listName}" hinzugefügt!`;
    }

    // Liste anzeigen
    if (messageText.includes('zeig') || messageText.includes('was ist')) {
      const listName = extractListName(messageText) || 'Notizen';
      const list = await getOrCreateList(user.id, listName);
      const items = await getListItems(list.id);
      
      if (items.length === 0) {
        return `📋 Liste "${listName}" ist leer.`;
      }
      
      const itemList = items.map((item, index) => `${index + 1}. ${item.content}`).join('\n');
      return `📋 Liste "${listName}":\n${itemList}`;
    }

    return '❓ Ich verstehe nicht. Versuche: "Füge Milch zur Einkaufsliste hinzu" oder "Zeige mir meine Einkaufsliste"';

  } catch (error) {
    console.error('❌ Error handling list:', error);
    return '❌ Fehler bei der Listenverwaltung. Bitte versuche es nochmal.';
  }
}

async function getOrCreateList(userId, listName) {
  try {
    // Prüfe ob Liste existiert
    const { data: existingList, error: selectError } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', userId)
      .eq('name', listName)
      .single();

    if (existingList) {
      return existingList;
    }

    // Erstelle neue Liste
    const { data: newList, error: insertError } = await supabase
      .from('lists')
      .insert([{ user_id: userId, name: listName }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating list:', insertError);
      throw insertError;
    }

    return newList;
  } catch (error) {
    console.error('Error in getOrCreateList:', error);
    throw error;
  }
}

async function addListItem(listId, content) {
  try {
    const { data, error } = await supabase
      .from('list_items')
      .insert([{ list_id: listId, content }])
      .select()
      .single();

    if (error) {
      console.error('Error adding list item:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addListItem:', error);
    throw error;
  }
}

async function getListItems(listId) {
  try {
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting list items:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getListItems:', error);
    throw error;
  }
}

function extractListName(messageText) {
  const match = messageText.match(/liste\s+([a-zäöüß]+)/i);
  return match ? match[1] : null;
}

function extractListItem(messageText) {
  const addMatch = messageText.match(/f[uü]ge\s+(.+?)\s+(?:zur|in)\s+([a-zäöüß]+)liste/i);
  if (addMatch) {
    return { item: addMatch[1].trim(), listName: addMatch[2] };
  }
  
  const simpleMatch = messageText.match(/f[uü]ge\s+(.+?)\s+hinzu/i);
  if (simpleMatch) {
    return { item: simpleMatch[1].trim(), listName: 'Notizen' };
  }
  
  return { item: null, listName: 'Notizen' };
}

function getHelpMessage() {
  return `🤖 **WhatsApp Reminder Bot - Hilfe**

**Erinnerungen:**
• "Erinnere mich in 5 Minuten an Müll rausbringen"
• "Erinnere mich morgen um 8 Uhr an Meeting"
• "Erinnere mich täglich um 7 Uhr an Sport"

**Listen:**
• "Erstelle eine Einkaufsliste"
• "Füge Milch zur Einkaufsliste hinzu"
• "Zeige mir meine Einkaufsliste"

**Wiederholungen:**
• täglich, wöchentlich, monatlich`;
}


