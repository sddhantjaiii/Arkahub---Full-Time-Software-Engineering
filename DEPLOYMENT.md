# Railway Deployment Guide

## Quick Deploy to Railway

### Option 1: Deploy via GitHub (Recommended)

1. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/energygrid-aggregator.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js and deploy

3. **Access your deployment:**
   - Railway will provide a public URL (e.g., `https://your-app.up.railway.app`)
   - Test endpoints:
     - `GET /` - Help and endpoint list
     - `GET /aggregate` - Run full aggregation (~50 seconds)
     - `POST /device/real/query` - Mock API endpoint

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Generate public domain:**
   ```bash
   railway domain
   ```

## Environment Configuration

Railway automatically sets:
- `PORT` - Dynamic port assignment (already configured in server.js)

No additional environment variables needed!

## Testing Your Deployment

```bash
# Test help endpoint
curl https://your-app.up.railway.app/

# Run aggregation (takes ~50 seconds)
curl https://your-app.up.railway.app/aggregate

# View logs
railway logs
```

## Expected Behavior

- Server starts on Railway-assigned port
- `/aggregate` endpoint takes approximately 50 seconds
- Returns JSON with 500 device records
- All rate limiting and signature authentication working

## Monitoring

- View logs: `railway logs` or in Railway dashboard
- Check metrics: Railway dashboard shows CPU, memory, network usage
- Each `/aggregate` call processes 50 API requests over 50 seconds

## Cost Considerations

- Railway offers $5 free credit monthly
- This app uses minimal resources
- Each aggregation call takes 50 seconds of compute time
- Consider adding caching or scheduled jobs for production use

## Troubleshooting

**Server not starting:**
- Check Railway logs for errors
- Ensure `package.json` has correct `start` script
- Verify `process.env.PORT` is used

**Aggregation fails:**
- Check if both server and client are on same instance (they are)
- Verify no firewall blocking localhost calls
- Check logs for specific error messages

**Timeout errors:**
- Default HTTP timeouts may be < 50 seconds
- Increase client timeout to 120+ seconds
- Consider implementing streaming responses for production
