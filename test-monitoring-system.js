// Test script for Luma 3 Monitoring System
const dotenv = require('dotenv')
dotenv.config()

// Test the monitoring API endpoints
async function testMonitoringSystem() {
  console.log('🔍 Testing Luma 3 Monitoring System...')
  console.log('=======================================\n')

  const baseURL = process.env.MONITORING_TEST_URL || 'http://localhost:8787'
  
  const tests = [
    {
      name: 'System Health Check',
      endpoint: '/api/monitoring/health',
      method: 'GET'
    },
    {
      name: 'Collect Capacity Metrics',
      endpoint: '/api/monitoring/capacity/collect', 
      method: 'POST'
    },
    {
      name: 'Get Capacity Status',
      endpoint: '/api/monitoring/capacity/status',
      method: 'GET'
    },
    {
      name: 'Get Monitoring Settings',
      endpoint: '/api/monitoring/settings',
      method: 'GET'
    },
    {
      name: 'Get Recent Alerts',
      endpoint: '/api/monitoring/alerts',
      method: 'GET'
    },
    {
      name: 'Check Capacity Alerts',
      endpoint: '/api/monitoring/capacity/check-alerts',
      method: 'POST'
    },
    {
      name: 'Log Performance Test',
      endpoint: '/api/monitoring/performance/log',
      method: 'POST',
      body: {
        endpoint: '/api/chat',
        response_time_ms: 1250,
        success_rate: 98.5,
        request_count: 1,
        model_used: 'test-model',
        route_type: 'empathy'
      }
    },
    {
      name: 'Get Capacity Trends',
      endpoint: '/api/monitoring/capacity/trends?days=7',
      method: 'GET'
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      console.log(`⏳ Testing: ${test.name}`)
      
      const response = await fetch(`${baseURL}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: test.body ? JSON.stringify(test.body) : undefined
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success !== false) {
          console.log(`✅ ${test.name}: PASSED`)
          
          // Show some interesting data from the response
          if (test.name === 'System Health Check' && data.health) {
            console.log(`   Health: ${data.health.overall_health}`)
            console.log(`   Capacity: ${data.health.capacity?.used_pct}%`)
          } else if (test.name === 'Get Capacity Status' && data.capacity) {
            console.log(`   Used: ${data.capacity.used_gb}GB / ${data.capacity.quota_gb}GB`)
            console.log(`   Warning: ${data.capacity.is_warning}`)
          } else if (test.name === 'Get Recent Alerts' && data.alerts) {
            console.log(`   Active alerts: ${data.alerts.filter(a => !a.resolved_at).length}`)
          }
          
          passed++
        } else {
          console.log(`❌ ${test.name}: FAILED - ${data.error}`)
          failed++
        }
      } else {
        console.log(`❌ ${test.name}: FAILED - HTTP ${response.status}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED - ${error.message}`)
      failed++
    }
    
    console.log('') // Empty line for readability
  }

  // Summary
  console.log('=======================================')
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All monitoring system tests passed!')
    console.log('\nNext steps:')
    console.log('1. Check your Supabase dashboard for monitoring tables')
    console.log('2. Run the monitoring cron scheduler')
    console.log('3. Set up monitoring dashboards using the provided queries')
  } else {
    console.log('⚠️  Some tests failed. Please check:')
    console.log('1. Supabase connection and credentials')
    console.log('2. Database schema installation')
    console.log('3. API server is running')
  }
}

// Test direct database functions if available
async function testDatabaseFunctions() {
  console.log('\n🗄️ Testing Database Functions...')
  console.log('=====================================\n')

  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    )

    // Test capacity collection
    console.log('⏳ Testing: luma_collect_capacity()')
    const { data: capacityData, error: capacityError } = await supabase.rpc('luma_collect_capacity')
    
    if (capacityError) {
      console.log(`❌ Capacity collection: FAILED - ${capacityError.message}`)
    } else {
      console.log('✅ Capacity collection: PASSED')
      if (capacityData?.total_gb) {
        console.log(`   Total DB size: ${capacityData.total_gb} GB`)
      }
    }

    // Test capacity status
    console.log('\n⏳ Testing: luma_capacity_status()')
    const { data: statusData, error: statusError } = await supabase.rpc('luma_capacity_status')
    
    if (statusError) {
      console.log(`❌ Capacity status: FAILED - ${statusError.message}`)
    } else if (statusData && statusData.length > 0) {
      console.log('✅ Capacity status: PASSED')
      const status = statusData[0]
      console.log(`   Used: ${status.used_gb}GB / ${status.quota_gb}GB (${status.used_pct}%)`)
      console.log(`   Warning: ${status.is_warning}`)
    } else {
      console.log('⚠️  Capacity status: No data available')
    }

    // Test system health
    console.log('\n⏳ Testing: system_health_summary()')
    const { data: healthData, error: healthError } = await supabase.rpc('system_health_summary')
    
    if (healthError) {
      console.log(`❌ System health: FAILED - ${healthError.message}`)
    } else {
      console.log('✅ System health: PASSED')
      console.log(`   Overall health: ${healthData.overall_health}`)
      console.log(`   Active alerts: ${healthData.active_alerts}`)
    }

  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`)
    console.log('   Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  }
}

// Run tests
async function runAllTests() {
  await testMonitoringSystem()
  await testDatabaseFunctions()
  
  console.log('\n🔧 Manual Verification Steps:')
  console.log('1. Check Supabase > Table Editor for these tables:')
  console.log('   - luma_settings')
  console.log('   - capacity_reports') 
  console.log('   - system_performance_logs')
  console.log('   - monitoring_alerts')
  console.log('\n2. Run this SQL in Supabase to test:')
  console.log('   SELECT luma_collect_capacity();')
  console.log('   SELECT * FROM luma_capacity_status();')
  console.log('\n3. Check API logs for monitoring endpoint activity')
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testMonitoringSystem, testDatabaseFunctions }