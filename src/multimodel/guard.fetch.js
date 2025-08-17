// 智能API调用保护和降级系统
const { createClient } = require('@supabase/supabase-js');

// 内存中的速率限制和失败追踪
const callStats = new Map(); // route -> { calls: [], failures: [], lastSuccess: timestamp }
const rateLimits = new Map(); // route -> { resetTime: timestamp, remaining: number }
const circuitBreakers = new Map(); // route -> { isOpen: boolean, openedAt: timestamp, failures: number }

// 配置
const CONFIG = {
  // 速率限制配置
  rateLimits: {
    'triage': { maxCalls: 60, windowMs: 60000 }, // 60/min
    'reason32B': { maxCalls: 30, windowMs: 60000 }, // 30/min  
    'reason70B': { maxCalls: 15, windowMs: 60000 }, // 15/min
    'empathy': { maxCalls: 100, windowMs: 60000 } // 100/min
  },
  
  // 熔断器配置
  circuitBreaker: {
    failureThreshold: 5, // 5次失败后熔断
    recoveryTimeMs: 30000, // 30秒后尝试恢复
    halfOpenMaxCalls: 3 // 半开状态最大尝试次数
  },
  
  // 超时配置
  defaultTimeoutMs: 30000,
  
  // 重试配置
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2
  }
};

function getSupabaseClient() {
  try {
    return createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );
  } catch (e) {
    return null;
  }
}

