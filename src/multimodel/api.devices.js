const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  )
}

async function registerDevice(req, res) {
  try {
    const { userId, deviceToken, platform, appVersion } = req.body
    
    if (!userId || !deviceToken || !platform) {
      return res.status(400).json({ 
        error: 'userId, deviceToken, and platform are required' 
      })
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ 
        error: 'platform must be one of: ios, android, web' 
      })
    }

    const supa = getSupabaseClient()
    // Upsert device (update if exists, insert if not)
    const { data, error } = await supa
      .from('devices')
      .upsert([{
        user_id: userId,
        device_token: deviceToken,
        platform: platform,
        app_version: appVersion || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id,device_token',
        ignoreDuplicates: false
      })

    if (error) throw error

    res.json({ ok: true, message: 'Device registered successfully', data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function unregisterDevice(req, res) {
  try {
    const { userId, deviceToken } = req.body
    
    if (!userId || !deviceToken) {
      return res.status(400).json({ 
        error: 'userId and deviceToken are required' 
      })
    }

    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('devices')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .match({ user_id: userId, device_token: deviceToken })

    if (error) throw error

    res.json({ ok: true, message: 'Device unregistered successfully', data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function getUserDevices(req, res) {
  try {
    const { userId } = req.params
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) throw error

    res.json({ ok: true, devices: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

module.exports = { registerDevice, unregisterDevice, getUserDevices }