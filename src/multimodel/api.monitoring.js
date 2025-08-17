const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  )
}

// Collect current capacity metrics
async function collectCapacityMetrics(req, res) {
  try {
    const supa = getSupabaseClient()
    const { data, error } = await supa.rpc('luma_collect_capacity')
    
    if (error) throw error
    
    res.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to collect capacity metrics:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Get current capacity status
async function getCapacityStatus(req, res) {
  try {
    const supa = getSupabaseClient()
    const { data, error } = await supa.rpc('luma_capacity_status')
    
    if (error) throw error
    
    const status = data && data.length > 0 ? data[0] : null
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'No capacity data available. Run capacity collection first.',
        timestamp: new Date().toISOString()
      })
    }
    
    res.json({ 
      success: true, 
      capacity: {
        collected_at: status.collected_at,
        total_bytes: status.total_bytes,
        used_gb: status.used_gb,
        quota_gb: status.quota_gb,
        used_pct: status.used_pct,
        warn_pct: status.warn_pct,
        is_warning: status.is_warning,
        breakdown: status.breakdown,
        row_counts: status.row_counts
      },
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to get capacity status:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Log API performance metrics
async function logPerformanceMetrics(req, res) {
  try {
    const {
      endpoint,
      response_time_ms,
      success_rate,
      error_count = 0,
      request_count = 1,
      avg_tokens,
      model_used,
      route_type
    } = req.body
    
    if (!endpoint || !response_time_ms) {
      return res.status(400).json({
        success: false,
        error: 'endpoint and response_time_ms are required'
      })
    }
    
    const supa = getSupabaseClient()
    const { data, error } = await supa.rpc('log_api_performance', {
      p_endpoint: endpoint,
      p_response_time_ms: response_time_ms,
      p_success_rate: success_rate,
      p_error_count: error_count,
      p_request_count: request_count,
      p_avg_tokens: avg_tokens,
      p_model_used: model_used,
      p_route_type: route_type
    })
    
    if (error) throw error
    
    res.json({ 
      success: true, 
      logged: true,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to log performance:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Get system health summary
async function getSystemHealth(req, res) {
  try {
    const supa = getSupabaseClient()
    const { data, error } = await supa.rpc('system_health_summary')
    
    if (error) throw error
    
    res.json({ 
      success: true, 
      health: data,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to get system health:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Check capacity and create alerts
async function checkCapacityAlerts(req, res) {
  try {
    const supa = getSupabaseClient()
    const { data, error } = await supa.rpc('check_capacity_alerts')
    
    if (error) throw error
    
    res.json({ 
      success: true, 
      alert_check: data,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to check capacity alerts:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Get recent alerts
async function getRecentAlerts(req, res) {
  try {
    const { limit = 20, severity, alert_type, active_only } = req.query
    
    const supa = getSupabaseClient()
    let query = supa
      .from('monitoring_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
    
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    if (alert_type) {
      query = query.eq('alert_type', alert_type)
    }
    
    if (active_only === 'true') {
      query = query.is('resolved_at', null)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    res.json({ 
      success: true, 
      alerts: data || [],
      count: (data || []).length,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to get alerts:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Resolve alert
async function resolveAlert(req, res) {
  try {
    const { alertId } = req.params
    
    if (!alertId) {
      return res.status(400).json({
        success: false,
        error: 'alertId parameter is required'
      })
    }
    
    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('monitoring_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', alertId)
      .select()
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      })
    }
    
    res.json({ 
      success: true, 
      resolved: true,
      alert: data[0],
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to resolve alert:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Get capacity trends
async function getCapacityTrends(req, res) {
  try {
    const { days = 7 } = req.query
    
    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('capacity_reports')
      .select(`
        collected_at,
        total_db_bytes,
        messages_bytes,
        summaries_bytes,
        longmem_bytes
      `)
      .gte('collected_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('collected_at', { ascending: true })
    
    if (error) throw error
    
    const trends = (data || []).map(row => ({
      timestamp: row.collected_at,
      total_gb: Math.round(row.total_db_bytes / 1024 / 1024 / 1024 * 1000) / 1000,
      breakdown: {
        messages_mb: Math.round(row.messages_bytes / 1024 / 1024 * 100) / 100,
        summaries_mb: Math.round(row.summaries_bytes / 1024 / 1024 * 100) / 100,
        longmem_mb: Math.round(row.longmem_bytes / 1024 / 1024 * 100) / 100
      }
    }))
    
    res.json({ 
      success: true, 
      trends,
      period_days: parseInt(days),
      data_points: trends.length,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to get capacity trends:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Get performance trends
async function getPerformanceTrends(req, res) {
  try {
    const { days = 7, endpoint } = req.query
    
    const supa = getSupabaseClient()
    let query = supa
      .from('system_performance_logs')
      .select('*')
      .gte('logged_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: true })
    
    if (endpoint) {
      query = query.eq('api_endpoint', endpoint)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Group by hour and endpoint
    const grouped = {}
    ;(data || []).forEach(row => {
      const hourKey = new Date(row.logged_at).toISOString().slice(0, 13) + ':00:00.000Z'
      const key = `${hourKey}|${row.api_endpoint}`
      
      if (!grouped[key]) {
        grouped[key] = {
          timestamp: hourKey,
          endpoint: row.api_endpoint,
          response_times: [],
          success_rates: [],
          error_counts: 0,
          request_counts: 0
        }
      }
      
      grouped[key].response_times.push(row.response_time_ms)
      if (row.success_rate !== null) grouped[key].success_rates.push(row.success_rate)
      grouped[key].error_counts += row.error_count
      grouped[key].request_counts += row.request_count
    })
    
    const trends = Object.values(grouped).map(group => ({
      timestamp: group.timestamp,
      endpoint: group.endpoint,
      avg_response_time: Math.round(group.response_times.reduce((a, b) => a + b, 0) / group.response_times.length),
      avg_success_rate: group.success_rates.length > 0 
        ? Math.round(group.success_rates.reduce((a, b) => a + b, 0) / group.success_rates.length * 100) / 100 
        : null,
      total_errors: group.error_counts,
      total_requests: group.request_counts
    }))
    
    res.json({ 
      success: true, 
      trends,
      period_days: parseInt(days),
      endpoint_filter: endpoint || 'all',
      data_points: trends.length,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to get performance trends:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Update monitoring settings
async function updateSettings(req, res) {
  try {
    const { key, value, description } = req.body
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'key and value are required'
      })
    }
    
    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('luma_settings')
      .upsert({
        key,
        value: String(value),
        description,
        category: 'monitoring',
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (error) throw error
    
    res.json({ 
      success: true, 
      setting: data[0],
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to update setting:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Get monitoring settings
async function getSettings(req, res) {
  try {
    const supa = getSupabaseClient()
    const { data, error } = await supa
      .from('luma_settings')
      .select('*')
      .eq('category', 'monitoring')
      .order('key')
    
    if (error) throw error
    
    const settings = {}
    ;(data || []).forEach(setting => {
      settings[setting.key] = {
        value: setting.value,
        description: setting.description,
        updated_at: setting.updated_at
      }
    })
    
    res.json({ 
      success: true, 
      settings,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('Failed to get settings:', e)
    res.status(500).json({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = {
  collectCapacityMetrics,
  getCapacityStatus,
  logPerformanceMetrics,
  getSystemHealth,
  checkCapacityAlerts,
  getRecentAlerts,
  resolveAlert,
  getCapacityTrends,
  getPerformanceTrends,
  updateSettings,
  getSettings
}