// 记录API调用事件到数据库
async function logAPIIncident(route, model, incidentType, details = {}) {
  try {
    const supa = getSupabaseClient();
    if (!supa) return;
    
    await supa.from('api_incidents').insert({
      route,
      model,
      incident_type: incidentType, // 'failure', 'timeout', 'rate_limit', 'degradation', 'recovery'
      details: JSON.stringify(details),
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[Guard] Failed to log incident:', e.message);
  }
}

// 检查速率限制
function checkRateLimit(route) {
  const config = CONFIG.rateLimits[route];
  if (!config) return true;
  
  const now = Date.now();
  const stats = callStats.get(route) || { calls: [], failures: [], lastSuccess: 0 };
  
  // 清理窗口外的调用记录
  stats.calls = stats.calls.filter(timestamp => now - timestamp < config.windowMs);
  
  if (stats.calls.length >= config.maxCalls) {
    console.warn(`[Guard] Rate limit exceeded for ${route}: ${stats.calls.length}/${config.maxCalls}`);
    return false;
  }
  
  // 记录本次调用
  stats.calls.push(now);
  callStats.set(route, stats);
  return true;
}

// 检查熔断器状态
function checkCircuitBreaker(route) {
  const breaker = circuitBreakers.get(route);
  if (!breaker) return { canCall: true, state: 'closed' };
  
  const now = Date.now();
  const config = CONFIG.circuitBreaker;
  
  if (breaker.isOpen) {
    // 检查是否可以进入半开状态
    if (now - breaker.openedAt > config.recoveryTimeMs) {
      breaker.isOpen = false;
      breaker.halfOpenCalls = 0;
      console.log(`[Guard] Circuit breaker for ${route} entering half-open state`);
      return { canCall: true, state: 'half-open' };
    }
    return { canCall: false, state: 'open' };
  }
  
  return { canCall: true, state: breaker.halfOpenCalls !== undefined ? 'half-open' : 'closed' };
}

// 记录调用成功
function recordSuccess(route) {
  const stats = callStats.get(route) || { calls: [], failures: [], lastSuccess: 0 };
  stats.lastSuccess = Date.now();
  stats.failures = []; // 清空失败记录
  callStats.set(route, stats);
  
  // 重置熔断器
  const breaker = circuitBreakers.get(route);
  if (breaker) {
    breaker.isOpen = false;
    breaker.failures = 0;
    delete breaker.halfOpenCalls;
    console.log(`[Guard] Circuit breaker for ${route} reset to closed state`);
  }
}

// 记录调用失败
function recordFailure(route, error) {
  const stats = callStats.get(route) || { calls: [], failures: [], lastSuccess: 0 };
  const now = Date.now();
  
  stats.failures.push({ timestamp: now, error: error.message || String(error) });
  
  // 清理5分钟前的失败记录
  stats.failures = stats.failures.filter(f => now - f.timestamp < 300000);
  callStats.set(route, stats);
  
  // 更新熔断器
  let breaker = circuitBreakers.get(route) || { isOpen: false, failures: 0, openedAt: 0 };
  breaker.failures++;
  
  const config = CONFIG.circuitBreaker;
  if (breaker.failures >= config.failureThreshold) {
    breaker.isOpen = true;
    breaker.openedAt = now;
    console.warn(`[Guard] Circuit breaker for ${route} opened after ${breaker.failures} failures`);
    logAPIIncident(route, 'unknown', 'circuit_breaker_opened', { failures: breaker.failures });
  }
  
  circuitBreakers.set(route, breaker);
}

// 智能延迟（指数退避）
async function smartDelay(attempt) {
  const config = CONFIG.retry;
  const delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );
  
  // 添加抖动以避免惊群效应
  const jitter = Math.random() * 0.3 * delay;
  const finalDelay = delay + jitter;
  
  console.log(`[Guard] Waiting ${Math.round(finalDelay)}ms before retry (attempt ${attempt})`);
  await new Promise(resolve => setTimeout(resolve, finalDelay));
}

// 主要的守护调用函数
async function guardedModelCall({
  route,
  model,
  timeoutMs = CONFIG.defaultTimeoutMs,
  request,
  onDegrade = null,
  retryable = true
}) {
  const startTime = Date.now();
  
  // 1. 检查速率限制
  if (!checkRateLimit(route)) {
    await logAPIIncident(route, model, 'rate_limit', { 
      message: 'Rate limit exceeded' 
    });
    throw new Error(`Rate limit exceeded for ${route}`);
  }
  
  // 2. 检查熔断器
  const breakerCheck = checkCircuitBreaker(route);
  if (!breakerCheck.canCall) {
    await logAPIIncident(route, model, 'circuit_breaker_blocked', { 
      state: breakerCheck.state 
    });
    throw new Error(`Circuit breaker open for ${route}`);
  }
  
  // 3. 执行重试逻辑
  const maxAttempts = retryable ? CONFIG.retry.maxAttempts : 1;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Guard] ${route} call attempt ${attempt}/${maxAttempts} (model: ${model})`);
      
      // 创建带超时的 fetch 请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(request.url, {
        ...request,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // 检查HTTP状态码
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        error.status = response.status;
        error.retryable = response.status >= 500 || response.status === 429;
        throw error;
      }
      
      // 解析响应
      const data = await response.json();
      
      // 记录成功
      recordSuccess(route);
      
      const duration = Date.now() - startTime;
      console.log(`[Guard] ${route} call succeeded in ${duration}ms`);
      
      // 记录性能指标
      try {
        const { logPerformanceMetrics } = require('./api.monitoring');
        if (logPerformanceMetrics) {
          const mockReq = { body: {
            endpoint: route,
            response_time_ms: duration,
            success_rate: 100,
            request_count: 1,
            model_used: model,
            route_type: route
          }};
          const mockRes = { json: () => {}, status: () => ({ json: () => {} }) };
          logPerformanceMetrics(mockReq, mockRes).catch(() => {});
        }
      } catch (e) {
        // 静默失败
      }
      
      return {
        ok: true,
        json: data,
        status: response.status,
        headers: response.headers,
        duration,
        attempt
      };
      
    } catch (error) {
      lastError = error;
      const duration = Date.now() - startTime;
      
      console.warn(`[Guard] ${route} attempt ${attempt} failed: ${error.message}`);
      
      // 记录失败
      recordFailure(route, error);
      
      // 确定是否应该重试
      const isTimeout = error.name === 'AbortError';
      const isRetryable = retryable && (
        isTimeout || 
        error.retryable || 
        (error.status >= 500) ||
        (error.status === 429)
      );
      
      const incidentType = isTimeout ? 'timeout' : 
                          error.status === 429 ? 'rate_limit' : 
                          error.status >= 500 ? 'server_error' : 'failure';
      
      await logAPIIncident(route, model, incidentType, {
        attempt,
        duration,
        error: error.message,
        status: error.status
      });
      
      // 如果是最后一次尝试或不可重试，考虑降级
      if (attempt === maxAttempts || !isRetryable) {
        if (onDegrade && typeof onDegrade === 'function') {
          try {
            console.log(`[Guard] Attempting degradation for ${route}`);
            const degradeResult = await onDegrade(incidentType, error);
            
            if (degradeResult) {
              await logAPIIncident(route, model, 'degradation', {
                originalError: error.message,
                degradationType: incidentType
              });
              
              return {
                ...degradeResult,
                degraded: true,
                originalError: error.message,
                duration: Date.now() - startTime
              };
            }
          } catch (degradeError) {
            console.error(`[Guard] Degradation failed for ${route}:`, degradeError.message);
          }
        }
        break;
      }
      
      // 等待后重试
      if (attempt < maxAttempts) {
        await smartDelay(attempt);
      }
    }
  }
  
  // 所有尝试都失败了
  const totalDuration = Date.now() - startTime;
  await logAPIIncident(route, model, 'all_attempts_failed', {
    attempts: maxAttempts,
    totalDuration,
    lastError: lastError.message
  });
  
  throw lastError;
}

// 获取调用统计信息
function getCallStats(route = null) {
  if (route) {
    const stats = callStats.get(route);
    const breaker = circuitBreakers.get(route);
    return {
      route,
      calls: stats?.calls?.length || 0,
      failures: stats?.failures?.length || 0,
      lastSuccess: stats?.lastSuccess || 0,
      circuitBreaker: {
        isOpen: breaker?.isOpen || false,
        failures: breaker?.failures || 0,
        state: breaker?.isOpen ? 'open' : (breaker?.halfOpenCalls !== undefined ? 'half-open' : 'closed')
      }
    };
  }
  
  // 返回所有路由的统计
  const allRoutes = new Set([...callStats.keys(), ...circuitBreakers.keys()]);
  return Object.fromEntries(
    Array.from(allRoutes).map(r => [r, getCallStats(r)])
  );
}

// 重置特定路由的统计（紧急恢复用）
function resetRouteStats(route) {
  callStats.delete(route);
  circuitBreakers.delete(route);
  console.log(`[Guard] Reset all stats for route: ${route}`);
}

// 健康检查：检测哪些路由当前可用
async function healthCheck() {
  const results = {};
  
  for (const route of Object.keys(CONFIG.rateLimits)) {
    const rateLimitOk = checkRateLimit(route);
    const breakerCheck = checkCircuitBreaker(route);
    const stats = getCallStats(route);
    
    results[route] = {
      available: rateLimitOk && breakerCheck.canCall,
      rateLimitOk,
      circuitBreakerState: breakerCheck.state,
      recentFailures: stats.failures,
      lastSuccess: stats.lastSuccess
    };
  }
  
  return results;
}

module.exports = {
  guardedModelCall,
  getCallStats,
  resetRouteStats,
  healthCheck,
  logAPIIncident,
  CONFIG
};