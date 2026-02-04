const crypto = require('crypto');
const http = require('http');

// Configuration
const CONFIG = {
  API_URL: '/device/real/query',
  API_TOKEN: 'interview_token_123',
  API_HOST: 'localhost',
  API_PORT: 3000,
  BATCH_SIZE: 10,
  RATE_LIMIT_MS: 1000, // 1 request per second
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000
};

/**
 * Generate 500 dummy serial numbers (SN-000 to SN-499)
 */
function generateSerialNumbers() {
  const serialNumbers = [];
  for (let i = 0; i < 500; i++) {
    serialNumbers.push(`SN-${String(i).padStart(3, '0')}`);
  }
  return serialNumbers;
}

/**
 * Generate MD5 signature: MD5(URL + Token + Timestamp)
 */
function generateSignature(timestamp) {
  const signatureString = CONFIG.API_URL + CONFIG.API_TOKEN + timestamp;
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Make a POST request to the mock API
 */
function fetchDeviceData(snList, host = CONFIG.API_HOST, port = CONFIG.API_PORT) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now().toString();
    const signature = generateSignature(timestamp);
    
    const postData = JSON.stringify({ sn_list: snList });
    
    const options = {
      hostname: host,
      port: port,
      path: CONFIG.API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'signature': signature,
        'timestamp': timestamp
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve({ success: true, data: parsed.data, statusCode: res.statusCode });
          } catch (err) {
            reject({ success: false, error: 'Failed to parse response', statusCode: res.statusCode });
          }
        } else {
          resolve({ success: false, error: data, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (err) => {
      reject({ success: false, error: err.message, statusCode: 0 });
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch data with retry logic for 429 and network errors
 */
async function fetchWithRetry(snList, host, port, retryCount = 0) {
  try {
    const result = await fetchDeviceData(snList, host, port);
    
    if (!result.success && result.statusCode === 429 && retryCount < CONFIG.MAX_RETRIES) {
      console.log(`⚠️  Rate limit hit (429). Retrying in ${CONFIG.RETRY_DELAY_MS}ms... (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(CONFIG.RETRY_DELAY_MS);
      return fetchWithRetry(snList, host, port, retryCount + 1);
    }
    
    return result;
  } catch (err) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`⚠️  Network error. Retrying in ${CONFIG.RETRY_DELAY_MS}ms... (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
      await sleep(CONFIG.RETRY_DELAY_MS);
      return fetchWithRetry(snList, host, port, retryCount + 1);
    }
    return err;
  }
}

/**
 * Split array into batches
 */
function createBatches(array, batchSize) {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Main aggregation function - fetches data for all 500 devices
 */
async function aggregateDeviceData(host = CONFIG.API_HOST, port = CONFIG.API_PORT) {
  const startTime = Date.now();
  console.log('🚀 Starting EnergyGrid Data Aggregator...');
  console.log(`📊 Target: 500 devices in batches of ${CONFIG.BATCH_SIZE}`);
  console.log(`⏱️  Rate limit: ${CONFIG.RATE_LIMIT_MS}ms between requests\n`);
  
  // Step 1: Generate serial numbers
  const serialNumbers = generateSerialNumbers();
  console.log(`✅ Generated ${serialNumbers.length} serial numbers`);
  
  // Step 2: Create batches
  const batches = createBatches(serialNumbers, CONFIG.BATCH_SIZE);
  console.log(`✅ Created ${batches.length} batches\n`);
  
  // Step 3: Process batches with rate limiting
  const aggregatedData = [];
  const errors = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📡 Processing batch ${i + 1}/${batches.length} (${batch.length} devices)...`);
    
    const result = await fetchWithRetry(batch, host, port);
    
    if (result.success && result.data) {
      aggregatedData.push(...result.data);
      console.log(`   ✅ Success: ${result.data.length} devices fetched`);
    } else {
      errors.push({
        batch: i + 1,
        serialNumbers: batch,
        error: result.error,
        statusCode: result.statusCode
      });
      console.log(`   ❌ Failed: ${result.error} (Status: ${result.statusCode})`);
    }
    
    // Rate limiting: wait 1 second before next request (except for the last batch)
    if (i < batches.length - 1) {
      await sleep(CONFIG.RATE_LIMIT_MS);
    }
  }
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('📈 Aggregation Complete!');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${aggregatedData.length} devices`);
  console.log(`❌ Failed: ${errors.length} batches`);
  console.log(`⏱️  Total time: ${totalTime} seconds`);
  console.log('='.repeat(50) + '\n');
  
  return {
    success: true,
    totalDevices: 500,
    fetchedDevices: aggregatedData.length,
    failedBatches: errors.length,
    executionTimeSeconds: parseFloat(totalTime),
    data: aggregatedData,
    errors: errors
  };
}

// Export functions for use in server
module.exports = {
  aggregateDeviceData,
  generateSerialNumbers,
  generateSignature,
  fetchDeviceData
};

// Allow running as standalone script
if (require.main === module) {
  aggregateDeviceData()
    .then(result => {
      console.log('📄 Final Report:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Fatal error:', err);
      process.exit(1);
    });
}
