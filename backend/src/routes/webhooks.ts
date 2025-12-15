import { Router, Request, Response } from 'express';
import express from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { verifyWebhookSignature, stripe } from '../lib/stripe';
import { verifyWebhookSignature as verifyRazorpayWebhook, razorpay } from '../lib/razorpay';
import { env } from '../config/env';

const router = Router();

// PayPal webhook endpoint needs raw body for signature verification
router.use('/paypal', express.raw({ type: 'application/json' }));

// Stripe webhook endpoint needs raw body for signature verification
router.use('/stripe', express.raw({ type: 'application/json' }));

// Razorpay webhook endpoint needs raw body for signature verification
router.use('/razorpay', express.raw({ type: 'application/json' }));

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
          : `You received a $${tip.amount} ${tip.currency} tip from ${tip.fromUser.display_name || tip.fromUser.username}!`,
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

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post(
  '/stripe',
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing Stripe webhook signature or secret');
      return res.status(400).send('Webhook signature verification failed');
    }

    if (!stripe) {
      console.error('Stripe is not configured');
      return res.status(500).send('Stripe not configured');
    }

    try {
      // Verify webhook signature
      const event = verifyWebhookSignature(
        req.body,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded': {
          await handleStripePaymentSuccess(event);
          break;
        }

        case 'payment_intent.payment_failed': {
          await handleStripePaymentFailure(event);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          await handleStripeSubscriptionUpdate(event);
          break;
        }

        case 'customer.subscription.deleted': {
          await handleStripeSubscriptionDeleted(event);
          break;
        }

        case 'transfer.created': {
          await handleStripeTransferCreated(event);
          break;
        }

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Error handling Stripe webhook:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
);

/**
 * Handle successful Stripe payment
 */
async function handleStripePaymentSuccess(event: any) {
  const paymentIntent = event.data.object;
  const paymentIntentId = paymentIntent.id;

  // Find transaction
  const transaction = await prisma.transaction.findFirst({
    where: {
      stripe_payment_id: paymentIntentId,
    },
  });

  if (!transaction) {
    console.error(`Transaction not found for payment intent: ${paymentIntentId}`);
    return;
  }

  // Update transaction status
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: 'COMPLETED',
      payment_id: paymentIntent.id,
      receipt_url: paymentIntent.charges?.data[0]?.receipt_url || null,
    },
  });

  // If it's a tip, update creator earnings
  if (transaction.type === 'TIP' && transaction.metadata && typeof transaction.metadata === 'object') {
    const metadata = transaction.metadata as { creatorId?: string };
    if (metadata.creatorId) {
      await prisma.creatorEarnings.upsert({
        where: { creator_id: metadata.creatorId },
        create: {
          creator_id: metadata.creatorId,
          balance: transaction.amount,
          lifetime_earnings: transaction.amount,
        },
        update: {
          balance: { increment: transaction.amount },
          lifetime_earnings: { increment: transaction.amount },
        },
      });
    }
  }

  console.log(`Payment succeeded for transaction ${transaction.id}`);
}

/**
 * Handle failed Stripe payment
 */
async function handleStripePaymentFailure(event: any) {
  const paymentIntent = event.data.object;
  const paymentIntentId = paymentIntent.id;

  const transaction = await prisma.transaction.findFirst({
    where: {
      stripe_payment_id: paymentIntentId,
    },
  });

  if (transaction) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
      },
    });
    console.log(`Payment failed for transaction ${transaction.id}`);
  }
}

/**
 * Handle Stripe subscription update
 */
async function handleStripeSubscriptionUpdate(event: any) {
  const subscription = event.data.object;
  const stripeSubscriptionId = subscription.id;

  const userSubscription = await prisma.userSubscription.findFirst({
    where: {
      stripe_subscription_id: stripeSubscriptionId,
    },
  });

  if (userSubscription) {
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: subscription.status === 'active' ? 'active' : 'canceled',
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
      },
    });
  }
}

/**
 * Handle Stripe subscription deletion
 */
async function handleStripeSubscriptionDeleted(event: any) {
  const subscription = event.data.object;
  const stripeSubscriptionId = subscription.id;

  const userSubscription = await prisma.userSubscription.findFirst({
    where: {
      stripe_subscription_id: stripeSubscriptionId,
    },
  });

  if (userSubscription) {
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'canceled',
      },
    });
  }
}

/**
 * Handle Stripe transfer (creator payout)
 */
