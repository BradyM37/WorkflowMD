/**
 * Branding API Routes
 * White-label branding for agencies - $50/month upsell feature
 */

import { Router } from 'express';
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { pool } from '../lib/database';
import crypto from 'crypto';

const brandingRouter = Router();

// ============================================================================
// TYPES
// ============================================================================

interface AgencyBranding {
  companyName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

interface ReportSettings {
  includeBranding: boolean;
  customFooterText: string | null;
  hidePoweredBy: boolean;
  emailFromName: string | null;
  reportTitleTemplate: string;
}

// ============================================================================
// BRANDING ENDPOINTS
// ============================================================================

/**
 * GET /api/branding
 * Fetch current branding settings for the location
 */
brandingRouter.get(
  '/',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    logger.info('Fetching branding settings', { locationId, requestId: req.id });
    
    // Get branding
    const brandingResult = await pool.query(`
      SELECT 
        company_name,
        tagline,
        logo_url,
        primary_color,
        secondary_color,
        accent_color
      FROM agency_branding
      WHERE location_id = $1
    `, [locationId]);
    
    // Get report settings
    const settingsResult = await pool.query(`
      SELECT 
        include_branding,
        custom_footer_text,
        hide_powered_by,
        email_from_name,
        report_title_template
      FROM report_settings
      WHERE location_id = $1
    `, [locationId]);
    
    const branding: AgencyBranding = brandingResult.rows[0] ? {
      companyName: brandingResult.rows[0].company_name,
      tagline: brandingResult.rows[0].tagline,
      logoUrl: brandingResult.rows[0].logo_url,
      primaryColor: brandingResult.rows[0].primary_color || '#667eea',
      secondaryColor: brandingResult.rows[0].secondary_color || '#764ba2',
      accentColor: brandingResult.rows[0].accent_color || '#52c41a'
    } : {
      companyName: null,
      tagline: null,
      logoUrl: null,
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#52c41a'
    };
    
    const reportSettings: ReportSettings = settingsResult.rows[0] ? {
      includeBranding: settingsResult.rows[0].include_branding ?? true,
      customFooterText: settingsResult.rows[0].custom_footer_text,
      hidePoweredBy: settingsResult.rows[0].hide_powered_by ?? false,
      emailFromName: settingsResult.rows[0].email_from_name,
      reportTitleTemplate: settingsResult.rows[0].report_title_template || 'Response Time Report'
    } : {
      includeBranding: true,
      customFooterText: null,
      hidePoweredBy: false,
      emailFromName: null,
      reportTitleTemplate: 'Response Time Report'
    };
    
    return ApiResponse.success(res, {
      branding,
      reportSettings
    });
  })
);

/**
 * PUT /api/branding
 * Update branding settings
 */
brandingRouter.put(
  '/',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const { branding, reportSettings } = req.body;
    
    logger.info('Updating branding settings', { locationId, requestId: req.id });
    
    // Validate colors (hex format)
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (branding) {
      if (branding.primaryColor && !hexColorRegex.test(branding.primaryColor)) {
        return ApiResponse.badRequest(res, 'Invalid primary color format. Use hex format like #667eea');
      }
      if (branding.secondaryColor && !hexColorRegex.test(branding.secondaryColor)) {
        return ApiResponse.badRequest(res, 'Invalid secondary color format. Use hex format like #764ba2');
      }
      if (branding.accentColor && !hexColorRegex.test(branding.accentColor)) {
        return ApiResponse.badRequest(res, 'Invalid accent color format. Use hex format like #52c41a');
      }
    }
    
    // Upsert branding
    if (branding) {
      await pool.query(`
        INSERT INTO agency_branding (
          location_id, company_name, tagline, logo_url, 
          primary_color, secondary_color, accent_color
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (location_id) DO UPDATE SET
          company_name = COALESCE(EXCLUDED.company_name, agency_branding.company_name),
          tagline = COALESCE(EXCLUDED.tagline, agency_branding.tagline),
          logo_url = COALESCE(EXCLUDED.logo_url, agency_branding.logo_url),
          primary_color = COALESCE(EXCLUDED.primary_color, agency_branding.primary_color),
          secondary_color = COALESCE(EXCLUDED.secondary_color, agency_branding.secondary_color),
          accent_color = COALESCE(EXCLUDED.accent_color, agency_branding.accent_color)
      `, [
        locationId,
        branding.companyName || null,
        branding.tagline || null,
        branding.logoUrl || null,
        branding.primaryColor || '#667eea',
        branding.secondaryColor || '#764ba2',
        branding.accentColor || '#52c41a'
      ]);
    }
    
    // Upsert report settings
    if (reportSettings) {
      await pool.query(`
        INSERT INTO report_settings (
          location_id, include_branding, custom_footer_text, 
          hide_powered_by, email_from_name, report_title_template
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (location_id) DO UPDATE SET
          include_branding = COALESCE(EXCLUDED.include_branding, report_settings.include_branding),
          custom_footer_text = EXCLUDED.custom_footer_text,
          hide_powered_by = COALESCE(EXCLUDED.hide_powered_by, report_settings.hide_powered_by),
          email_from_name = EXCLUDED.email_from_name,
          report_title_template = COALESCE(EXCLUDED.report_title_template, report_settings.report_title_template)
      `, [
        locationId,
        reportSettings.includeBranding ?? true,
        reportSettings.customFooterText || null,
        reportSettings.hidePoweredBy ?? false,
        reportSettings.emailFromName || null,
        reportSettings.reportTitleTemplate || 'Response Time Report'
      ]);
    }
    
    logger.info('Branding settings updated', { locationId, requestId: req.id });
    
    return ApiResponse.success(res, {
      message: 'Branding settings updated successfully'
    });
  })
);

