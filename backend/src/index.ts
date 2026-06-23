import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import prisma from './lib/prisma.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import categoryRoutes from './routes/category.routes.js';
import tagRoutes from './routes/tag.routes.js';
import locationRoutes from './routes/location.routes.js';
import itemRoutes from './routes/item.routes.js';
import roleRoutes from './routes/role.routes.js';
import groupRoutes from './routes/group.routes.js';
import auditRoutes from './routes/audit.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import templateRoutes from './routes/template.routes.js';
import iconRoutes from './routes/icon.routes.js';
import versionRoutes from './routes/version.routes.js';
import apiKeyRoutes from './routes/apikeys.routes.js';
import publicApiRoutes from './routes/publicapi.routes.js';
import healthRoutes from './routes/health.routes.js';
import deviceRoutes from './routes/device.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import filterRoutes from './routes/filter.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import sessionRoutes from './routes/session.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { generalLimiter, loadRateLimitSettings } from './middleware/rateLimit.middleware.js';
import { initializeScheduler } from './services/scheduler.service.js';
import { loggingService } from './services/logging.service.js';
import { startNginxLogWatcher } from './services/nginx-logs.service.js';

// Initialize logging service FIRST to capture all console output
loggingService.initialize();

dotenv.config();

// Validate required environment variables
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Warn (dev) or exit (prod) on insecure JWT defaults
  const insecureDefaults: Record<string, string[]> = {
    JWT_SECRET: ['warehouse-jwt-secret-change-in-production', 'your-super-secret-jwt-key-change-in-production'],
    JWT_REFRESH_SECRET: ['warehouse-refresh-secret-change-in-production', 'your-refresh-token-secret-change-in-production'],
  };
  const isProd = process.env.NODE_ENV === 'production';
  for (const [key, defaults] of Object.entries(insecureDefaults)) {
    if (defaults.includes(process.env[key] || '')) {
      if (isProd) {
        console.error(`FATAL: ${key} is using an insecure default value in production. Set a strong secret before deploying.`);
        process.exit(1);
      }
      console.warn(`WARNING: ${key} is using an insecure default value. Change it before deploying to production!`);
    }
  }

  if (process.env.NODE_ENV === 'production' && process.env.BIND_ADDRESS === '0.0.0.0') {
    console.warn('WARNING: BIND_ADDRESS is 0.0.0.0 in production. Consider using 127.0.0.1 behind a reverse proxy.');
  }
}

validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;
const BIND_ADDRESS = process.env.BIND_ADDRESS || '0.0.0.0';

// Load trust proxy settings from database
async function configureTrustProxy() {
  try {
    const trustProxySetting = await prisma.setting.findUnique({
      where: { key: 'network.trustProxy' }
    });
    const trustedProxiesSetting = await prisma.setting.findUnique({
      where: { key: 'network.trustedProxies' }
    });

    if (trustProxySetting?.value === 'true') {
      if (trustedProxiesSetting?.value) {
        // Parse comma-separated list of trusted proxies
        const proxies = trustedProxiesSetting.value.split(',').map(p => p.trim()).filter(Boolean);
        if (proxies.length > 0) {
          app.set('trust proxy', proxies);
          console.log(`Trust proxy enabled for: ${proxies.join(', ')}`);
        } else {
          app.set('trust proxy', true);
          console.log('Trust proxy enabled for all proxies');
        }
      } else {
        app.set('trust proxy', true);
        console.log('Trust proxy enabled for all proxies');
      }
    }
  } catch (error) {
    console.log('Could not load proxy settings from database, using defaults');
  }
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled - frontend is served separately
  crossOriginEmbedderPolicy: false, // Allow loading external resources
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL;
const allowedOrigins = frontendUrl
  ? frontendUrl.split(',').map(origin => origin.trim()).filter(Boolean)
  : null;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !allowedOrigins) {
  console.warn('WARNING: FRONTEND_URL is not set. All cross-origin requests will be blocked in production.');
}

app.use(cors({
  origin: (origin, callback) => {
    // Always allow requests with no origin (mobile apps, curl, health probes)
    if (!origin) return callback(null, true);
    // In development, allow all origins
    if (!isProduction) return callback(null, true);
    // In production, require an explicit allowlist
    if (allowedOrigins && allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use(generalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files with security headers
app.use('/uploads', (req, res, next) => {
  // Force SVGs to download instead of rendering in browser (prevents XSS)
  if (req.path.toLowerCase().endsWith('.svg')) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', 'attachment');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/icons', iconRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/v1', publicApiRoutes); // Public API with API key auth
app.use('/api/health', healthRoutes); // Health check endpoints for monitoring
app.use('/api/devices', deviceRoutes); // Device management for mobile apps
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/sessions', sessionRoutes);

// Serve public folder for static assets (swagger theme, etc.)
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// API Documentation (Swagger) - Custom themed to match site
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCssUrl: '/public/swagger-theme.css',
  customSiteTitle: 'Warehouse API Documentation',
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  await configureTrustProxy();
  await loadRateLimitSettings();

  // Initialize background job scheduler
  initializeScheduler();

  // Start nginx log watcher (if configured)
  startNginxLogWatcher();

  app.listen(Number(PORT), BIND_ADDRESS, () => {
    console.log(`Server running on http://${BIND_ADDRESS}:${PORT}`);
  });
}

start().catch(console.error);

export default app;
