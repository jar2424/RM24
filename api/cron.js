import { getDueReminders, markReminderSent } from '../lib/database.js';
import twilio from 'twilio';

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
    console.log('🕐 Checking for due reminders...');
    
    const dueReminders = await getDueReminders();
    
    if (dueReminders.length === 0) {
      console.log('✅ No due reminders found');
      return res.status(200).json({ message: 'No due reminders', count: 0 });
    }

    console.log(`📋 Found ${dueReminders.length} due reminders`);

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of dueReminders) {
      try {
        const response = `⏰ Erinnerung: ${reminder.text}`;
        
        await client.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: reminder.users.phone,
          body: response
        });

        await markReminderSent(reminder.id);
        sentCount++;
        
        console.log(`✅ Sent reminder to ${reminder.users.phone}: ${reminder.text}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to send reminder ${reminder.id}:`, error);
      }
    }

    const result = {
      message: 'Cron job completed',
      total: dueReminders.length,
      sent: sentCount,
      errors: errorCount
    };

    console.log('📊 Cron job result:', result);
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Cron job error:', error);
    res.status(500).json({ error: 'Cron job failed', details: error.message });
  }
}
