/**
 * Public Share Routes
 * Client-shareable report links - NO AUTH REQUIRED
 */

import { Router } from 'express';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { pool } from '../lib/database';
import { fetchReportData } from '../lib/response-report-pdf';

const shareRouter = Router();

/**
 * GET /api/reports/share/:token
 * Public endpoint - view shared report (no auth)
 */
shareRouter.get(
  '/share/:token',
  asyncHandler(async (req: any, res: any) => {
    const { token } = req.params;
    
    logger.info('Accessing shared report', { token: token.substring(0, 8) });
    
    // Find the shared report
    const result = await pool.query(`
      SELECT 
        sr.location_id,
        sr.report_type,
        sr.days,
        sr.expires_at,
        sr.view_count,
        sr.cached_data,
        sr.cached_at,
        ab.company_name,
        ab.tagline,
        ab.logo_url,
        ab.primary_color,
        ab.secondary_color,
        ab.accent_color,
        rs.custom_footer_text,
        rs.hide_powered_by,
        rs.report_title_template,
        gl.name as location_name
      FROM shared_reports sr
      LEFT JOIN agency_branding ab ON sr.location_id = ab.location_id
      LEFT JOIN report_settings rs ON sr.location_id = rs.location_id
      LEFT JOIN ghl_locations gl ON sr.location_id = gl.location_id
      WHERE sr.share_token = $1
    `, [token]);
    
    if (result.rows.length === 0) {
      return ApiResponse.notFound(res, 'Report not found or link has been revoked');
    }
    
    const share = result.rows[0];
    
    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return ApiResponse.forbidden(res, 'This report link has expired');
    }
    
    // Update view count
    await pool.query(`
      UPDATE shared_reports 
      SET view_count = view_count + 1, last_viewed_at = NOW()
      WHERE share_token = $1
    `, [token]);
    
    // Get report data (use cached if available and fresh)
    let reportData;
    const cacheMaxAge = 15 * 60 * 1000; // 15 minutes
    
    if (share.cached_data && share.cached_at && 
        (Date.now() - new Date(share.cached_at).getTime()) < cacheMaxAge) {
      reportData = share.cached_data;
    } else {
      // Fetch fresh data
      reportData = await fetchReportData(share.location_id, share.days);
      
      // Cache it
      await pool.query(`
        UPDATE shared_reports 
        SET cached_data = $1, cached_at = NOW()
        WHERE share_token = $2
      `, [JSON.stringify(reportData), token]);
    }
    
    // Build branding info
    const branding = {
      companyName: share.company_name || share.location_name || 'Company',
      tagline: share.tagline,
      logoUrl: share.logo_url,
      primaryColor: share.primary_color || '#667eea',
      secondaryColor: share.secondary_color || '#764ba2',
      accentColor: share.accent_color || '#52c41a',
      customFooterText: share.custom_footer_text,
      hidePoweredBy: share.hide_powered_by || false,
      reportTitle: share.report_title_template || 'Response Time Report'
    };
    
    return ApiResponse.success(res, {
      reportData,
      branding,
      meta: {
        days: share.days,
        generatedAt: new Date().toISOString(),
        viewCount: share.view_count + 1
      }
    });
  })
);

/**
 * GET /api/reports/share/:token/pdf
 * Public endpoint - download shared report as PDF (no auth)
 */
shareRouter.get(
  '/share/:token/pdf',
  asyncHandler(async (req: any, res: any) => {
    const { token } = req.params;
    
    logger.info('Downloading shared report PDF', { token: token.substring(0, 8) });
    
    // Verify the share exists and isn't expired
    const result = await pool.query(`
      SELECT 
        sr.location_id,
        sr.days,
        sr.expires_at,
        ab.company_name,
        ab.logo_url,
        ab.primary_color,
        ab.secondary_color,
        rs.custom_footer_text,
        rs.hide_powered_by,
        gl.name as location_name
      FROM shared_reports sr
      LEFT JOIN agency_branding ab ON sr.location_id = ab.location_id
      LEFT JOIN report_settings rs ON sr.location_id = rs.location_id
      LEFT JOIN ghl_locations gl ON sr.location_id = gl.location_id
      WHERE sr.share_token = $1
    `, [token]);
    
    if (result.rows.length === 0) {
      return ApiResponse.notFound(res, 'Report not found');
    }
    
    const share = result.rows[0];
    
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return ApiResponse.forbidden(res, 'This report link has expired');
    }
    
    // Import the branded PDF generator
    const { generateBrandedResponseReportPDF } = await import('../lib/response-report-pdf');
    
    const brandingOptions = {
      companyName: share.company_name,
      logoUrl: share.logo_url,
      primaryColor: share.primary_color || '#667eea',
      secondaryColor: share.secondary_color || '#764ba2',
      customFooterText: share.custom_footer_text,
      hidePoweredBy: share.hide_powered_by || false
    };
    
    const pdfBuffer = await generateBrandedResponseReportPDF(
      share.location_id, 
      share.days,
      brandingOptions
    );
    
    // Update view count
    await pool.query(`
      UPDATE shared_reports 
      SET view_count = view_count + 1, last_viewed_at = NOW()
      WHERE share_token = $1
    `, [token]);
    
    const companyName = share.company_name || share.location_name || 'Report';
    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Response_Report_${safeCompanyName}_${share.days}days_${dateStr}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  })
);

export default shareRouter;
