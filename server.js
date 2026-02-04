const express = require("express");
const crypto = require("crypto");
const { aggregateDeviceData } = require("./client");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const SECRET_TOKEN = "interview_token_123";
let lastRequestTime = 0;
const MAX_BATCH_SIZE = 10;

// Middleware: Rate Limiter (only for mock API endpoint)
function rateLimiter(req, res, next) {
  const now = Date.now();
  // Allow a tiny buffer (50ms) for network jitter, but strict otherwise
  if (now - lastRequestTime < 950) {
    console.log(
      `[429] Request rejected. Time since last: ${now - lastRequestTime}ms`,
    );
    return res
      .status(429)
      .json({ error: "Too Many Requests. Limit: 1 req/sec." });
  }
  lastRequestTime = now;
  next();
}

// Middleware: Security (Signature Check for mock API)
function securityCheck(req, res, next) {
  const signature = req.headers["signature"];
  const timestamp = req.headers["timestamp"];
  const url = req.originalUrl;

  if (!timestamp || !signature) {
    return res
      .status(401)
      .json({ error: "Missing headers: signature or timestamp" });
  }

  // Expected: MD5( url + token + timestamp )
  const expectedSig = crypto
    .createHash("md5")
    .update(url + SECRET_TOKEN + timestamp)
    .digest("hex");

  if (signature !== expectedSig) {
    console.log(
      `[401] Bad Signature. Got: ${signature}, Expected: ${expectedSig}`,
    );
    return res.status(401).json({ error: "Invalid Signature" });
  }
  next();
}

// Mock API Endpoint (with rate limiting and security)
app.post("/device/real/query", rateLimiter, securityCheck, (req, res) => {
  const { sn_list } = req.body;

  if (!sn_list || !Array.isArray(sn_list)) {
    return res.status(400).json({ error: "sn_list array is required" });
  }
  if (sn_list.length > MAX_BATCH_SIZE) {
    return res
      .status(400)
      .json({ error: `Batch size limit exceeded (Max ${MAX_BATCH_SIZE})` });
  }

  // Simulate processing delay
  const results = sn_list.map((sn) => ({
    sn: sn,
    power: (Math.random() * 5).toFixed(2) + " kW",
    status: Math.random() > 0.1 ? "Online" : "Offline",
    last_updated: new Date().toISOString(),
  }));

  console.log(`[200] Success. Processed ${sn_list.length} devices.`);
  res.json({ data: results });
});

// Client endpoint: Trigger data aggregation for all 500 devices
app.get("/aggregate", async (req, res) => {
  try {
    console.log("\n🎯 Aggregation request received...\n");

    // Run the aggregation (this will take ~50 seconds)
    const result = await aggregateDeviceData("localhost", PORT);

    res.json({
      message: "Data aggregation completed successfully",
      result: result,
    });
  } catch (err) {
    console.error("❌ Aggregation error:", err);
    res.status(500).json({
      error: "Aggregation failed",
      details: err.message,
    });
  }
});

// Root endpoint with usage instructions
app.get("/", (req, res) => {
  res.json({
    message: "EnergyGrid Mock API + Data Aggregator",
    endpoints: {
      "POST /device/real/query":
        "Mock API endpoint (requires signature & timestamp headers)",
      "GET /aggregate":
        "Trigger data aggregation for all 500 devices (~50 seconds)",
      "GET /": "This help message",
    },
    mockApiConstraints: {
      rateLimit: "1 request per second",
      maxBatchSize: 10,
      authToken: "interview_token_123",
    },
  });
});

app.listen(PORT, () => {
  console.log(`⚡ EnergyGrid Mock API running on port ${PORT}`);
  console.log("   Constraints: 1 req/sec, Max 10 items/batch");
  console.log("   Endpoints:");
  console.log("   - POST /device/real/query (Mock API)");
  console.log("   - GET  /aggregate (Client Aggregator)");
  console.log("   - GET  / (Help)");
});
