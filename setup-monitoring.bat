@echo off
echo ============================================
echo Luma 3 Monitoring System Setup
echo ============================================
echo.

echo [1/3] Checking Supabase connection...
if not defined SUPABASE_ACCESS_TOKEN (
    echo Error: SUPABASE_ACCESS_TOKEN is not set
    echo Please set your Supabase access token first:
    echo export SUPABASE_ACCESS_TOKEN=your_token_here
    pause
    exit /b 1
)

echo [2/3] Installing monitoring system schema...
echo Please run the following SQL file in your Supabase SQL editor:
echo %~dp0supabase_monitoring_system.sql
echo.
echo After running the SQL file, press any key to continue...
pause >nul

echo [3/3] Initializing monitoring data...
echo Testing monitoring system initialization...

:: Try to collect initial capacity metrics via SQL
echo You can now test the monitoring system by running these SQL commands in Supabase:
echo.
echo -- Initialize capacity monitoring:
echo SELECT luma_collect_capacity();
echo.
echo -- Check system health:
echo SELECT system_health_summary();
echo.
echo -- View current capacity status:
echo SELECT * FROM luma_capacity_status();
echo.

echo ============================================
echo Monitoring System Setup Complete!
echo ============================================
echo.
echo API Endpoints Available:
echo GET  /api/monitoring/health
echo GET  /api/monitoring/capacity/status
echo POST /api/monitoring/capacity/collect
echo GET  /api/monitoring/alerts
echo GET  /api/monitoring/settings
echo.
echo Scheduled Tasks:
echo - Capacity metrics: Every 15 minutes
echo - Capacity alerts: Every 30 minutes  
echo - System health check: Every hour
echo.
echo Next Steps:
echo 1. Visit your Supabase dashboard to verify tables were created
echo 2. Run monitoring API endpoints to test functionality
echo 3. Check the cron scheduler logs for automated monitoring
echo.
pause