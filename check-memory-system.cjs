/**
 * Quick Memory System Check Script
 * Run this to verify your environment is configured for memory system
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Luma Memory System Configuration...\n');

// Check if .env files exist (prefer .env.local, fallback to .env)
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envLocalPath) || fs.existsSync(envPath);
const actualEnvPath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

console.log('📁 Environment File:');
console.log(`   Environment file exists: ${envExists ? '✅' : '❌'}`);
if (envExists) {
  console.log(`   Using: ${path.basename(actualEnvPath)}`);
}

if (envExists) {
  const envContent = fs.readFileSync(actualEnvPath, 'utf8');
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY', 
    'VITE_SUPABASE_SERVICE_ROLE_KEY'
  ];

  console.log('\n🔑 Required Environment Variables:');
  requiredVars.forEach(varName => {
    const exists = envContent.includes(varName);
    const hasValue = exists && envContent.match(new RegExp(`${varName}=(.+)`));
    console.log(`   ${varName}: ${hasValue ? '✅' : '❌'}`);
  });
}

// Check for unified migration file
const unifiedMigrationPath = path.join(__dirname, 'migrations', 'unified_memory_system.sql');
const unifiedMigrationExists = fs.existsSync(unifiedMigrationPath);

console.log('\n📄 Database Schema:');
console.log(`   migrations/unified_memory_system.sql: ${unifiedMigrationExists ? '✅' : '❌'}`);

// Check if memory service is integrated
const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.tsx');
const dashboardExists = fs.existsSync(dashboardPath);

if (dashboardExists) {
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  const hasMemoryImport = dashboardContent.includes("import { memoryService }");
  const hasMemoryIntegration = dashboardContent.includes("memoryService.saveMessage");
  
  console.log('\n🔗 Memory Service Integration:');
  console.log(`   Memory service imported: ${hasMemoryImport ? '✅' : '❌'}`);
  console.log(`   Memory service used in chat: ${hasMemoryIntegration ? '✅' : '❌'}`);
}

// Check diagnostics
const diagnosticsPath = path.join(__dirname, 'src', 'components', 'MemoryDiagnostics.tsx');
const diagnosticsExists = fs.existsSync(diagnosticsPath);

console.log('\n🔧 Diagnostics Tools:');
console.log(`   Memory diagnostics component: ${diagnosticsExists ? '✅' : '❌'}`);

console.log('\n🎯 Next Steps:');
if (!envExists) {
  console.log('   1. Create .env or .env.local file with Supabase credentials');
}

if (unifiedMigrationExists) {
  console.log('   1. 🔧 Run migrations/unified_memory_system.sql in Supabase SQL editor');
} else {
  console.log('   1. Unified migration file is missing - check setup');
}
console.log('   2. Visit /diagnostics to test the memory system');
console.log('   3. Start chatting with Luma to test memory persistence');

console.log('\n✨ When working properly:');
console.log('   - Chat header shows "Memory Active"');
console.log('   - Previous messages load on page refresh');
console.log('   - Luma remembers context from earlier conversations');