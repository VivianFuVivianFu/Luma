-- =============================================
-- Luma 3 Monitoring Dashboard Queries
-- =============================================
-- These queries are designed to be used with monitoring dashboards
-- or can be called directly via API endpoints

-- =============================================
-- 1. SYSTEM OVERVIEW QUERIES
-- =============================================

-- Current System Health Summary
-- Usage: Get overall system status for main dashboard
SELECT 
    h.overall_health,
    h.capacity->>'used_gb' as capacity_gb,
    h.capacity->>'used_pct' as capacity_pct,
    h.capacity->>'is_warning' as capacity_warning,
    h.performance_24h->>'total_requests' as requests_24h,
    h.performance_24h->>'avg_response_time_ms' as avg_response_time_ms,
    h.alerts_24h,
    h.active_alerts
FROM (SELECT public.system_health_summary() as h) as health_data;

-- Real-time Capacity Status
-- Usage: Main capacity widget on dashboard
SELECT 
    collected_at,
    used_gb,
    quota_gb,
    used_pct,
    is_warning,
    breakdown->>'messages_mb' as messages_mb,
    breakdown->>'summaries_mb' as summaries_mb,
    breakdown->>'longmem_mb' as longmem_mb
FROM public.luma_capacity_status();

-- =============================================
-- 2. CAPACITY MONITORING QUERIES
-- =============================================

-- Capacity Trends (Last 7 Days)
-- Usage: Line chart showing storage growth over time
WITH daily_capacity AS (
    SELECT 
        DATE(collected_at) as date,
        MAX(total_db_bytes) as max_bytes,
        AVG(total_db_bytes) as avg_bytes,
        COUNT(*) as measurements
    FROM capacity_reports 
    WHERE collected_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(collected_at)
)
SELECT 
    date,
    ROUND(max_bytes / 1024.0 / 1024.0 / 1024.0, 3) as max_gb,
    ROUND(avg_bytes / 1024.0 / 1024.0 / 1024.0, 3) as avg_gb,
    measurements
FROM daily_capacity
ORDER BY date;

-- Storage Breakdown by Table (Current)
-- Usage: Pie chart showing which tables use most storage
WITH latest_report AS (
    SELECT *
    FROM capacity_reports
    ORDER BY collected_at DESC
    LIMIT 1
)
SELECT 
    'Messages' as table_name,
    messages_bytes as bytes,
    ROUND(messages_bytes / 1024.0 / 1024.0, 2) as mb,
    ROUND(messages_bytes * 100.0 / total_db_bytes, 1) as percentage
FROM latest_report
UNION ALL
SELECT 
    'Summaries',
    summaries_bytes,
    ROUND(summaries_bytes / 1024.0 / 1024.0, 2),
    ROUND(summaries_bytes * 100.0 / total_db_bytes, 1)
FROM latest_report
UNION ALL
SELECT 
    'Long Memory',
    longmem_bytes,
    ROUND(longmem_bytes / 1024.0 / 1024.0, 2),
    ROUND(longmem_bytes * 100.0 / total_db_bytes, 1)
FROM latest_report
UNION ALL
SELECT 
    'Sessions',
    sessions_bytes,
    ROUND(sessions_bytes / 1024.0 / 1024.0, 2),
    ROUND(sessions_bytes * 100.0 / total_db_bytes, 1)
FROM latest_report
UNION ALL
SELECT 
    'Evaluation Data',
    evaluation_bytes,
    ROUND(evaluation_bytes / 1024.0 / 1024.0, 2),
    ROUND(evaluation_bytes * 100.0 / total_db_bytes, 1)
FROM latest_report
ORDER BY bytes DESC;

-- Storage Growth Rate (Weekly)
-- Usage: Growth prediction and planning
WITH weekly_growth AS (
    SELECT 
        DATE_TRUNC('week', collected_at) as week,
        MAX(total_db_bytes) as max_bytes
    FROM capacity_reports
    WHERE collected_at > NOW() - INTERVAL '4 weeks'
    GROUP BY DATE_TRUNC('week', collected_at)
    ORDER BY week
),
growth_rates AS (
    SELECT 
        week,
        max_bytes,
        ROUND(max_bytes / 1024.0 / 1024.0 / 1024.0, 3) as gb,
        LAG(max_bytes) OVER (ORDER BY week) as prev_bytes,
        CASE 
            WHEN LAG(max_bytes) OVER (ORDER BY week) IS NOT NULL
            THEN ROUND(((max_bytes - LAG(max_bytes) OVER (ORDER BY week)) * 100.0 / LAG(max_bytes) OVER (ORDER BY week)), 2)
            ELSE 0
        END as growth_rate_pct
    FROM weekly_growth
)
SELECT 
    week,
    gb,
    growth_rate_pct,
    CASE 
        WHEN growth_rate_pct > 20 THEN 'High Growth'
        WHEN growth_rate_pct > 10 THEN 'Moderate Growth'
        WHEN growth_rate_pct > 0 THEN 'Low Growth'
        ELSE 'No Growth'
    END as growth_category
