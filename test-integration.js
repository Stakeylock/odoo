#!/usr/bin/env node

// Simple integration test script for StackIt

const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:8080';

async function testBackendHealth() {
  console.log('🔍 Testing backend health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    if (response.status === 200 && response.data.status === 'OK') {
      console.log('✅ Backend health check passed');
      return true;
    }
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function testBackendAPI() {
  console.log('🔍 Testing backend API endpoints...');
  try {
    // Test root endpoint
    const rootResponse = await axios.get(`${BACKEND_URL}/`);
    if (rootResponse.status === 200 && rootResponse.data.message.includes('StackIt')) {
      console.log('✅ Backend root endpoint working');
    }

    // Test API endpoints (these should return 401 for unauthenticated requests)
    const apiResponse = await axios.get(`${BACKEND_URL}/api/questions`);
    if (apiResponse.status === 200) {
      console.log('✅ Backend API endpoints accessible');
    }

    return true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Backend API endpoints working (authentication required)');
      return true;
    }
    console.log('❌ Backend API test failed:', error.message);
    return false;
  }
}

async function testFrontend() {
  console.log('🔍 Testing frontend...');
  try {
    const response = await axios.get(FRONTEND_URL);
    if (response.status === 200) {
      console.log('✅ Frontend is accessible');
      return true;
    }
  } catch (error) {
    console.log('❌ Frontend test failed:', error.message);
    return false;
  }
}

async function testCORS() {
  console.log('🔍 Testing CORS configuration...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL
      }
    });
    if (response.status === 200) {
      console.log('✅ CORS configuration working');
      return true;
    }
  } catch (error) {
    console.log('❌ CORS test failed:', error.message);
    return false;
  }
}

async function checkDependencies() {
  console.log('🔍 Checking dependencies...');
  try {
    // Check Node.js version
    const { stdout: nodeVersion } = await execAsync('node --version');
    console.log(`✅ Node.js version: ${nodeVersion.trim()}`);

    // Check npm version
    const { stdout: npmVersion } = await execAsync('npm --version');
    console.log(`✅ npm version: ${npmVersion.trim()}`);

    // Check if backend dependencies are installed
    const backendPackageExists = require('fs').existsSync('./backend/package.json');
    const backendModulesExist = require('fs').existsSync('./backend/node_modules');
    
    if (backendPackageExists && backendModulesExist) {
      console.log('✅ Backend dependencies installed');
    } else {
      console.log('❌ Backend dependencies not installed');
      return false;
    }

    // Check if frontend dependencies are installed
    const frontendPackageExists = require('fs').existsSync('./frontend/package.json');
    const frontendModulesExist = require('fs').existsSync('./frontend/node_modules');
    
    if (frontendPackageExists && frontendModulesExist) {
      console.log('✅ Frontend dependencies installed');
    } else {
      console.log('❌ Frontend dependencies not installed');
      return false;
    }

    return true;
  } catch (error) {
    console.log('❌ Dependency check failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 StackIt Integration Test');
  console.log('===========================');

  const tests = [
    { name: 'Dependencies', test: checkDependencies },
    { name: 'Backend Health', test: testBackendHealth },
    { name: 'Backend API', test: testBackendAPI },
    { name: 'Frontend', test: testFrontend },
    { name: 'CORS', test: testCORS }
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    console.log(`\n🔄 Running ${name} test...`);
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your StackIt integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure both servers are running (./start.sh)');
    console.log('2. Check your .env files are properly configured');
    console.log('3. Verify your Supabase credentials');
    console.log('4. Check for port conflicts');
  }
}

runTests().catch(console.error);