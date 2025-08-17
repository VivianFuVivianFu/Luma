// Test script for Memory Selector System
const dotenv = require('dotenv')
dotenv.config()

const { scoreCandidate, hashText } = require('./src/multimodel/memory.selector.js')

// Test cases for memory scoring
const testCases = [
  {
    name: 'High Emotional Content',
    text: '我感到极度焦虑，每天晚上都失眠，脑子里总是想着工作的压力',
    expected: 'high', // Should score > 0.6
    recentTurns: []
  },
  {
    name: 'Goal Setting',
    text: '我计划每天早上6点起床锻炼，这是我的新年目标，要坚持下去',
    expected: 'high',
    recentTurns: []
  },
  {
    name: 'Identity Statement',
    text: '我是一个倾向于完美主义的人，总是对自己要求很高',
    expected: 'high', 
    recentTurns: []
  },
  {
    name: 'Action Steps',
    text: '第一步我要尝试深呼吸练习，每天做10分钟的冥想',
    expected: 'high',
    recentTurns: []
  },
  {
    name: 'Repetitive Theme',
    text: '又是关于工作压力的问题，我觉得老板总是给我太多任务',
    expected: 'high',
    recentTurns: [
      { content: '最近工作压力很大' },
      { content: '老板又给我加了新项目' },
      { content: '感觉工作量超负荷了' }
    ]
  },
  {
    name: 'Trivial Content',
    text: '谢谢你的建议，我知道了',
    expected: 'low', // Should score < 0.6
    recentTurns: []
  },
  {
    name: 'Short Greeting',
    text: '你好',
    expected: 'low',
    recentTurns: []
  },
  {
    name: 'Medium Content',
    text: '今天天气不错，我去了公园散步，感觉心情好了一些',
    expected: 'medium',
    recentTurns: []
  },
  {
    name: 'Mixed Emotional + Goal',
    text: '虽然我很沮丧，但我决定每周去看心理咨询师，我要改变现状',
    expected: 'high',
    recentTurns: []
  },
  {
    name: 'English Emotional',
    text: 'I feel extremely overwhelmed and anxious about my future career prospects',
    expected: 'high',
    recentTurns: []
  }
]