FROM growth_rates
WHERE prev_bytes IS NOT NULL;

-- =============================================
-- 3. PERFORMANCE MONITORING QUERIES
-- =============================================

-- API Performance Summary (Last 24 Hours)
-- Usage: Performance dashboard main metrics
SELECT 
    api_endpoint,
    COUNT(*) as total_requests,
    ROUND(AVG(response_time_ms)) as avg_response_time,
    MIN(response_time_ms) as min_response_time,
    MAX(response_time_ms) as max_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    ROUND(AVG(success_rate), 2) as avg_success_rate,
    SUM(error_count) as total_errors,
    ROUND(SUM(error_count) * 100.0 / SUM(request_count), 2) as error_rate_pct
FROM system_performance_logs
WHERE logged_at > NOW() - INTERVAL '24 hours'
GROUP BY api_endpoint
ORDER BY total_requests DESC;

-- Hourly Performance Trends (Last 24 Hours)
-- Usage: Time series chart showing performance over time
SELECT 
    DATE_TRUNC('hour', logged_at) as hour,
    api_endpoint,
    COUNT(*) as requests,
    ROUND(AVG(response_time_ms)) as avg_response_time,
    ROUND(AVG(success_rate), 2) as avg_success_rate,
    SUM(error_count) as errors
FROM system_performance_logs
WHERE logged_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', logged_at), api_endpoint
ORDER BY hour, api_endpoint;

-- Slowest API Endpoints (Current Issues)
-- Usage: Alert dashboard for performance problems
SELECT 
    api_endpoint,
    AVG(response_time_ms) as avg_response_time,
    COUNT(*) as recent_requests,
    MAX(logged_at) as last_request,
    CASE 
        WHEN AVG(response_time_ms) > 5000 THEN 'Critical'
        WHEN AVG(response_time_ms) > 2000 THEN 'Warning'
        ELSE 'OK'
    END as status
FROM system_performance_logs
WHERE logged_at > NOW() - INTERVAL '1 hour'
GROUP BY api_endpoint
HAVING AVG(response_time_ms) > 1000
ORDER BY avg_response_time DESC;

-- Model Usage Statistics
-- Usage: Understanding AI model utilization
SELECT 
    model_used,
    route_type,
    COUNT(*) as usage_count,
    ROUND(AVG(response_time_ms)) as avg_response_time,
    ROUND(AVG(avg_tokens)) as avg_tokens_used,
    DATE(logged_at) as date
FROM system_performance_logs
WHERE model_used IS NOT NULL
AND logged_at > NOW() - INTERVAL '7 days'
GROUP BY model_used, route_type, DATE(logged_at)
ORDER BY date DESC, usage_count DESC;

-- =============================================
-- 4. ALERT MONITORING QUERIES
-- =============================================

-- Active Alerts Dashboard
-- Usage: Main alerts widget
SELECT 
    id,
    alert_type,
    severity,
    title,
    message,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_active,
    metadata
FROM monitoring_alerts
WHERE resolved_at IS NULL
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        ELSE 3 
    END,
    created_at DESC;

-- Alert Trends (Last 30 Days)
-- Usage: Historical alert analysis
SELECT 
    DATE(created_at) as date,
    alert_type,
    severity,
    COUNT(*) as alert_count,
    COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at)) / 3600), 2) as avg_resolution_hours
FROM monitoring_alerts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), alert_type, severity
ORDER BY date DESC, alert_count DESC;

-- Alert Response Time Analysis
-- Usage: Team performance metrics
SELECT 
    alert_type,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved_alerts,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 2) as avg_resolution_hours,
    MIN(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as min_resolution_hours,
    MAX(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as max_resolution_hours
FROM monitoring_alerts
WHERE resolved_at IS NOT NULL
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY alert_type
ORDER BY avg_resolution_hours;

-- =============================================
-- 5. USER ACTIVITY MONITORING
-- =============================================

-- Daily Active Users Trend
-- Usage: User engagement dashboard
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_messages,
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT user_id), 1) as avg_messages_per_user
FROM messages
WHERE created_at > NOW() - INTERVAL '30 days'
AND role = 'user'
GROUP BY DATE(created_at)
ORDER BY date;

