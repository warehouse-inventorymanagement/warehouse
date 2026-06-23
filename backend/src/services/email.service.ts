import nodemailer from 'nodemailer';
import { safeDecrypt, safeEncrypt } from './encryption.service.js';
import { getFrontendUrl } from './settings.service.js';
import prisma from '../lib/prisma.js';
import { loggingService } from './logging.service.js';

let transporter: nodemailer.Transporter | null = null;
let lastConfigHash: string | null = null;

// SMTP Provider presets
export const SMTP_PROVIDERS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
  office365: { host: 'smtp.office365.com', port: 587, secure: false },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false },
  mailgun: { host: 'smtp.mailgun.org', port: 587, secure: false },
  ses: { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false },
  zoho: { host: 'smtp.zoho.com', port: 587, secure: false },
  custom: { host: '', port: 587, secure: false }
};

export type SslMode = 'none' | 'starttls' | 'ssl';

interface SmtpConfig {
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  sslMode: SslMode;
  fromEmail: string;
  fromName: string;
}

/**
 * Get SMTP configuration from database settings
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: 'smtp.'
      }
    }
  });

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  // Check if SMTP is configured (at minimum need host and from email)
  if (!settingsMap['smtp.host'] && !settingsMap['smtp.provider']) {
    return null;
  }

  const provider = settingsMap['smtp.provider'] || 'custom';
  const preset = SMTP_PROVIDERS[provider];

  return {
    provider,
    host: settingsMap['smtp.host'] || preset?.host || '',
    port: parseInt(settingsMap['smtp.port'] || String(preset?.port || 587), 10),
    username: settingsMap['smtp.username'] || '',
    password: settingsMap['smtp.password'] ? safeDecrypt(settingsMap['smtp.password']) : '',
    sslMode: (settingsMap['smtp.sslMode'] as SslMode) || 'starttls',
    fromEmail: settingsMap['smtp.fromEmail'] || '',
    fromName: settingsMap['smtp.fromName'] || 'Warehouse'
  };
}

/**
 * Save SMTP configuration to database
 */
