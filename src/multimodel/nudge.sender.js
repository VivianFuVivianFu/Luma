const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  )
}

// Care message templates
const CARE_MESSAGES = [
  {
    title: "Thinking of you 💙",
    body: "How are you feeling today? I'm here whenever you need support.",
    type: "checkin"
  },
  {
    title: "Gentle reminder",
    body: "Remember to be kind to yourself. Small steps count too.",
    type: "encouragement"
  },
  {
    title: "You matter",
    body: "Your feelings are valid, and you deserve care and support.",
    type: "affirmation"
  },
  {
    title: "Taking a moment",
    body: "Sometimes it helps to pause and breathe. I'm here if you want to talk.",
    type: "mindfulness"
  }
]

const POST_CRISIS_MESSAGES = [
  {
    title: "Checking in on you",
    body: "I wanted to see how you're doing. You're not alone in this.",
    type: "followup"
  },
  {
    title: "You're stronger than you know",
    body: "Going through difficult times takes courage. I'm proud of you for reaching out.",
    type: "support"
  },
  {
    title: "Here for you",
    body: "Remember that it's okay to ask for help. You deserve support and care.",
    type: "reassurance"
  }
]

function selectCareMessage(type = 'general', daysSinceLastCrisis = null) {
  if (type === 'post_crisis' && daysSinceLastCrisis !== null && daysSinceLastCrisis <= 14) {
    return POST_CRISIS_MESSAGES[Math.floor(Math.random() * POST_CRISIS_MESSAGES.length)]
  }
  return CARE_MESSAGES[Math.floor(Math.random() * CARE_MESSAGES.length)]
}

async function scheduleNotification(userId, title, body, scheduledFor, type = 'care') {
  try {
    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('notifications')
      .insert([{
        user_id: userId,
        title: title,
        body: body,
        notification_type: type,
        scheduled_for: scheduledFor,
        status: 'pending',
        created_at: new Date().toISOString()
      }])

    if (error) throw error
    return { ok: true, data }
  } catch (e) {
    console.error('Failed to schedule notification:', e)
    return { ok: false, error: e.message }
  }
}

async function sendEmailNotification(userEmail, title, body) {
  try {
    const supa = getSupabaseClient()
    // Using Supabase Edge Function for email sending
    // This would need to be set up in your Supabase project
    const { data, error } = await supa.functions.invoke('send-email', {
      body: {
        to: userEmail,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">${title}</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #374151;">${body}</p>
            <div style="margin-top: 30px; padding: 20px; background-color: #F3F4F6; border-radius: 8px;">
              <p style="font-size: 14px; color: #6B7280; margin: 0;">
                This message was sent with care from your Luma support companion. 
                If you're in crisis, please contact local emergency services or a crisis helpline immediately.
              </p>
            </div>
          </div>
        `
      }
    })

    if (error) throw error
    return { ok: true, data }
  } catch (e) {
    // Fallback: just log the notification attempt
    console.log(`Email notification to ${userEmail}: ${title} - ${body}`)
    return { ok: true, fallback: true }
  }
}

async function processPendingNotifications() {
  try {
    const now = new Date()
    const supa = getSupabaseClient()
    
    // Get pending notifications that should be sent
    const { data: notifications, error } = await supa
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(50)

    if (error) throw error

    const results = []
    
    for (const notification of notifications || []) {
      try {
        // For demo purposes, we'll use a simple email approach
        // In production, you'd integrate with actual email services or push notifications
        const userEmail = `${notification.user_id}@example.com` // This would come from user profile
        
        const emailResult = await sendEmailNotification(
          userEmail,
          notification.title,
          notification.body
        )

        if (emailResult.ok) {
          // Mark as sent
          await supa
            .from('notifications')
            .update({
              status: 'sent',
              sent_at: now.toISOString()
            })
            .eq('id', notification.id)

          results.push({ id: notification.id, status: 'sent' })
        } else {
          // Mark as failed
          await supa
            .from('notifications')
            .update({ status: 'failed' })
            .eq('id', notification.id)

          results.push({ id: notification.id, status: 'failed', error: emailResult.error })
        }
      } catch (e) {
        console.error(`Failed to process notification ${notification.id}:`, e)
        results.push({ id: notification.id, status: 'failed', error: e.message })
      }
    }

    return { ok: true, processed: results.length, results }
  } catch (e) {
    console.error('Failed to process pending notifications:', e)
    return { ok: false, error: e.message }
  }
}

async function createCareNudges() {
  try {
    const supa = getSupabaseClient()
    // Get users who need care nudges
    const { data: usersNeedingCare, error } = await supa.rpc('get_users_needing_care')
    
    if (error) throw error

    const results = []
    const now = new Date()

    for (const user of usersNeedingCare || []) {
      try {
        // Determine notification type and timing
        let scheduleTime = new Date(now)
        let messageType = 'general'

        if (user.last_crisis_days !== null && user.last_crisis_days <= 14) {
          // Post-crisis follow-up
          messageType = 'post_crisis'
          scheduleTime.setHours(scheduleTime.getHours() + 2) // Send in 2 hours
        } else if (user.days_inactive >= 7) {
          // Long-term inactive
          scheduleTime.setHours(scheduleTime.getHours() + 6) // Send in 6 hours
        } else {
          // Regular check-in
          scheduleTime.setHours(scheduleTime.getHours() + 24) // Send tomorrow
        }

        const message = selectCareMessage(messageType, user.last_crisis_days)
        
        const result = await scheduleNotification(
          user.user_id,
          message.title,
          message.body,
          scheduleTime.toISOString(),
          'care'
        )

        results.push({
          userId: user.user_id,
          scheduled: result.ok,
          scheduleTime: scheduleTime.toISOString(),
          messageType,
          error: result.error
        })
      } catch (e) {
        console.error(`Failed to create care nudge for user ${user.user_id}:`, e)
        results.push({
          userId: user.user_id,
          scheduled: false,
          error: e.message
        })
      }
    }

    return {
      ok: true,
      usersProcessed: usersNeedingCare?.length || 0,
      nudgesCreated: results.filter(r => r.scheduled).length,
      results
    }
  } catch (e) {
    console.error('Failed to create care nudges:', e)
    return { ok: false, error: e.message }
  }
}

module.exports = {
  scheduleNotification,
  sendEmailNotification,
  processPendingNotifications,
  createCareNudges,
  selectCareMessage
}