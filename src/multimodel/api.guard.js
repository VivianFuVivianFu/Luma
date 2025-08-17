const { 
  getCallStats, 
  resetRouteStats, 
  healthCheck, 
  CONFIG 
} = require('./guard.fetch');

const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );
}

// 获取API保护状态
async function getGuardStatus(req, res) {
  try {
    const { route } = req.query;
    
    const stats = getCallStats(route);
    const health = await healthCheck();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: route ? stats : stats,
      health,
      config: {
        rateLimits: CONFIG.rateLimits,
        circuitBreaker: CONFIG.circuitBreaker,
        defaultTimeoutMs: CONFIG.defaultTimeoutMs,
        retry: CONFIG.retry
      }
    });
  } catch (e) {
    console.error('Failed to get guard status:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 重置路由统计（紧急恢复）
async function resetRoute(req, res) {
  try {
    const { route } = req.params;
    
    if (!route) {
      return res.status(400).json({
        success: false,
        error: 'route parameter is required'
      });
    }
    
    resetRouteStats(route);
    
    res.json({
      success: true,
      message: `Route ${route} statistics reset successfully`,
      route,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to reset route:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 获取API可靠性统计
async function getReliabilityStats(req, res) {
  try {
    const { route, hours = 24 } = req.query;
    
    const supa = getSupabaseClient();
    const { data, error } = await supa.rpc('get_api_reliability_stats', {
      p_route: route || null,
      p_hours: parseInt(hours)
    });
    
    if (error) throw error;
    
    res.json({
      success: true,
      stats: data || [],
      period_hours: parseInt(hours),
      route_filter: route || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to get reliability stats:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 获取最近的API事件
async function getRecentIncidents(req, res) {
  try {
    const { 
      limit = 50, 
      route = null, 
      incidentType = null 
    } = req.query;
    
    const supa = getSupabaseClient();
    const { data, error } = await supa.rpc('get_recent_api_incidents', {
      p_limit: parseInt(limit),
      p_route: route,
      p_incident_type: incidentType
    });
    
    if (error) throw error;
    
    res.json({
      success: true,
      incidents: data || [],
      count: (data || []).length,
      filters: {
        limit: parseInt(limit),
        route,
        incidentType
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to get recent incidents:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 获取API健康检查概览
async function getHealthOverview(req, res) {
  try {
    const health = await healthCheck();
    const stats = getCallStats();
    
    // 计算整体健康评分
    const routes = Object.keys(health);
    const availableRoutes = routes.filter(route => health[route].available);
    const healthScore = routes.length > 0 ? (availableRoutes.length / routes.length * 100) : 100;
    
    // 获取最近事件数量
    const supa = getSupabaseClient();
    const { data: recentIncidents } = await supa
      .from('api_incidents')
      .select('id, incident_type')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 最近1小时
    
    const incidentCounts = {};
    (recentIncidents || []).forEach(incident => {
      incidentCounts[incident.incident_type] = (incidentCounts[incident.incident_type] || 0) + 1;
    });
    
    res.json({
      success: true,
      overview: {
        healthScore: Math.round(healthScore),
        totalRoutes: routes.length,
        availableRoutes: availableRoutes.length,
        unavailableRoutes: routes.length - availableRoutes.length,
        recentIncidents: {
          total: (recentIncidents || []).length,
          breakdown: incidentCounts
        }
      },
      routeHealth: health,
      routeStats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to get health overview:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 清理旧的API事件记录
async function cleanupIncidents(req, res) {
  try {
    const { daysToKeep = 30 } = req.body;
    
    const supa = getSupabaseClient();
    const { data, error } = await supa.rpc('cleanup_old_api_incidents', {
      p_days_to_keep: parseInt(daysToKeep)
    });
    
    if (error) throw error;
    
    res.json({
      success: true,
      deletedCount: data || 0,
      daysToKeep: parseInt(daysToKeep),
      message: `Cleaned up ${data || 0} old API incidents`,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to cleanup incidents:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 模拟API调用（测试用）
async function simulateCall(req, res) {
  try {
    const { route, shouldFail = false } = req.body;
    
    if (!route) {
      return res.status(400).json({
        success: false,
        error: 'route parameter is required'
      });
    }
    
    const { guardedModelCall } = require('./guard.fetch');
    
    try {
      const result = await guardedModelCall({
        route,
        model: 'test-model',
        timeoutMs: 5000,
        request: {
          url: 'https://httpbin.org/delay/1',
          method: 'GET'
        },
        onDegrade: async (failureType, error) => {
          return {
            ok: true,
            json: { 
              message: 'Degraded response',
              failureType,
              originalError: error.message
            },
            degraded: true
          };
        }
      });
      
      res.json({
        success: true,
        result: {
          degraded: result.degraded || false,
          duration: result.duration,
          attempt: result.attempt,
          data: result.json
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.json({
        success: false,
        error: error.message,
        route,
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('Failed to simulate call:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 获取配置信息
async function getGuardConfig(req, res) {
  try {
    res.json({
      success: true,
      config: CONFIG,
      timestamp: new Date().toISOString(),
      description: {
        rateLimits: 'Maximum calls per route per time window',
        circuitBreaker: 'Failure thresholds and recovery settings',
        retry: 'Retry strategy configuration',
        defaultTimeoutMs: 'Default timeout for API calls'
      }
    });
  } catch (e) {
    console.error('Failed to get guard config:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  getGuardStatus,
  resetRoute,
  getReliabilityStats,
  getRecentIncidents,
  getHealthOverview,
  cleanupIncidents,
  simulateCall,
  getGuardConfig
};