export async function saveSmtpConfig(config: Partial<SmtpConfig>): Promise<void> {
  const updates: { key: string; value: string }[] = [];

  if (config.provider !== undefined) {
    updates.push({ key: 'smtp.provider', value: config.provider });

    // If provider is set and not custom, auto-fill host and port from preset
    if (config.provider !== 'custom' && SMTP_PROVIDERS[config.provider]) {
      const preset = SMTP_PROVIDERS[config.provider];
      if (!config.host) {
        updates.push({ key: 'smtp.host', value: preset.host });
      }
      if (!config.port) {
        updates.push({ key: 'smtp.port', value: String(preset.port) });
      }
    }
  }

  if (config.host !== undefined) {
    updates.push({ key: 'smtp.host', value: config.host });
  }

  if (config.port !== undefined) {
    updates.push({ key: 'smtp.port', value: String(config.port) });
  }

  if (config.username !== undefined) {
    updates.push({ key: 'smtp.username', value: config.username });
  }

  if (config.password !== undefined && config.password !== '••••••••') {
    // Encrypt the password before storing
    const encryptedPassword = safeEncrypt(config.password);
    updates.push({ key: 'smtp.password', value: encryptedPassword || config.password });
  }

  if (config.sslMode !== undefined) {
    updates.push({ key: 'smtp.sslMode', value: config.sslMode });
  }

  if (config.fromEmail !== undefined) {
    updates.push({ key: 'smtp.fromEmail', value: config.fromEmail });
  }

  if (config.fromName !== undefined) {
    updates.push({ key: 'smtp.fromName', value: config.fromName });
  }

  await Promise.all(
    updates.map(({ key, value }) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  // Reset transporter to pick up new settings
  transporter = null;
  lastConfigHash = null;

  loggingService.smtp('info', 'SMTP configuration updated');
}

/**
 * Create a hash of the config for change detection
 */
function getConfigHash(config: SmtpConfig): string {
  return `${config.host}:${config.port}:${config.username}:${config.sslMode}`;
}

/**
 * Get or create the nodemailer transporter
 */
async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const config = await getSmtpConfig();

  if (!config || !config.host) {
    // Fall back to environment variables for backward compatibility
    const envHost = process.env.SMTP_HOST;
    if (!envHost) {
      return null;
    }

    return nodemailer.createTransport({
      host: envHost,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  const configHash = getConfigHash(config);

  // Recreate transporter if config changed
  if (transporter && lastConfigHash === configHash) {
    return transporter;
  }

  // Determine TLS settings based on SSL mode
  let secure = false;
  let requireTls = false;
  let ignoreTls = false;

  switch (config.sslMode) {
    case 'none':
      ignoreTls = true;
      break;
    case 'starttls':
      requireTls = true;
      break;
    case 'ssl':
      secure = true;
      break;
  }

  loggingService.smtp('info', `Creating transporter for ${config.host}:${config.port} (SSL: ${config.sslMode})`);

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: requireTls,
    ignoreTLS: ignoreTls,
    auth: config.username ? {
      user: config.username,
      pass: config.password
    } : undefined
  });

  lastConfigHash = configHash;
  return transporter;
}

/**
 * Check if SMTP is properly configured
 */
export async function isSmtpConfigured(): Promise<boolean> {
  const config = await getSmtpConfig();
  if (config && config.host && config.fromEmail) {
    return true;
  }

  // Fall back to environment variables
  return !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

/**
 * Get the "from" address for emails
 */
async function getFromAddress(): Promise<string> {
  const config = await getSmtpConfig();
  if (config && config.fromEmail) {
    const fromAddress = config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail;
    console.log(`[Email] From address: ${fromAddress}`);
    return fromAddress;
  }
  return process.env.SMTP_FROM || 'Warehouse <noreply@warehouse.local>';
}

/**
 * Send an email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const transport = await getTransporter();
  if (!transport) {
    loggingService.smtp('error', 'SMTP is not configured');
    throw new Error('SMTP is not configured');
  }

  const from = await getFromAddress();

  try {
    loggingService.smtp('info', `Sending email to ${to}: "${subject}"`);
    await transport.sendMail({
      from,
      to,
      subject,
      html
    });
    loggingService.smtp('info', `Email sent successfully to ${to}`);
  } catch (error: any) {
    loggingService.smtp('error', `Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
}

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  resetToken: string
) => {
  const frontendUrl = await getFrontendUrl();
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Password Reset Request</h2>
      <p>Hello ${username},</p>
      <p>We received a request to reset your password for your Warehouse account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="background-color: #3b82f6; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This email was sent by Warehouse Inventory System
      </p>
    </div>
  `;

  try {
    await sendEmail(email, 'Password Reset Request - Warehouse', html);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    // Don't throw - we don't want to reveal email existence
  }
};

/**
 * Test SMTP configuration by sending a test email
 */
export async function sendTestEmail(recipientEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    loggingService.smtp('info', `Testing SMTP configuration, sending to ${recipientEmail}`);

    const transport = await getTransporter();
    if (!transport) {
      loggingService.smtp('error', 'SMTP test failed: not configured');
      return { success: false, message: 'SMTP is not configured' };
    }

    const from = await getFromAddress();

    await transport.sendMail({
      from,
      to: recipientEmail,
      subject: 'Test Email - Warehouse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">SMTP Test Successful</h2>
          <p>This is a test email from your Warehouse Inventory System.</p>
          <p>If you received this email, your SMTP settings are configured correctly.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    });

    loggingService.smtp('info', `Test email sent successfully to ${recipientEmail}`);
    return { success: true, message: 'Test email sent successfully' };
  } catch (error: any) {
    loggingService.smtp('error', `SMTP test failed: ${error.message}`);
    return {
      success: false,
      message: error.message || 'Failed to send test email'
    };
  }
}

/**
 * Get SMTP configuration for display (password masked)
 */
export async function getSmtpConfigForDisplay(): Promise<Record<string, string>> {
  const config = await getSmtpConfig();

  return {
    'smtp.provider': config?.provider || 'custom',
    'smtp.host': config?.host || '',
    'smtp.port': String(config?.port || 587),
    'smtp.username': config?.username || '',
    'smtp.password': config?.password ? '••••••••' : '',
    'smtp.sslMode': config?.sslMode || 'starttls',
    'smtp.fromEmail': config?.fromEmail || '',
    'smtp.fromName': config?.fromName || 'Warehouse'
  };
}
