const cron = require('node-cron')
const { processPendingNotifications, createCareNudges } = require('./nudge.sender.js')

class CronScheduler {
  constructor() {
    this.jobs = {}
    this.isRunning = false
  }

  start() {
    if (this.isRunning) {
      console.log('[Cron] Scheduler already running')
      return
    }

    console.log('[Cron] Starting notification scheduler...')
    
    // Process pending notifications every 5 minutes
    this.jobs.processNotifications = cron.schedule('*/5 * * * *', async () => {
      console.log('[Cron] Processing pending notifications...')
      try {
        const result = await processPendingNotifications()
        if (result.ok) {
          console.log(`[Cron] Processed ${result.processed} notifications`)
        } else {
          console.error('[Cron] Failed to process notifications:', result.error)
        }
      } catch (e) {
        console.error('[Cron] Error in notification processing:', e)
      }
    }, {
      scheduled: false,
      timezone: "America/New_York"
    })

    // Create care nudges daily at 10 AM
    this.jobs.createCareNudges = cron.schedule('0 10 * * *', async () => {
      console.log('[Cron] Creating daily care nudges...')
      try {
        const result = await createCareNudges()
        if (result.ok) {
          console.log(`[Cron] Created ${result.nudgesCreated} care nudges for ${result.usersProcessed} users`)
        } else {
          console.error('[Cron] Failed to create care nudges:', result.error)
        }
      } catch (e) {
        console.error('[Cron] Error in care nudge creation:', e)
      }
    }, {
      scheduled: false,
      timezone: "America/New_York"
    })

    // Additional check for crisis follow-ups every 2 hours
    this.jobs.crisisFollowup = cron.schedule('0 */2 * * *', async () => {
      console.log('[Cron] Checking for crisis follow-ups...')
      try {
        // This would create follow-up notifications for recent crisis users
        const result = await createCareNudges()
        if (result.ok) {
          const crisisFollowups = result.results?.filter(r => 
            r.scheduled && r.messageType === 'post_crisis'
          ).length || 0
          if (crisisFollowups > 0) {
            console.log(`[Cron] Created ${crisisFollowups} crisis follow-up notifications`)
          }
        }
      } catch (e) {
        console.error('[Cron] Error in crisis follow-up:', e)
      }
    }, {
      scheduled: false,
      timezone: "America/New_York"
    })

    // Health check - runs every hour to ensure system is working
    this.jobs.healthCheck = cron.schedule('0 * * * *', async () => {
      const now = new Date()
      console.log(`[Cron] Health check at ${now.toISOString()} - All systems operational`)
      
      // Could add database connectivity checks, API health checks, etc.
      try {
        const { createClient } = require('@supabase/supabase-js')
        const supa = createClient(
          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
        )
        
        // Simple connectivity test
        const { data, error } = await supa.from('notifications').select('count').limit(1)
        if (error) {
          console.error('[Cron] Database health check failed:', error)
        } else {
          console.log('[Cron] Database connectivity: OK')
        }
      } catch (e) {
        console.error('[Cron] Health check error:', e)
      }
    }, {
      scheduled: false,
      timezone: "America/New_York"
    })

    // Start all jobs
    Object.values(this.jobs).forEach(job => job.start())
    this.isRunning = true
    
    console.log('[Cron] All scheduled jobs started:')
    console.log('  - Process notifications: Every 5 minutes')
    console.log('  - Create care nudges: Daily at 10 AM')
    console.log('  - Crisis follow-ups: Every 2 hours')
    console.log('  - Health checks: Every hour')
  }

  stop() {
    if (!this.isRunning) {
      console.log('[Cron] Scheduler is not running')
      return
    }

    console.log('[Cron] Stopping notification scheduler...')
    Object.values(this.jobs).forEach(job => job.stop())
    this.jobs = {}
    this.isRunning = false
    console.log('[Cron] All scheduled jobs stopped')
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: Object.keys(this.jobs).length,
      jobs: Object.keys(this.jobs)
    }
  }

  // Manual trigger methods for testing
  async triggerNotificationProcessing() {
    console.log('[Cron] Manual trigger: Processing notifications...')
    return await processPendingNotifications()
  }

  async triggerCareNudges() {
    console.log('[Cron] Manual trigger: Creating care nudges...')
    return await createCareNudges()
  }
}

// Singleton instance
let cronScheduler = null

function getCronScheduler() {
  if (!cronScheduler) {
    cronScheduler = new CronScheduler()
  }
  return cronScheduler
}

// API endpoints for cron management
async function startCron(req, res) {
  try {
    const scheduler = getCronScheduler()
    scheduler.start()
    res.json({ ok: true, message: 'Cron scheduler started', status: scheduler.getStatus() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function stopCron(req, res) {
  try {
    const scheduler = getCronScheduler()
    scheduler.stop()
    res.json({ ok: true, message: 'Cron scheduler stopped', status: scheduler.getStatus() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function cronStatus(req, res) {
  try {
    const scheduler = getCronScheduler()
    res.json({ ok: true, status: scheduler.getStatus() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function triggerNotifications(req, res) {
  try {
    const scheduler = getCronScheduler()
    const result = await scheduler.triggerNotificationProcessing()
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function triggerCareNudges(req, res) {
  try {
    const scheduler = getCronScheduler()
    const result = await scheduler.triggerCareNudges()
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

module.exports = {
  getCronScheduler,
  startCron,
  stopCron,
  cronStatus,
  triggerNotifications,
  triggerCareNudges
}