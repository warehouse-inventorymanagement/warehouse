/**
 * Version routes - check for updates
 */

import { Router, Response } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { getCurrentVersion, checkForUpdates } from '../services/update.service.js';

const router = Router();

/**
 * GET /api/version
 * Get current application version (public)
 */
router.get('/', (req, res: Response) => {
  const version = getCurrentVersion();
  res.json({
    success: true,
    data: {
      version,
      name: 'Warehouse',
      repository: process.env.GITHUB_REPO || 'manjotsc/warehouse'
    }
  });
});

/**
 * GET /api/version/check
 * Check for updates (requires authentication)
 */
router.get('/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const forceRefresh = req.query.force === 'true';
    const updateInfo = await checkForUpdates(forceRefresh);

    res.json({
      success: true,
      data: updateInfo
    });
  } catch (error: any) {
    console.error('[Version] Update check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check for updates'
    });
  }
});

/**
 * GET /api/version/dependencies
 * Get installed npm dependencies for frontend and backend
 */
router.get('/dependencies', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const backendRoot = join(__dirname, '..', '..');
    const frontendRoot = join(backendRoot, '..', 'frontend');

    const readDeps = (pkgPath: string) => {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        return {
          dependencies: pkg.dependencies || {},
          devDependencies: pkg.devDependencies || {},
        };
      } catch {
        return { dependencies: {}, devDependencies: {} };
      }
    };

    const backend = readDeps(join(backendRoot, 'package.json'));
    const frontend = readDeps(join(frontendRoot, 'package.json'));

    res.json({
      success: true,
      data: { backend, frontend },
    });
  } catch (error: any) {
    console.error('[Version] Dependencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read dependencies',
    });
  }
});

export default router;
