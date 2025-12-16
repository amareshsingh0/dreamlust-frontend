/**
 * Payment Processing Library
 * PayPal Integration for payments
 */

import paypal from '@paypal/checkout-server-sdk';

export interface PaymentIntent {
  id: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  paymentMethod?: string;
}

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<{ success: boolean; transactionId: string }>;
  refundPayment(transactionId: string, amount?: number): Promise<{ success: boolean }>;
}

/**
 * PayPal Environment Setup
 */
function environment(): paypal.core.PayPalEnvironment {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  } else {
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
  }
}

function client(): paypal.core.PayPalHttpClient {
  return new paypal.core.PayPalHttpClient(environment());
}

/**
 * PayPal Payment Provider
 */
class PayPalProvider implements PaymentProvider {
  private paypalClient: paypal.core.PayPalHttpClient;

  constructor() {
    this.paypalClient = client();
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<PaymentIntent> {
    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
          custom_id: metadata?.tipId || '',
        }],
        application_context: {
          brand_name: 'Dreamlust',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:4001'}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:4001'}/payment/cancel`,
        },
      });

      const order = await this.paypalClient.execute(request);
      const orderId = order.result.id || '';

      // Get approval URL from links
      const approvalUrl = order.result.links?.find((link: any) => link.rel === 'approve')?.href;

      return {
        id: orderId,
        clientSecret: approvalUrl, // For PayPal, we use approval URL instead of client secret
        amount,
        currency,
        status: 'pending',
      };
    } catch (error: any) {
      console.error('PayPal order creation failed:', error);
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<{ success: boolean; transactionId: string }> {
    // For PayPal, paymentIntentId is the order ID
    const orderId = paymentIntentId;
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});

      const capture = await this.paypalClient.execute(request);
      
      if (capture.result.status === 'COMPLETED') {
        const transactionId = capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;
        return {
          success: true,
          transactionId,
        };
      }

      return {
        success: false,
        transactionId: orderId,
      };
    } catch (error: any) {
      console.error('PayPal payment capture failed:', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<{ success: boolean }> {
    try {
      const request = new paypal.payments.CapturesRefundRequest(transactionId);
      
      if (amount) {
        request.requestBody({
          amount: {
            value: amount.toFixed(2),
            currency_code: 'USD',
          },
        });
      } else {
        request.requestBody({});
      }

      await this.paypalClient.execute(request);
      return { success: true };
    } catch (error: any) {
      console.error('PayPal refund failed:', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
}

/**
 * Payment Service Factory
 */
export class PaymentService {
  private provider: PaymentProvider;

  constructor(provider: 'paypal' = 'paypal') {
    const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
    const paypalSecret = process.env.PAYPAL_CLIENT_SECRET || '';

    if (provider === 'paypal' && paypalClientId && paypalSecret) {
      this.provider = new PayPalProvider();
    } else {
      throw new Error('PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET');
    }
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(amount, currency, metadata);
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<{ success: boolean; transactionId: string }> {
    return this.provider.confirmPayment(paymentIntentId, paymentMethodId);
  }

  async refundPayment(transactionId: string, amount?: number): Promise<{ success: boolean }> {
    return this.provider.refundPayment(transactionId, amount);
  }
}

export const paymentService = new PaymentService('paypal');

