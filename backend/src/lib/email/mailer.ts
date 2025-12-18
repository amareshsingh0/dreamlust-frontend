/**
 * Email Service (Mailer)
 * Handles sending emails using SMTP (nodemailer)
 */

import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import logger from '../logger';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  // Check if SMTP is configured
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || (!env.SMTP_PASSWORD && !env.SMTP_PASS)) {
    logger.warn('⚠️  SMTP not configured. Email sending will be disabled.');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT),
      secure: parseInt(env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD || env.SMTP_PASS,
      },
      // For development/testing with self-signed certificates
      tls: {
        rejectUnauthorized: env.NODE_ENV === 'production',
      },
    });

    logger.info('✅ Email transporter initialized');
    return transporter;
  } catch (error) {
    logger.error('❌ Failed to initialize email transporter:', error);
    return null;
  }
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    return false;
  }

  try {
    await emailTransporter.verify();
    logger.info('✅ Email service verified');
    return true;
  } catch (error) {
    logger.error('❌ Email service verification failed:', error);
    return false;
  }
}

/**
 * Send email
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<boolean> {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    // Fallback to console logging if SMTP not configured
    logger.warn('📧 Email not sent (SMTP not configured):', {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }

  try {
    const info = await emailTransporter.sendMail({
      from: options.from || env.SMTP_FROM || 'noreply@dreamlust.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html: options.html,
    });

    logger.info('✅ Email sent successfully:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });
    return true;
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  username: string
): Promise<boolean> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Dreamlust</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          <p>Hello ${username || 'there'},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #667eea; word-break: break-all; font-size: 14px;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Dreamlust. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset Your Password - Dreamlust',
    html,
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  username: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Dreamlust</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to Dreamlust!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-top: 0;">Hello ${username}!</h2>
          <p>Thank you for joining Dreamlust. We're excited to have you on board!</p>
          <p>Start exploring amazing content and connect with creators from around the world.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${env.FRONTEND_URL}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Get Started</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Dreamlust. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Welcome to Dreamlust!',
    html,
  });
}

