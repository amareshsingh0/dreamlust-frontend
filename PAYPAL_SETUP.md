# PayPal Integration Setup Guide

## ✅ Completed Implementation

All PayPal integration features have been implemented:

1. ✅ **Backend Payment Service** - Real PayPal SDK integration
2. ✅ **PayPal Buttons** - Integrated in TipModal with two-step flow
3. ✅ **Payment Confirmation** - Handles payment success/failure
4. ✅ **Webhook Endpoint** - `/api/webhooks/paypal` for payment status updates

## 📋 Environment Variables Required

### Backend (.env)
```env
PAYPAL_CLIENT_ID=AXgc0KXUTYJ3By6z0rZuo... # Your PayPal Client ID
PAYPAL_CLIENT_SECRET=EJ8kM9Xh... # Your PayPal Client Secret
PAYPAL_WEBHOOK_ID=XXXXXXXXXXXX # Your PayPal Webhook ID
FRONTEND_URL=http://localhost:4000 # Your frontend URL
```

### Frontend (.env or .env.local)
```env
VITE_PAYPAL_CLIENT_ID=AXgc0KXUTYJ3By6z0rZuo... # Your PayPal Client ID (same as backend)
```

## 🔧 Setup Steps

### 1. Get PayPal Credentials

You already have these from PayPal Dashboard:
- **Client ID**: `AXgc0KXUTYJ3By6z0rZuo...`
- **Client Secret**: `EJ8kM9Xh...`

### 2. Configure Backend

Add to `backend/.env`:
```env
PAYPAL_CLIENT_ID=AXgc0KXUTYJ3By6z0rZuo...
PAYPAL_CLIENT_SECRET=EJ8kM9Xh...
PAYPAL_WEBHOOK_ID=XXXXXXXXXXXX
FRONTEND_URL=http://localhost:4000
```

### 3. Configure Frontend

Add to `frontend/.env` or `frontend/.env.local`:
```env
VITE_PAYPAL_CLIENT_ID=AXgc0KXUTYJ3By6z0rZuo...
```

### 4. Configure PayPal Webhook

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Webhooks** section
3. Click **Create Webhook**
4. Enter your webhook URL:
   - Development: `http://localhost:3001/api/webhooks/paypal` (Backend runs on port 3001)
   - Production: `https://yourdomain.com/api/webhooks/paypal`
5. Select events to listen to:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
6. Save and copy the **Webhook ID**
7. Add `PAYPAL_WEBHOOK_ID` to your backend `.env`

## 🎯 How It Works

### Payment Flow

1. **User selects amount** → TipModal step 1
2. **User clicks "Continue to Payment"** → Creates tip and PayPal order
3. **PayPal buttons appear** → User clicks PayPal button
4. **User completes PayPal payment** → PayPal processes payment
5. **Payment succeeds** → Webhook updates tip status to 'completed'
6. **Creator receives notification** → Tip appears in earnings dashboard

### Webhook Flow

1. PayPal sends webhook event to `/api/webhooks/paypal`
2. Backend verifies webhook (should add proper signature verification in production)
3. Backend updates tip status based on event:
   - `PAYMENT.CAPTURE.COMPLETED` → Status: 'completed'
   - `PAYMENT.CAPTURE.DENIED` → Status: 'failed'
   - `PAYMENT.CAPTURE.REFUNDED` → Status: 'failed'
4. Creator receives notification (for successful payments)

## 🧪 Testing

### Test Mode (Sandbox)

1. Use PayPal Sandbox accounts:
   - Go to PayPal Developer Dashboard → Sandbox → Accounts
   - Create test buyer and seller accounts
   - Use test buyer account to make payments

2. Test payment flow:
   - Select amount in TipModal
   - Click "Continue to Payment"
   - Click PayPal button
   - Login with test buyer account
   - Complete payment

### Testing Webhooks Locally

Use PayPal webhook simulator or ngrok:

```bash
# Install ngrok
# https://ngrok.com/

# Expose local server
ngrok http 3001

# Use ngrok URL in PayPal webhook configuration
# Example: https://abc123.ngrok.io/api/webhooks/paypal
```

## 📝 Files Modified/Created

### Backend
- `backend/src/lib/payment.ts` - Real PayPal SDK integration
- `backend/src/routes/tips.ts` - Creates PayPal orders
- `backend/src/routes/webhooks.ts` - Handles PayPal webhooks
- `backend/src/server.ts` - Webhook route registration

### Frontend
- `frontend/src/lib/paypal.ts` - PayPal Client ID configuration
- `frontend/src/components/tips/TipModal.tsx` - Two-step payment flow with PayPal buttons
- `frontend/src/lib/api.ts` - Payment confirmation API

## 🚀 Production Checklist

- [ ] Add production PayPal credentials (Live mode)
- [ ] Configure production webhook endpoint in PayPal Dashboard
- [ ] Add proper webhook signature verification
- [ ] Test payment flow end-to-end
- [ ] Test webhook delivery
- [ ] Set up webhook retry handling (PayPal handles this automatically)
- [ ] Monitor webhook logs in PayPal Dashboard
- [ ] Set up error alerts for failed payments

## 🔒 Security Notes

1. **Never expose client secret** in frontend code
2. **Always verify webhook signatures** (add proper verification in production)
3. **Use HTTPS** in production for webhook endpoints
4. **Rate limit** webhook endpoints (already implemented)
5. **Log all payment events** for audit trail

## 📚 Additional Resources

- [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)
- [PayPal React SDK](https://developer.paypal.com/sdk/js/react/)
- [PayPal Webhooks](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Testing](https://developer.paypal.com/docs/api-basics/sandbox/)

## ⚠️ Important Notes

- **Stripe keys are NOT needed** - This implementation uses PayPal only
- **Client ID is safe for frontend** - It's public
- **Client Secret must stay in backend** - Never expose it
- **Webhook ID** is used for webhook verification

