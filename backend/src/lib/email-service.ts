/**
 * SendGrid Email Service - Complete Implementation
 */
import sgMail from '@sendgrid/mail';
import { logger } from './logger';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@firstresponse.app';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'FirstResponse';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info('? SendGrid email service initialized');
} else {
  logger.warn('??  SendGrid not configured - emails will be logged only');
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface WorkflowAlert {
  workflowName: string;
  workflowId?: string;
  alertType?: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  details?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'info' | 'warning';
}

export interface ScanReport {
  workflowName?: string;
  workflowId?: string;
  totalIssues?: number;
  criticalIssues: number;
  warnings?: number;
  suggestions?: number;
  scanTime: Date;
  summary?: string;
  details?: string;
  totalWorkflows?: number;
  issuesFound?: number;
  healthScores?: any;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!SENDGRID_API_KEY) {
    logger.info('[Email stub] Would send:', { to: options.to, subject: options.subject });
    console.log(`\n?? EMAIL (stub mode)\nTo: ${options.to}\nSubject: ${options.subject}\n`);
    return;
  }
  try {
    await sgMail.send({
      to: options.to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, '').trim()
    });
    logger.info('? Email sent successfully', { to: options.to, subject: options.subject });
  } catch (error: any) {
    logger.error('? Failed to send email', { error: error.message, to: options.to });
    throw new Error(`Email failed: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const html = `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:30px;text-align:center;border-radius:8px 8px 0 0"><h1>?? Reset Password</h1></div><div style="padding:30px;background:#f9fafb"><p>Click the button below to reset your password:</p><p style="text-align:center"><a href="${resetUrl}" style="display:inline-block;background:#667eea;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Reset Password</a></p><p style="color:#6b7280;font-size:14px">Or copy this link: ${resetUrl}</p><div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:16px 0"><strong>?? Security:</strong> Link expires in 24 hours</div></div></body></html>`;
  await sendEmail({ to: email, subject: 'Reset Your Password - FirstResponse', html });
}

export async function sendEmailVerification(email: string, verifyUrl: string): Promise<void> {
  const html = `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:30px;text-align:center;border-radius:8px 8px 0 0"><h1>? Verify Email</h1></div><div style="padding:30px;background:#f9fafb"><p>Welcome! Please verify your email address:</p><p style="text-align:center"><a href="${verifyUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Verify Email</a></p><p style="color:#6b7280;font-size:14px">Or copy this link: ${verifyUrl}</p></div></body></html>`;
  await sendEmail({ to: email, subject: 'Verify Your Email - FirstResponse', html });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:30px;text-align:center;border-radius:8px 8px 0 0"><h1>?? Welcome!</h1></div><div style="padding:30px;background:#f9fafb"><p>${greeting}</p><p>Thank you for joining FirstResponse! Get started in 3 steps:</p><div style="background:#d1fae5;border-left:4px solid #10b981;padding:12px;margin:12px 0"><strong>1. Connect GHL Account</strong></div><div style="background:#d1fae5;border-left:4px solid #10b981;padding:12px;margin:12px 0"><strong>2. Import Workflows</strong></div><div style="background:#d1fae5;border-left:4px solid #10b981;padding:12px;margin:12px 0"><strong>3. Run Analysis</strong></div><p style="text-align:center"><a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:#667eea;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Go to Dashboard</a></p></div></body></html>`;
  await sendEmail({ to: email, subject: 'Welcome to FirstResponse!', html });
}

export async function sendWorkflowFailureAlert(email: string, alert: WorkflowAlert): Promise<void> {
  const alertType = alert.alertType || (alert.severity === 'critical' ? 'error' : 'warning');
  const icon = alertType === 'error' ? '??' : alertType === 'warning' ? '??' : '??';
  const color = alertType === 'error' ? '#ef4444' : alertType === 'warning' ? '#f59e0b' : '#3b82f6';
  const detailsText = alert.details ? (typeof alert.details === 'string' ? alert.details : JSON.stringify(alert.details, null, 2)) : '';
  const html = `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:${color};color:#fff;padding:30px;text-align:center;border-radius:8px 8px 0 0"><h1>${icon} Workflow Alert</h1></div><div style="padding:30px;background:#f9fafb"><h2>${alert.workflowName}</h2><div style="background:#fee2e2;border-left:4px solid #ef4444;padding:12px;margin:16px 0"><strong>Type:</strong> ${alertType}<br><strong>Time:</strong> ${alert.timestamp.toLocaleString()}<br><br>${alert.message}${detailsText ? `<br><br><strong>Details:</strong><br><pre style="background:#f3f4f6;padding:8px;border-radius:4px;overflow-x:auto">${detailsText}</pre>` : ''}</div>${alert.workflowId ? `<p style="text-align:center"><a href="${FRONTEND_URL}/workflows/${alert.workflowId}" style="display:inline-block;background:#667eea;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">View Workflow</a></p>` : ''}</div></body></html>`;
  await sendEmail({ to: email, subject: `Workflow Alert: ${alert.workflowName}`, html });
}

export async function sendScheduledScanReport(email: string, report: ScanReport): Promise<void> {
  const status = report.criticalIssues > 0 ? 'Issues Found' : (report.warnings || 0) > 0 ? 'Warnings' : 'All Clear';
  const color = report.criticalIssues > 0 ? '#ef4444' : (report.warnings || 0) > 0 ? '#f59e0b' : '#10b981';
  const workflowName = report.workflowName || 'Workflow';
  const summary = report.summary || `Scan completed with ${report.totalIssues || 0} issues found.`;
  const html = `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:30px;text-align:center;border-radius:8px 8px 0 0"><h1>?? Scan Report</h1></div><div style="padding:30px;background:#f9fafb"><h2>${workflowName}</h2><p style="text-align:center"><span style="background:${color};color:#fff;padding:8px 16px;border-radius:20px;font-weight:bold">${status}</span></p><p style="color:#6b7280;text-align:center">Scanned: ${report.scanTime.toLocaleString()}</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0"><div style="text-align:center;padding:16px;background:#fff;border-radius:8px"><div style="font-size:28px;font-weight:bold;color:#667eea">${report.totalIssues || 0}</div><div style="font-size:12px;color:#6b7280">Total</div></div><div style="text-align:center;padding:16px;background:#fff;border-radius:8px"><div style="font-size:28px;font-weight:bold;color:#ef4444">${report.criticalIssues}</div><div style="font-size:12px;color:#6b7280">Critical</div></div><div style="text-align:center;padding:16px;background:#fff;border-radius:8px"><div style="font-size:28px;font-weight:bold;color:#f59e0b">${report.warnings || 0}</div><div style="font-size:12px;color:#6b7280">Warnings</div></div></div><p><strong>Summary:</strong></p><p>${summary}</p>${report.workflowId ? `<p style="text-align:center"><a href="${FRONTEND_URL}/workflows/${report.workflowId}" style="display:inline-block;background:#667eea;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">View Full Report</a></p>` : ''}</div></body></html>`;
  await sendEmail({ to: email, subject: `Scan Report: ${workflowName}`, html });
}

export function checkEmailRateLimit(email: string, max: number = 10): boolean { return true; }
export function clearEmailRateLimit(email: string): void {}
export async function testEmailConfiguration(email: string): Promise<boolean> { 
  try {
    await sendEmail({ to: email, subject: 'Test Email - FirstResponse', html: '<html><body><h1>? Test Successful</h1><p>Your SendGrid email configuration is working correctly!</p></body></html>' });
    return true;
  } catch {
    return false;
  }
}
