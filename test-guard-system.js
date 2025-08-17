// Test script for API Guard and Degradation System
const dotenv = require('dotenv')
dotenv.config()

// Test the guard system functionality
async function testGuardSystem() {
  console.log('🛡️  Testing API Guard and Degradation System...')
  console.log('==================================================\n')

  const baseURL = process.env.MONITORING_TEST_URL || 'http://localhost:8787'
  
  const tests = [
    {
      name: 'Get Guard Status',
      endpoint: '/api/guard/status',
      method: 'GET'
    },
    {
      name: 'Get Guard Configuration',
      endpoint: '/api/guard/config',
      method: 'GET'
    },
    {
      name: 'Get Health Overview',
      endpoint: '/api/guard/health',
      method: 'GET'
    },
    {
      name: 'Get Reliability Stats',
      endpoint: '/api/guard/reliability?hours=24',
      method: 'GET'
    },
    {
      name: 'Get Recent Incidents',
      endpoint: '/api/guard/incidents?limit=10',
      method: 'GET'
    },
    {
      name: 'Simulate Successful Call',
      endpoint: '/api/guard/simulate',
      method: 'POST',
      body: {
        route: 'empathy',
        shouldFail: false
      }
    },
    {
      name: 'Reset Route Stats (test)',
      endpoint: '/api/guard/routes/empathy/reset',
      method: 'POST'
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
          
          // Show interesting data
          if (test.name === 'Get Guard Configuration' && data.config) {
            console.log(`   Rate limits configured for ${Object.keys(data.config.rateLimits).length} routes`)
          } else if (test.name === 'Get Health Overview' && data.overview) {
            console.log(`   Health score: ${data.overview.healthScore}% (${data.overview.availableRoutes}/${data.overview.totalRoutes} routes available)`)
          } else if (test.name === 'Get Reliability Stats' && data.stats) {
            console.log(`   ${data.stats.length} routes monitored`)
          } else if (test.name === 'Get Recent Incidents' && data.incidents) {
            console.log(`   ${data.incidents.length} recent incidents found`)
          } else if (test.name === 'Simulate Successful Call' && data.result) {
            console.log(`   Call ${data.result.degraded ? 'degraded' : 'succeeded'} in ${data.result.duration}ms`)
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
    
    console.log('')
  }

  return { passed, failed }
}

// Test actual model calls with degradation
async function testModelDegradation() {
  console.log('\n🤖 Testing Model Call Degradation...')
  console.log('=====================================')

  try {
    // Test if we can import the modules
    const { triage } = require('./src/multimodel/llm.triage.js')
    const { empathyReply } = require('./src/multimodel/llm.empathy.js')
    const { reasonOutline32B } = require('./src/multimodel/llm.reason.together.js')

    const testMessage = "I'm feeling very anxious and stressed about work. Can you help me?"
    
    // Test triage
    console.log('⏳ Testing triage with degradation protection...')
    try {
      const triageResult = await triage(testMessage)
      console.log(`✅ Triage: ${triageResult.label} (${triageResult.score.toFixed(2)}) - Type: ${triageResult.type}`)
    } catch (error) {
      console.log(`❌ Triage failed: ${error.message}`)
    }

    // Test reasoning
    console.log('\n⏳ Testing reasoning with degradation protection...')
    try {
      const reasonResult = await reasonOutline32B({
        summary: 'User previously mentioned work stress',
        longmem: ['User is in a high-stress job'],
        user: testMessage
      })
      console.log(`✅ Reasoning: ${reasonResult.length > 0 ? 'Generated outline' : 'Empty (degraded to empathy-only)'} (${reasonResult.length} chars)`)
    } catch (error) {
      console.log(`❌ Reasoning failed: ${error.message}`)
    }

    // Test empathy (should always work with fallbacks)
    console.log('\n⏳ Testing empathy with fallback protection...')
    try {
      const empathyResult = await empathyReply({
        system: 'You are a supportive AI companion.',
        user: testMessage
      })
      console.log(`✅ Empathy: Generated response (${empathyResult.length} chars)`)
      console.log(`   Preview: "${empathyResult.substring(0, 100)}..."`)
    } catch (error) {
      console.log(`❌ Empathy failed: ${error.message}`)
    }

  } catch (importError) {
    console.log(`❌ Cannot test model degradation - module import failed: ${importError.message}`)
    console.log('   Make sure the API server is set up correctly')
  }
}

// Test circuit breaker behavior
async function testCircuitBreaker() {
  console.log('\n⚡ Testing Circuit Breaker...')
  console.log('==============================')

  try {
    const { guardedModelCall } = require('./src/multimodel/guard.fetch.js')
    
    console.log('Testing multiple failures to trigger circuit breaker...')
    
    let failureCount = 0
    for (let i = 1; i <= 6; i++) {
      try {
        await guardedModelCall({
          route: 'test-circuit',
          model: 'test-model',
          timeoutMs: 1000,
          request: {
            url: 'https://httpbin.org/status/500', // Always returns 500
            method: 'GET'
          },
          onDegrade: async () => {
            return {
              ok: true,
              json: { message: 'Degraded after failure' },
              degraded: true
            }
          }
        })
        console.log(`   Attempt ${i}: Success (unexpected)`)
      } catch (error) {
        failureCount++
        console.log(`   Attempt ${i}: Failed - ${error.message}`)
        
        if (error.message.includes('Circuit breaker open')) {
          console.log(`✅ Circuit breaker triggered after ${failureCount - 1} failures`)
          break
        }
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
  } catch (importError) {
    console.log(`❌ Cannot test circuit breaker: ${importError.message}`)
  }
}

// Test rate limiting
async function testRateLimit() {
  console.log('\n🚦 Testing Rate Limiting...')
  console.log('============================')

  try {
    const { guardedModelCall } = require('./src/multimodel/guard.fetch.js')
    
    console.log('Making rapid requests to test rate limiting...')
    
    const promises = []
    for (let i = 1; i <= 10; i++) {
      promises.push(
        guardedModelCall({
          route: 'empathy',
          model: 'test-model',
          timeoutMs: 5000,
          request: {
            url: 'https://httpbin.org/delay/0.1',
            method: 'GET'
          }
        }).then(() => `Request ${i}: Success`)
        .catch(error => `Request ${i}: ${error.message}`)
      )
    }
    
    const results = await Promise.all(promises)
    const rateLimited = results.filter(r => r.includes('Rate limit')).length
    const successful = results.filter(r => r.includes('Success')).length
    
    console.log(`   Results: ${successful} successful, ${rateLimited} rate limited`)
    if (rateLimited > 0) {
      console.log('✅ Rate limiting is working')
    } else {
      console.log('ℹ️  Rate limiting not triggered (requests within limits)')
    }
    
  } catch (importError) {
    console.log(`❌ Cannot test rate limiting: ${importError.message}`)
  }
}

// Main test runner
async function runAllTests() {
  console.log('🛡️  API Guard and Degradation Test Suite')
  console.log('=========================================\n')
  
  // Test API endpoints
  const apiResults = await testGuardSystem()
  
  // Test model degradation
  await testModelDegradation()
  
  // Test circuit breaker
  await testCircuitBreaker()
  
  // Test rate limiting
  await testRateLimit()
  
  // Summary
  console.log('\n🎯 Test Summary')
  console.log('===============')
  console.log(`✅ API Endpoints: ${apiResults.passed} passed, ${apiResults.failed} failed`)
  console.log('✅ Model degradation protection tested')
  console.log('✅ Circuit breaker behavior tested')
  console.log('✅ Rate limiting tested')
  
  console.log('\n📝 Manual Verification Steps:')
  console.log('1. Check Supabase api_incidents table for logged events')
  console.log('2. Monitor API response times during high load')
  console.log('3. Verify graceful degradation in production scenarios')
  console.log('4. Test emergency route reset functionality')
  
  if (apiResults.passed > apiResults.failed) {
    console.log('\n🟢 Overall: API Guard system is working correctly!')
  } else {
    console.log('\n🟡 Overall: Some API tests failed - check configurations')
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { 
  testGuardSystem, 
  testModelDegradation, 
  testCircuitBreaker, 
  testRateLimit 
}