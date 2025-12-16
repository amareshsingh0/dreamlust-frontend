/**
 * Email Worker
 * Processes emails from the queue
 */

import { Worker, Job } from 'bullmq';
import { processEmailQueue } from '../../email/service';
import { redis } from '../../redis';
import { env } from '../../../config/env';

export interface EmailJob {
  to: string;
  template: string;
  data: any;
  subject: string;
}

/**
 * Create email worker
 */
export function createEmailWorker() {
  if (!env.REDIS_URL) {
    console.warn('⚠️  Redis not available. Email worker will not be created.');
    return null;
  }

  const worker = new Worker<EmailJob>(
    'email',
    async (job) => {
      console.log(`[Email Worker] Processing email job: ${job.id}`);
      
      // Process email directly
      const { prisma } = await import('../../prisma');
      const emails = await prisma.emailQueue.findMany({
        where: {
          to: job.data.to,
          template: job.data.template,
          status: 'pending',
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      });

      if (emails.length > 0) {
        // Process the first pending email
        await processEmailQueue(emails[0].id);
      } else {
        // Create email queue entry if it doesn't exist (shouldn't happen normally)
        const email = await prisma.emailQueue.create({
          data: {
            to: job.data.to,
            subject: job.data.subject,
            template: job.data.template,
            data: job.data.data,
            status: 'pending',
          },
        });
        await processEmailQueue(email.id);
      }
    },
    {
      connection: redis,
      concurrency: 5, // Process 5 emails at a time
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Email Worker] Email job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Email Worker] Email job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[Email Worker] Worker error:', err);
  });

  console.log('✅ Email worker created');
  return worker;
}

