/**
 * Email Service
 * Handles sending emails using nodemailer
 */

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
export function initializeEmailService() {
  // Support both EMAIL_ and SMTP_ prefixes for compatibility
  const emailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587');
  const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const emailPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  const emailSecure = (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true';

  if (!emailUser || !emailPassword) {
    console.warn('Email service not configured. SMTP_USER/EMAIL_USER and SMTP_PASSWORD/EMAIL_PASSWORD required.');
    return;
  }

  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailSecure, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  console.log('Email service initialized');
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  try {
    const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@dreamlust.com';
    
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send retention campaign email
 */
export async function sendRetentionEmail(
  to: string,
  username: string,
  campaignType: 'low_engagement' | 'decreased_usage' | 'inactive' | 'payment_issues',
  data?: {
    recommendations?: string[];
    offerCode?: string;
    contentSuggestions?: Array<{ title: string; url: string }>;
  }
): Promise<boolean> {
  const templates = {
    low_engagement: {
      subject: 'We have some great content recommendations for you!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${username},</h2>
          <p>We noticed you haven't been watching much lately. Here are some personalized recommendations just for you:</p>
          ${data?.contentSuggestions ? `
            <ul>
              ${data.contentSuggestions.map(item => `<li><a href="${item.url}">${item.title}</a></li>`).join('')}
            </ul>
          ` : ''}
          <p>We'd love to see you back!</p>
          <p>Best regards,<br>The DreamLust Team</p>
        </div>
      `,
    },
    decreased_usage: {
      subject: "Check out what's new on DreamLust!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${username},</h2>
          <p>We've added some exciting new features and content that you might love:</p>
          <ul>
            <li>New interactive content</li>
            <li>Enhanced video quality</li>
            <li>Personalized recommendations</li>
          </ul>
          <p>Come back and explore what's new!</p>
          <p>Best regards,<br>The DreamLust Team</p>
        </div>
      `,
    },
    inactive: {
      subject: 'We miss you! Special offer inside',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${username},</h2>
          <p>We haven't seen you in a while, and we miss you!</p>
          ${data?.offerCode ? `
            <p>As a special welcome back offer, use code <strong>${data.offerCode}</strong> for 20% off your next subscription.</p>
          ` : ''}
          <p>Come back and catch up on all the great content you've been missing!</p>
          <p>Best regards,<br>The DreamLust Team</p>
        </div>
      `,
    },
    payment_issues: {
      subject: 'Action required: Payment issue with your subscription',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${username},</h2>
          <p>We noticed there was an issue processing your recent payment.</p>
          <p>Please update your payment method to continue enjoying uninterrupted access to DreamLust.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription">Update Payment Method</a></p>
          <p>If you need assistance, please contact our support team.</p>
          <p>Best regards,<br>The DreamLust Team</p>
        </div>
      `,
    },
  };

  const template = templates[campaignType];
  if (!template) {
    console.error(`Unknown campaign type: ${campaignType}`);
    return false;
  }

  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

/**
 * Send generic email
 */
export async function sendGenericEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  return sendEmail({ to, subject, html });
}