-- User Retention Analysis
-- Usage: Understanding user engagement patterns
WITH user_first_activity AS (
    SELECT 
        user_id,
        MIN(DATE(created_at)) as first_active_date
    FROM messages
    WHERE role = 'user'
    GROUP BY user_id
),
retention_cohorts AS (
    SELECT 
        ufa.first_active_date as cohort_date,
        COUNT(DISTINCT ufa.user_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN DATE(m.created_at) = ufa.first_active_date + INTERVAL '1 day' THEN m.user_id END) as day_1_retained,
        COUNT(DISTINCT CASE WHEN DATE(m.created_at) = ufa.first_active_date + INTERVAL '7 days' THEN m.user_id END) as day_7_retained,
        COUNT(DISTINCT CASE WHEN DATE(m.created_at) = ufa.first_active_date + INTERVAL '30 days' THEN m.user_id END) as day_30_retained
    FROM user_first_activity ufa
    LEFT JOIN messages m ON m.user_id = ufa.user_id AND m.role = 'user'
    WHERE ufa.first_active_date > NOW() - INTERVAL '60 days'
    GROUP BY ufa.first_active_date
)
SELECT 
    cohort_date,
    cohort_size,
    ROUND(day_1_retained * 100.0 / cohort_size, 1) as day_1_retention_pct,
    ROUND(day_7_retained * 100.0 / cohort_size, 1) as day_7_retention_pct,
    ROUND(day_30_retained * 100.0 / cohort_size, 1) as day_30_retention_pct
FROM retention_cohorts
WHERE cohort_size >= 5  -- Only show cohorts with meaningful size
ORDER BY cohort_date DESC;

-- =============================================
-- 6. MONITORING SETTINGS MANAGEMENT
-- =============================================

-- Current Monitoring Configuration
-- Usage: Settings dashboard
SELECT 
    key,
    value,
    description,
    updated_at
FROM luma_settings
WHERE category = 'monitoring'
ORDER BY key;

-- =============================================
-- 7. SYSTEM MAINTENANCE QUERIES
-- =============================================

-- Database Maintenance Recommendations
-- Usage: Proactive maintenance planning
WITH table_stats AS (
    SELECT 
        'messages' as table_name,
        (SELECT COUNT(*) FROM messages) as row_count,
        (SELECT MAX(created_at) FROM messages) as latest_record
    UNION ALL
    SELECT 
        'capacity_reports',
        (SELECT COUNT(*) FROM capacity_reports),
        (SELECT MAX(collected_at) FROM capacity_reports)
    UNION ALL
    SELECT 
        'system_performance_logs',
        (SELECT COUNT(*) FROM system_performance_logs),
        (SELECT MAX(logged_at) FROM system_performance_logs)
    UNION ALL
    SELECT 
        'monitoring_alerts',
        (SELECT COUNT(*) FROM monitoring_alerts),
        (SELECT MAX(created_at) FROM monitoring_alerts)
)
SELECT 
    table_name,
    row_count,
    latest_record,
    CASE 
        WHEN table_name = 'capacity_reports' AND row_count > 10000 
        THEN 'Consider archiving old capacity reports (keep last 30 days)'
        WHEN table_name = 'system_performance_logs' AND row_count > 50000
        THEN 'Consider archiving old performance logs (keep last 7 days)'
        WHEN table_name = 'monitoring_alerts' AND row_count > 5000
        THEN 'Consider archiving resolved alerts older than 90 days'
        WHEN latest_record < NOW() - INTERVAL '24 hours'
        THEN 'No recent data - check data collection processes'
        ELSE 'OK'
    END as maintenance_recommendation
FROM table_stats
ORDER BY row_count DESC;

-- Data Retention Cleanup Queries (Execute Manually)
-- Usage: Regular maintenance to keep database size manageable

-- Clean old capacity reports (keep last 30 days)
-- DELETE FROM capacity_reports WHERE collected_at < NOW() - INTERVAL '30 days';

-- Clean old performance logs (keep last 7 days)  
-- DELETE FROM system_performance_logs WHERE logged_at < NOW() - INTERVAL '7 days';

-- Archive resolved alerts older than 90 days
-- DELETE FROM monitoring_alerts WHERE resolved_at IS NOT NULL AND resolved_at < NOW() - INTERVAL '90 days';

-- =============================================
-- EXAMPLE API INTEGRATION QUERIES
-- =============================================

/*
These queries can be integrated into your API endpoints:

1. Dashboard Overview:
GET /api/monitoring/dashboard/overview
-> Use "System Health Summary" query

2. Capacity Widget:
GET /api/monitoring/capacity/current
-> Use "Real-time Capacity Status" query

3. Performance Chart:
GET /api/monitoring/performance/trends?hours=24
-> Use "Hourly Performance Trends" query

4. Alerts Panel:
GET /api/monitoring/alerts/active
-> Use "Active Alerts Dashboard" query

5. User Analytics:
GET /api/monitoring/users/daily-active
-> Use "Daily Active Users Trend" query
*/

-- Installation verification query
SELECT 
    'Monitoring System Ready' as status,
    NOW() as timestamp,
    (SELECT COUNT(*) FROM luma_settings WHERE category = 'monitoring') as settings_count,
    (SELECT COUNT(*) FROM capacity_reports) as capacity_reports_count,
    (SELECT COUNT(*) FROM monitoring_alerts) as alerts_count;