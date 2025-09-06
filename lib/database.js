import { supabase } from './supabase.js';

// User Management
export async function getOrCreateUser(phone, name = null) {
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
      .insert([{ phone, name }])
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

// Reminder Management
export async function createReminder(userId, text, dueAt, recurrence = null) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert([{
        user_id: userId,
        text,
        due_at: dueAt,
        recurrence
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createReminder:', error);
    throw error;
  }
}

export async function getDueReminders() {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        users!inner(phone, name)
      `)
      .eq('active', true)
      .lte('due_at', now);

    if (error) {
      console.error('Error getting due reminders:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDueReminders:', error);
    throw error;
  }
}

export async function markReminderSent(reminderId) {
  try {
    const { error } = await supabase
      .from('reminders')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', reminderId);

    if (error) {
      console.error('Error marking reminder sent:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markReminderSent:', error);
    throw error;
  }
}

// List Management
export async function getOrCreateList(userId, listName) {
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

export async function addListItem(listId, content) {
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

export async function getListItems(listId) {
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
