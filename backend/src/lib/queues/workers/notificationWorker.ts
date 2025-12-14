/**
 * Notification Worker
 * Handles sending notification emails and in-app notifications
 */

import { Worker, Job } from 'bullmq';
import { queueNotification } from '../queueManager';
import { prisma } from '../../prisma';
import { env } from '../../../config/env';
import nodemailer from 'nodemailer';

export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * Send notification (email + in-app)
 */
async function sendNotification(job: Job<NotificationJob>) {
  const { userId, type, title, message, link, metadata } = job.data;

  try {
    // Create in-app notification
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: type as any,
        title,
        message,
        link: link || null,
        metadata: metadata || {},
      },
    });

    // Send email notification if user has email notifications enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { user_preferences: true },
    });

    if (user?.user_preferences?.email_notifications) {
      // Only send email for important notifications
      const emailTypes = ['NEW_SUBSCRIBER', 'PAYMENT_RECEIVED', 'CONTENT_APPROVED', 'CONTENT_REJECTED'];
      if (emailTypes.includes(type)) {
        await sendEmailNotification(user.email, title, message, link);
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`Notification sending failed for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  email: string,
  subject: string,
  message: string,
  link?: string
) {
  // Configure email transporter (SMTP)
  // In production, use a service like SendGrid, AWS SES, or Resend
  const smtpPassword = env.SMTP_PASSWORD || env.SMTP_PASS;
  
  if (!env.SMTP_USER || !smtpPassword) {
    console.warn('⚠️  SMTP not configured. Email notifications will be skipped.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: smtpPassword,
    },
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4a90e2;">${subject}</h1>
          <p>${message}</p>
          ${link ? `<a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Details</a>` : ''}
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: env.SMTP_FROM || 'noreply@dreamlust.com',
    to: email,
    subject,
    html,
  });
}

/**
 * Create notification worker
 */
export function createNotificationWorker() {
  const worker = new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      if (job.name === 'send') {
        return await sendNotification(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: {
        host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
        port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
        password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
      },
      concurrency: 10, // Process 10 notifications at a time
      limiter: {
        max: 100,
        duration: 60000, // Max 100 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Notification sent: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Notification failed: ${job?.id}`, err);
  });

  return worker;
}