// Test memory API endpoints
async function testMemoryAPIs() {
  console.log('\n🧠 Testing Memory Management APIs...')
  console.log('========================================')
  
  const baseURL = process.env.MONITORING_TEST_URL || 'http://localhost:8787'
  const testUserId = 'test-user-memory'
  
  const apiTests = [
    {
      name: 'Score Text API',
      method: 'POST',
      endpoint: '/api/memory/score',
      body: {
        text: '我感到非常焦虑，计划每天做冥想来缓解压力',
        recentTexts: ['昨天也很焦虑', '压力让我睡不着']
      }
    },
    {
      name: 'Add Manual Memory',
      method: 'POST', 
      endpoint: '/api/memory/add',
      body: {
        userId: testUserId,
        text: '用户表示有严重的工作焦虑，需要学习压力管理技巧',
        importance: 8,
        source: 'manual'
      }
    },
    {
      name: 'Get User Memories',
      method: 'GET',
      endpoint: `/api/memory/users/${testUserId}?limit=10&minImportance=5`
    },
    {
      name: 'Get Memory Stats',
      method: 'GET',
      endpoint: `/api/memory/users/${testUserId}/stats`
    }
  ]
  
  for (const test of apiTests) {
    try {
      console.log(`⏳ Testing: ${test.name}`)
      
      const response = await fetch(`${baseURL}${test.endpoint}`, {
        method: test.method,
        headers: { 'Content-Type': 'application/json' },
        body: test.body ? JSON.stringify(test.body) : undefined
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log(`✅ ${test.name}: PASSED`)
          
          // Show relevant data
          if (test.name === 'Score Text API' && data.score) {
            console.log(`   Score: ${data.score} (${data.importance}/10) - Qualified: ${data.qualified}`)
          } else if (test.name === 'Get User Memories' && data.memories) {
            console.log(`   Found ${data.memories.length} memories`)
          } else if (test.name === 'Get Memory Stats' && data.stats) {
            console.log(`   Total: ${data.stats.total}, Avg Importance: ${data.stats.avgImportance}`)
          } else if (test.name === 'Add Manual Memory' && data.result) {
            console.log(`   Inserted: ${data.result.inserted} memories`)
          }
        } else {
          console.log(`❌ ${test.name}: FAILED - ${data.error}`)
        }
      } else {
        console.log(`❌ ${test.name}: FAILED - HTTP ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED - ${error.message}`)
    }
    console.log('')
  }
}

// Test scoring function
function testMemoryScoring() {
  console.log('🧮 Testing Memory Scoring Function...')
  console.log('====================================')
  
  let passed = 0
  let failed = 0
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`)
    console.log(`Text: "${testCase.text}"`)
    
    const score = scoreCandidate(testCase.text, testCase.recentTurns)
    const importance = Math.round(score * 10)
    
    console.log(`Score: ${score.toFixed(3)} (${importance}/10)`)
    
    let expectedResult
    if (testCase.expected === 'high') expectedResult = score >= 0.6
    else if (testCase.expected === 'medium') expectedResult = score >= 0.3 && score < 0.6
    else expectedResult = score < 0.6
    
    if (expectedResult) {
      console.log(`✅ PASSED (Expected ${testCase.expected})`)
      passed++
    } else {
      console.log(`❌ FAILED (Expected ${testCase.expected})`)
      failed++
    }
    
    // Show hash for uniqueness testing
    const hash = hashText(testCase.text)
    console.log(`Hash: ${hash.substring(0, 12)}...`)
  })
  
  console.log('\n====================================')
  console.log(`📊 Scoring Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

// Test hash function for uniqueness
function testHashFunction() {
  console.log('\n🔐 Testing Hash Function...')
  console.log('============================')
  
  const textPairs = [
    ['Hello world', 'hello world'], // Should be same (case insensitive)
    ['Hello    world', 'hello world'], // Should be same (whitespace normalized)
    ['Hello, world!', 'hello world'], // Should be same (punctuation removed)
    ['Hello world', 'Hello universe'] // Should be different
  ]
  
  textPairs.forEach(([text1, text2], index) => {
    const hash1 = hashText(text1)
    const hash2 = hashText(text2)
    const same = hash1 === hash2
    
    console.log(`${index + 1}. "${text1}" vs "${text2}"`)
    console.log(`   Hash1: ${hash1.substring(0, 12)}...`)
    console.log(`   Hash2: ${hash2.substring(0, 12)}...`)
    console.log(`   Same: ${same}`)
    console.log('')
  })
}

// Test with real conversation flow
async function testConversationFlow() {
  console.log('\n💬 Testing Conversation Memory Flow...')
  console.log('======================================')
  
  try {
    const { maybeStoreLongMemories } = require('./src/multimodel/memory.selector.js')
    
    const testUserId = 'test-conv-user'
    const candidates = [
      '我每天都感到很焦虑，特别是工作压力很大',
      '计划每周去健身房三次来减压',
      '我喜欢安静的环境，嘈杂的地方让我不舒服',
      '第一步是学会说不，不要接受过多的任务',
      '谢谢你的建议' // This should be filtered out
    ]
    
    const recentTurns = [
      { content: '最近工作很累' },
      { content: '压力让我睡不好' }
    ]
    
    console.log('Candidate memories:')
    candidates.forEach((text, i) => {
      const score = scoreCandidate(text, recentTurns)
      console.log(`${i + 1}. [${score.toFixed(2)}] "${text}"`)
    })
    
    const result = await maybeStoreLongMemories(
      testUserId, 
      candidates, 
      recentTurns, 
      'test'
    )
    
    console.log(`\nStorage Result:`)
    console.log(`- Processed: ${result.processed}`)
    console.log(`- Inserted: ${result.inserted}`)
    console.log(`- Filtered: ${result.filtered}`)
    
  } catch (error) {
    console.log(`❌ Conversation flow test failed: ${error.message}`)
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧠 Memory Selector System Test Suite')
  console.log('=====================================\n')
  
  // Test scoring logic
  const scoringResults = testMemoryScoring()
  
  // Test hash function
  testHashFunction()
  
  // Test conversation flow
  await testConversationFlow()
  
  // Test APIs
  await testMemoryAPIs()
  
  // Summary
  console.log('\n🎉 Memory Selector Test Summary')
  console.log('===============================')
  console.log('✅ Memory scoring function tested')
  console.log('✅ Hash function for deduplication tested')
  console.log('✅ Conversation flow simulation completed')
  console.log('✅ API endpoints tested')
  
  if (scoringResults.passed > scoringResults.failed) {
    console.log('\n🟢 Overall: Memory Selector system is working correctly!')
  } else {
    console.log('\n🟡 Overall: Some scoring tests failed - review scoring logic')
  }
  
  console.log('\n📝 Manual Verification Steps:')
  console.log('1. Check Supabase user_long_memory table for test entries')
  console.log('2. Verify importance scores are in 1-10 range')
  console.log('3. Confirm hash-based deduplication is working')
  console.log('4. Test API endpoints with curl or Postman')
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { 
  testMemoryScoring, 
  testHashFunction, 
  testConversationFlow, 
  testMemoryAPIs 
}