async function handleStripeTransferCreated(event: any) {
  const transfer = event.data.object;
  
  // Find transaction by transfer ID
  const transaction = await prisma.transaction.findFirst({
    where: {
      stripe_payment_id: transfer.id,
      type: 'WITHDRAWAL',
    },
  });

  if (transaction && transaction.metadata && typeof transaction.metadata === 'object') {
    const metadata = transaction.metadata as { creatorId?: string };
    if (metadata.creatorId) {
      // Update creator earnings - move from pending to completed
      await prisma.creatorEarnings.update({
        where: { creator_id: metadata.creatorId },
        data: {
          pending_payout: { decrement: transaction.amount },
        },
      });
    }
  }
}

/**
 * POST /api/webhooks/razorpay
 * Handle Razorpay webhook events
 */
router.post(
  '/razorpay',
  async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error('Missing Razorpay webhook signature or secret');
      return res.status(400).send('Webhook signature verification failed');
    }

    if (!razorpay) {
      console.error('Razorpay is not configured');
      return res.status(500).send('Razorpay not configured');
    }

    try {
      const payload = req.body.toString();
      
      // Verify webhook signature
      const isValid = verifyRazorpayWebhook(payload, signature);

      if (!isValid) {
        console.error('Invalid Razorpay webhook signature');
        return res.status(400).send('Invalid webhook signature');
      }

      const event = JSON.parse(payload);

      // Handle the event
      switch (event.event) {
        case 'subscription.activated':
        case 'subscription.charged': {
          const subscription = event.payload.subscription.entity;
          await activateSubscription(
            subscription.notes?.userId,
            subscription.notes?.plan,
            subscription.id
          );
          break;
        }

        case 'subscription.cancelled': {
          const subscription = event.payload.subscription.entity;
          await deactivateSubscription(subscription.id);
          break;
        }

        case 'payment.failed': {
          await handleRazorpayPaymentFailed(event);
          break;
        }

        case 'payment.captured': {
          await handleRazorpayPaymentCaptured(event);
          break;
        }

        case 'subscription.paused': {
          const subscription = event.payload.subscription.entity;
          await deactivateSubscription(subscription.id);
          break;
        }

        case 'subscription.resumed': {
          await handleRazorpaySubscriptionResumed(event);
          break;
        }

        default:
          console.log(`Unhandled Razorpay event type: ${event.event}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Error handling Razorpay webhook:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
);

/**
 * Activate subscription (helper function)
 */
async function activateSubscription(
  userId: string | undefined,
  planId: string | undefined,
  subscriptionId: string
) {
  if (!userId || !planId) {
    console.error('Missing userId or planId in subscription notes');
    return;
  }

  if (!razorpay) {
    console.error('Razorpay is not configured');
    return;
  }

  try {
    // Get subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Check if subscription already exists
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        razorpay_subscription_id: subscriptionId,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      await prisma.userSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: subscription.status === 'active' ? 'active' : 'canceled',
          current_period_start: subscription.current_start
            ? new Date(subscription.current_start * 1000)
            : existingSubscription.current_period_start,
          current_period_end: subscription.current_end
            ? new Date(subscription.current_end * 1000)
            : existingSubscription.current_period_end,
        },
      });
      console.log(`Subscription updated: ${subscriptionId}`);
    } else {
      // Create new subscription record
      await prisma.userSubscription.create({
        data: {
          user_id: userId,
          plan: planId,
          status: subscription.status === 'active' ? 'active' : 'canceled',
          razorpay_subscription_id: subscriptionId,
          current_period_start: subscription.current_start
            ? new Date(subscription.current_start * 1000)
            : new Date(),
          current_period_end: subscription.current_end
            ? new Date(subscription.current_end * 1000)
            : new Date(),
          cancel_at_period_end: false,
        },
      });

      // Create transaction record
      // Get plan price from configuration
      const { getPlanById } = await import('../lib/plans');
      const planConfig = getPlanById(planId);
      const amount = planConfig?.price || 0;

      if (amount > 0) {
        await prisma.transaction.create({
          data: {
            user_id: userId,
            type: 'SUBSCRIPTION',
            amount: amount,
            currency: planConfig?.currency || 'INR',
            status: subscription.status === 'active' ? 'COMPLETED' : 'PENDING',
            razorpay_payment_id: subscriptionId,
            metadata: {
              subscriptionId: subscriptionId,
              plan: planId,
            },
          },
        });
      }

      console.log(`Subscription activated for user ${userId}, plan ${planId}`);
    }
  } catch (error: any) {
    console.error('Error activating subscription:', error);
  }
}

/**
 * Deactivate subscription (helper function)
 */
async function deactivateSubscription(subscriptionId: string) {
  const userSubscription = await prisma.userSubscription.findFirst({
    where: {
      razorpay_subscription_id: subscriptionId,
    },
  });

  if (userSubscription) {
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'canceled',
      },
    });
    console.log(`Subscription deactivated: ${subscriptionId}`);
  } else {
    console.error(`Subscription not found: ${subscriptionId}`);
  }
}

/**
 * Handle failed payment (helper function)
 */
async function handleFailedPayment(payment: any) {
  const orderId = payment.order_id;

  // Find transaction by order ID
  const transaction = await prisma.transaction.findFirst({
    where: {
      razorpay_payment_id: orderId,
    },
  });

  if (transaction) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
      },
    });

    // If it's a subscription payment, deactivate subscription
    if (transaction.type === 'SUBSCRIPTION' && transaction.metadata && typeof transaction.metadata === 'object') {
      const metadata = transaction.metadata as { subscriptionId?: string };
      if (metadata.subscriptionId) {
        await deactivateSubscription(metadata.subscriptionId);
      }
    }

    // Create notification for user
    try {
      await prisma.notification.create({
        data: {
          user_id: transaction.user_id,
          type: 'PAYMENT_FAILED',
          title: 'Payment Failed',
          message: `Your payment of ${transaction.currency} ${transaction.amount} failed. Please update your payment method.`,
          link: '/subscription-plans',
          metadata: {
            transactionId: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency,
          },
        },
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }

    console.log(`Payment failed for transaction ${transaction.id}`);
  }
}

/**
 * Handle Razorpay payment captured
 */
async function handleRazorpayPaymentCaptured(event: any) {
  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;

  // Find transaction by order ID
  const transaction = await prisma.transaction.findFirst({
    where: {
      razorpay_payment_id: orderId,
    },
  });

  if (!transaction) {
    console.error(`Transaction not found for order: ${orderId}`);
    return;
  }

  // Update transaction status
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: 'COMPLETED',
      razorpay_payment_id: payment.id,
      payment_id: payment.id,
      receipt_url: payment.receipt || null,
    },
  });

  // If it's a tip, update creator earnings
  if (transaction.type === 'TIP' && transaction.metadata && typeof transaction.metadata === 'object') {
    const metadata = transaction.metadata as { creatorId?: string };
    if (metadata.creatorId) {
      await prisma.creatorEarnings.upsert({
        where: { creator_id: metadata.creatorId },
        create: {
          creator_id: metadata.creatorId,
          balance: transaction.amount,
          lifetime_earnings: transaction.amount,
        },
        update: {
          balance: { increment: transaction.amount },
          lifetime_earnings: { increment: transaction.amount },
        },
      });
    }
  }

  console.log(`Payment captured for transaction ${transaction.id}`);
}

/**
 * Handle Razorpay subscription resumed
 */
async function handleRazorpaySubscriptionResumed(event: any) {
  const subscription = event.payload.subscription.entity;
  const subscriptionId = subscription.id;

  const userSubscription = await prisma.userSubscription.findFirst({
    where: {
      razorpay_subscription_id: subscriptionId,
    },
  });

  if (userSubscription) {
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'active',
        current_period_start: subscription.current_start
          ? new Date(subscription.current_start * 1000)
          : userSubscription.current_period_start,
        current_period_end: subscription.current_end
          ? new Date(subscription.current_end * 1000)
          : userSubscription.current_period_end,
      },
    });
    console.log(`Subscription resumed: ${subscriptionId}`);
  }
}

/**
 * Handle Razorpay payment failed
 */
async function handleRazorpayPaymentFailed(event: any) {
  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;

  // Find transaction by order ID
  const transaction = await prisma.transaction.findFirst({
    where: {
      razorpay_payment_id: orderId,
    },
  });

  if (!transaction) {
    console.error(`Transaction not found for failed payment order: ${orderId}`);
    return;
  }

  // Update transaction status
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: 'FAILED',
      razorpay_payment_id: payment.id,
      payment_id: payment.id,
    },
  });

  // If it's a tip, update tip status
  if (transaction.type === 'TIP' && transaction.metadata && typeof transaction.metadata === 'object') {
    const metadata = transaction.metadata as { tipId?: string };
    if (metadata.tipId) {
      await prisma.tip.update({
        where: { id: metadata.tipId },
        data: { status: 'failed' },
      });
    }
  }

  // If it's a payout, revert the balance change
  if (transaction.type === 'WITHDRAWAL') {
    await prisma.creatorEarnings.update({
      where: { creator_id: transaction.metadata?.creatorId as string },
      data: {
        balance: { increment: transaction.amount },
        pending_payout: { decrement: transaction.amount },
      },
    });
  }

  // Create notification for user
  try {
    await prisma.notification.create({
      data: {
        user_id: transaction.user_id,
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: `Your payment of ${transaction.currency} ${transaction.amount} failed. Please update your payment method.`,
        link: '/subscription-plans',
        metadata: {
          transactionId: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }

  console.log(`Payment failed for transaction ${transaction.id}`);
}

export default router;