/**
 * POST /api/branding/logo
 * Upload logo URL (for now, just stores URL - could integrate with S3/Cloudinary later)
 */
brandingRouter.post(
  '/logo',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const { logoUrl } = req.body;
    
    if (!logoUrl) {
      return ApiResponse.badRequest(res, 'Logo URL is required');
    }
    
    // Basic URL validation
    try {
      new URL(logoUrl);
    } catch {
      return ApiResponse.badRequest(res, 'Invalid URL format');
    }
    
    logger.info('Updating logo URL', { locationId, requestId: req.id });
    
    await pool.query(`
      INSERT INTO agency_branding (location_id, logo_url)
      VALUES ($1, $2)
      ON CONFLICT (location_id) DO UPDATE SET
        logo_url = EXCLUDED.logo_url
    `, [locationId, logoUrl]);
    
    return ApiResponse.success(res, {
      message: 'Logo updated successfully',
      logoUrl
    });
  })
);

/**
 * DELETE /api/branding/logo
 * Remove logo
 */
brandingRouter.delete(
  '/logo',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    logger.info('Removing logo', { locationId, requestId: req.id });
    
    await pool.query(`
      UPDATE agency_branding SET logo_url = NULL WHERE location_id = $1
    `, [locationId]);
    
    return ApiResponse.success(res, {
      message: 'Logo removed successfully'
    });
  })
);

// ============================================================================
// SHAREABLE REPORT LINKS
// ============================================================================

/**
 * POST /api/branding/share
 * Create a shareable report link
 */
brandingRouter.post(
  '/share',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const userId = req.userId;
    const { days = 7, expiresInDays = 30 } = req.body;
    
    logger.info('Creating shareable report link', { locationId, days, requestId: req.id });
    
    // Generate unique token
    const shareToken = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    await pool.query(`
      INSERT INTO shared_reports (
        location_id, share_token, report_type, days, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [locationId, shareToken, 'response', days, expiresAt, userId]);
    
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reports/share/${shareToken}`;
    
    logger.info('Shareable link created', { locationId, shareToken: shareToken.substring(0, 8), requestId: req.id });
    
    return ApiResponse.success(res, {
      shareToken,
      shareUrl,
      expiresAt,
      days
    });
  })
);

/**
 * GET /api/branding/shares
 * List all shared report links for this location
 */
brandingRouter.get(
  '/shares',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    const result = await pool.query(`
      SELECT 
        id, share_token, report_type, days, 
        expires_at, view_count, last_viewed_at, created_at
      FROM shared_reports
      WHERE location_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [locationId]);
    
    const shares = result.rows.map(row => ({
      id: row.id,
      shareToken: row.share_token,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reports/share/${row.share_token}`,
      reportType: row.report_type,
      days: row.days,
      expiresAt: row.expires_at,
      viewCount: row.view_count,
      lastViewedAt: row.last_viewed_at,
      createdAt: row.created_at,
      isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false
    }));
    
    return ApiResponse.success(res, { shares });
  })
);

/**
 * DELETE /api/branding/share/:token
 * Revoke a shared report link
 */
brandingRouter.delete(
  '/share/:token',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const { token } = req.params;
    
    logger.info('Revoking shared link', { locationId, token: token.substring(0, 8), requestId: req.id });
    
    const result = await pool.query(`
      DELETE FROM shared_reports 
      WHERE share_token = $1 AND location_id = $2
      RETURNING id
    `, [token, locationId]);
    
    if (result.rowCount === 0) {
      return ApiResponse.notFound(res, 'Shared link not found');
    }
    
    return ApiResponse.success(res, {
      message: 'Shared link revoked successfully'
    });
  })
);

export default brandingRouter;
