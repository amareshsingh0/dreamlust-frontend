/**
 * Email Service
 * Handles email sending with templates and queue management
 */

import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import * as React from 'react';
import { prisma } from '../prisma';
import { env } from '../../config/env';
import { queueEmailJob } from '../queues/queueManager';
import * as EmailTemplates from './templates';

// Email templates
export const emailTemplates = {
  welcome: {
    subject: 'Welcome to DreamLust!',
    template: 'welcome',
  },
  newUpload: {
    subject: 'New Content Uploaded',
    template: 'newUpload',
  },
  newLike: {
    subject: 'Someone liked your content',
    template: 'newLike',
  },
  newComment: {
    subject: 'New comment on your content',
    template: 'newComment',
  },
  newTip: {
    subject: 'You received a tip!',
    template: 'newTip',
  },
  milestone: {
    subject: 'Congratulations on your milestone!',
    template: 'milestone',
  },
  system: {
    subject: 'System Notification',
    template: 'system',
  },
};

// Create email transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  // Check if email is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('⚠️  Email not configured. SMTP settings missing.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: parseInt(smtpPort) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

/**
 * Render email template using React Email
 */
async function renderTemplate(templateName: string, data: any): Promise<{ html: string; text: string }> {
  const templateMap: Record<string, React.ComponentType<any>> = {
    welcome: EmailTemplates.Welcome,
    newUpload: EmailTemplates.NewUpload,
    newLike: EmailTemplates.NewLike,
    newComment: EmailTemplates.NewComment,
    newTip: EmailTemplates.NewTip,
    // Fallback templates
    milestone: EmailTemplates.Welcome,
    system: EmailTemplates.Welcome,
  };

  const Template = templateMap[templateName] || EmailTemplates.Welcome;

  // Add frontendUrl to all template data
  const templateData = {
    ...data,
    frontendUrl: env.FRONTEND_URL,
  };

  // Render React Email template to HTML
  const html = await render(React.createElement(Template, templateData));
  
  // Extract text version (simple fallback)
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  return { html, text };
}

/**
 * Queue an email to be sent
 */
export async function queueEmailToSend(
  to: string,
  templateName: string,
  data: any,
  subject?: string
): Promise<void> {
  const template = emailTemplates[templateName as keyof typeof emailTemplates];
  if (!template) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  await prisma.emailQueue.create({
    data: {
      to,
      subject: subject || template.subject,
      template: templateName,
      data,
      status: 'pending',
    },
  });

  // Queue for processing
  if (queueEmailJob) {
    await queueEmailJob({ 
      to, 
      template: templateName, 
      data, 
      subject: subject || template.subject 
    });
  }
}

/**
 * Send email directly (synchronous)
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    console.warn('Email transporter not available. Email not sent.');
    return false;
  }

  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Process email from queue
 */
export async function processEmailQueue(emailId: string): Promise<void> {
  const email = await prisma.emailQueue.findUnique({
    where: { id: emailId },
  });

  if (!email || email.status !== 'pending') {
    return;
  }

  try {
    const { html, text } = await renderTemplate(email.template, email.data as any);
    const success = await sendEmail(email.to, email.subject, html, text);

    await prisma.emailQueue.update({
      where: { id: emailId },
      data: {
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : undefined,
        error: success ? null : 'Failed to send email',
        attempts: { increment: 1 },
      },
    });
  } catch (error: any) {
    await prisma.emailQueue.update({
      where: { id: emailId },
      data: {
        status: 'failed',
        error: error.message,
        attempts: { increment: 1 },
      },
    });
    throw error;
  }
}

