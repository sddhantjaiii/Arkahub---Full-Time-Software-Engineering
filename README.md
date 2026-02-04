# EnergyGrid Data Aggregator - Solution

**Author:** Siddhant Jaiswal  
**Live Deployment:** https://arkahub-full-time-software-engineering.onrender.com/

This solution implements a Node.js client application that fetches real-time telemetry from 500 solar inverters through a mock API, respecting strict rate limits and security protocols.

> **Development Note:** This solution was built with assistance from GitHub Copilot powered by Claude Sonnet 4.5 for efficient development and best practices implementation.

## Solution Overview

- **Single Deployment**: Combined mock server + client aggregator
- **On-Demand Execution**: Client runs via HTTP endpoint (`GET /aggregate`)
- **Rate Limiting**: Custom queue implementation with 1 req/sec throttling
- **Batching**: 500 devices split into 50 batches of 10
- **Security**: MD5 signature generation for each request
- **Error Handling**: Retry logic for 429s and network failures

## Architecture

```
server.js        → Mock API + HTTP endpoints
client.js        → Data aggregation logic with rate limiting
package.json     → Dependencies and scripts
```

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Setup and Run

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the server:**
    ```bash
    npm start
    ```

3.  **Verify server is running:**
    You should see:
    ```
    ⚡ EnergyGrid Mock API running on port 3000
       Constraints: 1 req/sec, Max 10 items/batch
       Endpoints:
       - POST /device/real/query (Mock API)
       - GET  /aggregate (Client Aggregator)
       - GET  / (Help)
    ```

4.  **Trigger data aggregation:**
    
    Open a new terminal or browser and call:
    ```bash
    curl http://localhost:3000/aggregate
    ```
    
    Or visit: `http://localhost:3000/aggregate` in your browser

5.  **Expected behavior:**
    - Takes approximately 50 seconds to complete (50 batches × 1 sec rate limit)
    - Fetches data from all 500 devices (SN-000 to SN-499)
    - Returns aggregated JSON report with execution metadata

## Live Demo

🌐 **Deployed Application:** https://arkahub-full-time-software-engineering.onrender.com/

Test the live deployment:
```bash
# View available endpoints
curl https://arkahub-full-time-software-engineering.onrender.com/

# Run full aggregation (takes ~50 seconds)
curl https://arkahub-full-time-software-engineering.onrender.com/aggregate
```

**Note:** First request may take 30-60 seconds on Render free tier due to cold start.

## Alternative: Run Client Standalone

You can also run the client directly:
```bash
node client.js
```

This will execute the aggregation and print results to console.

## Approach & Technical Implementation

### Rate Limiting Strategy
- **Custom Queue**: Sequential processing with `async/await`
- **Throttling**: 1000ms `setTimeout` delay between requests
- **No External Libraries**: All logic implemented natively
- **Calculation**: 500 devices ÷ 10 per batch = 50 requests × 1 sec = ~50 seconds

### Security Implementation
```javascript
// Signature: MD5(URL + Token + Timestamp)
const signature = crypto
  .createHash('md5')
  .update('/device/real/query' + 'interview_token_123' + timestamp)
  .digest('hex');
```

### Error Handling
- **429 Retry**: Exponential backoff with 3 max retries
- **Network Failures**: Automatic retry with 2-second delay
- **Graceful Degradation**: Continues processing even if batches fail
- **Detailed Logging**: Progress tracking for each batch

### Code Structure
- **Modular Design**: Separate API client ([client.js](client.js)) from server ([server.js](server.js))
- **Reusable Functions**: `generateSignature()`, `fetchWithRetry()`, `createBatches()`
- **Clean Separation**: Business logic isolated from HTTP layer

## API Endpoints

### GET `/aggregate`
Triggers data aggregation for all 500 devices.

**Response:**
```json
{
  "message": "Data aggregation completed successfully",
  "result": {
    "success": true,
    "totalDevices": 500,
    "fetchedDevices": 500,
    "failedBatches": 0,
    "executionTimeSeconds": 50.23,
    "data": [ /* 500 device records */ ],
    "errors": []
  }
}
```

### POST `/device/real/query`
Mock API endpoint (used internally by client).

**Headers Required:**
- `timestamp`: Current time in milliseconds
- `signature`: MD5(URL + Token + timestamp)

**Body:**
```json
{
  "sn_list": ["SN-000", "SN-001", ...]
}
```

## Deployment (Render)

This application is deployed on **Render** at:  
🌐 https://arkahub-full-time-software-engineering.onrender.com/

### Deploy Your Own Instance on Render

1. **Push to Git repository** (GitHub/GitLab)
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/your-repo.git
   git branch -M main
   git push -u origin main
   ```

2. **Create new Web Service on Render:**
   - Go to [render.com](https://render.com) and login
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render auto-detects Node.js project

3. **Configuration:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
   - No additional environment variables needed (`PORT` is auto-configured)

4. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - You'll receive a public URL: `https://your-app.onrender.com`

5. **Test your deployment:**
   ```bash
   curl https://your-app.onrender.com/aggregate
   ```

### Deployment Results

**Live Deployment Stats:**
- ✅ All 500 devices fetched successfully
- ✅ 0 failed batches
- ✅ ~49-50 seconds execution time
- ✅ Perfect rate limit compliance

### Local Testing Before Deploy

## Development Tools

This solution was developed using:
- **GitHub Copilot** with **Claude Sonnet 4.5** for AI-assisted coding
- **Visual Studio Code** as the primary IDE
- **Node.js** runtime environment
- **Git** for version control
- **Render** for production deployment

## Author

**Siddhant Jaiswal**
- GitHub: [@sddhantjaiii](https://github.com/sddhantjaiii)
- Repository: [Arkahub---Full-Time-Software-Engineering](https://github.com/sddhantjaiii/Arkahub---Full-Time-Software-Engineering)

---

**Assignment Submission for:** EnergyGrid Data Aggregator Coding Challenge  
**Completion Date:** February 4, 2026
```bash
# Test mock API
curl -X POST http://localhost:3000/device/real/query \
  -H "Content-Type: application/json" \
  -H "signature: $(echo -n '/device/real/queryinterview_token_123'$(date +%s%3N) | md5sum | cut -d' ' -f1)" \
  -H "timestamp: $(date +%s%3N)" \
  -d '{"sn_list": ["SN-000", "SN-001"]}'

# Test aggregation
curl http://localhost:3000/aggregate
```

## Assumptions

- Single deployment architecture (server + client combined)
- Client runs on-demand via HTTP endpoint
- Mock API runs on same server (localhost calls)
- Complete results returned after ~50 seconds (not streamed)
- Production deployment would separate services and use external API

## Dependencies

- **express**: Web server framework
- **crypto**: MD5 signature generation (built-in Node.js)
- **http**: HTTP client for API requests (built-in Node.js)rint results to console.

## API Details

-   **Base URL:** `http://localhost:3000`
-   **Endpoint:** `POST /device/real/query`
-   **Auth Token:** `interview_token_123`

### Security Headers Required
Every request must include:
- `timestamp`: Current time in milliseconds.
- `signature`: `MD5( URL + Token + timestamp )`

### Constraints
- **Rate Limit:** 1 request per second.
- **Batch Size:** Max 10 serial numbers per request.

See `instructions.md` for full details.
