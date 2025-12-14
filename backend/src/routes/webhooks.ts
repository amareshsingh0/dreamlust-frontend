import { Router, Request, Response } from 'express';
import express from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

const router = Router();

// PayPal webhook endpoint needs raw body for signature verification
router.use('/paypal', express.raw({ type: 'application/json' }));

// PayPal webhook endpoint
// This should be mounted at /api/webhooks/paypal
// In production, configure PayPal webhook to point to: https://yourdomain.com/api/webhooks/paypal

/**
 * POST /api/webhooks/paypal
 * Handle PayPal webhook events
 */
router.post(
  '/paypal',
  async (req: Request, res: Response) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const webhookBody = req.body.toString();

    if (!webhookId) {
      console.error('Missing PayPal webhook ID');
      return res.status(400).send('Webhook ID not configured');
    }

    // Verify webhook signature (simplified - in production, use PayPal SDK verification)
    const headers = req.headers;
    const transmissionId = headers['paypal-transmission-id'] as string;
    const certUrl = headers['paypal-cert-url'] as string;
    const authAlgo = headers['paypal-auth-algo'] as string;
    const transmissionSig = headers['paypal-transmission-sig'] as string;
    const transmissionTime = headers['paypal-transmission-time'] as string;

    // In production, verify webhook signature using PayPal SDK
    // For now, we'll process the webhook (you should add proper verification)

    try {
      const event = JSON.parse(webhookBody);
      
      // Handle the event
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED': {
          await handlePaymentSuccess(event);
          break;
        }

        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.REFUNDED': {
          await handlePaymentFailure(event);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.event_type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
);

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(event: any) {
  const resource = event.resource;
  const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.order_id;
  const captureId = resource?.id;

  if (!orderId) {
    console.error('No orderId in PayPal webhook event');
    return;
  }

  // Find tip by transactionId (PayPal order ID)
  const tip = await prisma.tip.findFirst({
    where: {
      transactionId: orderId,
      status: 'pending',
    },
    include: {
      toCreator: {
        select: {
          userId: true,
          handle: true,
        },
      },
      fromUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  if (!tip) {
    console.error(`Tip not found for PayPal order: ${orderId}`);
    return;
  }

  // Update tip status to completed
  await prisma.tip.update({
    where: { id: tip.id },
    data: {
      status: 'completed',
      transactionId: captureId || orderId,
    },
  });

  // Create notification for creator
  try {
    await prisma.notification.create({
      data: {
        userId: tip.toCreator.userId,
        type: 'PAYMENT_RECEIVED',
        title: 'Tip Received!',
        message: tip.isAnonymous
          ? `You received a $${tip.amount} ${tip.currency} tip!`
          : `You received a $${tip.amount} ${tip.currency} tip from ${tip.fromUser.displayName || tip.fromUser.username}!`,
        link: `/creator/${tip.toCreator.handle}`,
        metadata: {
          tipId: tip.id,
          amount: tip.amount,
          currency: tip.currency,
          isAnonymous: tip.isAnonymous,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }

  console.log(`Payment succeeded for tip ${tip.id}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(event: any) {
  const resource = event.resource;
  const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.order_id;

  if (!orderId) {
    console.error('No orderId in PayPal webhook event');
    return;
  }

  const tip = await prisma.tip.findFirst({
    where: {
      transactionId: orderId,
      status: 'pending',
    },
  });

  if (tip) {
    await prisma.tip.update({
      where: { id: tip.id },
      data: { status: 'failed' },
    });
    console.log(`Payment failed for tip ${tip.id}`);
  }
}

export default router;

