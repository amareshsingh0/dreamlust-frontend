# Payment Infrastructure Implementation

## Overview
Implemented comprehensive payment infrastructure using Stripe for subscriptions, tips, purchases, and creator payouts.

## Database Schema Updates

### Transaction Model (Updated)
- Added `stripe_payment_id` field for Stripe payment intent/charge IDs
- Existing fields: `user_id`, `type`, `status`, `amount`, `currency`, `metadata`

### UserSubscription Model (New)
- Stores user payment subscriptions (different from creator subscriptions which are for following)
- Fields: `user_id`, `plan` (basic/premium/creator), `status`, `stripe_subscription_id`, `current_period_start`, `current_period_end`, `cancel_at_period_end`
- Relations: `User` (many-to-one)

### CreatorEarnings Model (New)
- Tracks creator earnings and payouts
- Fields: `creator_id`, `balance`, `lifetime_earnings`, `pending_payout`, `last_payout_at`, `stripe_account_id`
- Relations: `Creator` (one-to-one)

### Creator Model (Updated)
- Added `stripe_account_id` field for Stripe connected accounts
- Added `creator_earnings` relation

### User Model (Updated)
- Added `user_subscriptions` relation

## Stripe Integration (`backend/src/lib/stripe.ts`)

### Functions:
- `createPaymentIntent()` - Create payment intents for one-time payments
- `createSubscription()` - Create recurring subscriptions
- `getOrCreateCustomer()` - Get or create Stripe customer
- `createConnectedAccount()` - Create Stripe Express account for creators
- `createAccountLink()` - Generate onboarding link for creators
- `transferToConnectedAccount()` - Transfer funds to creator accounts
- `cancelSubscription()` - Cancel subscriptions
- `getSubscription()` - Retrieve subscription details
- `getPaymentIntent()` - Retrieve payment intent
- `refundPayment()` - Process refunds
- `verifyWebhookSignature()` - Verify webhook signatures

## API Routes

### Payments (`/api/payments`)

#### POST `/api/payments/intent`
- Create payment intent for tips/purchases
- Returns `clientSecret` for frontend Stripe integration

#### POST `/api/payments/confirm`
- Confirm a payment intent
- Updates transaction status
- Updates creator earnings for tips

#### POST `/api/payments/refund`
- Refund a payment
- Creates refund transaction record

#### GET `/api/payments/transactions`
- Get user's transaction history
- Supports pagination

#### POST `/api/payments/creator/connect`
- Create Stripe connected account for creator payouts
- Returns onboarding URL

#### POST `/api/payments/creator/payout`
- Request payout to creator's Stripe account
- Validates balance and transfers funds

#### GET `/api/payments/creator/earnings`
- Get creator earnings summary
- Returns balance, lifetime earnings, pending payouts

### Subscriptions (`/api/subscriptions`)

#### POST `/api/subscriptions`
- Create a new subscription
- Requires `plan` and `priceId` (Stripe price ID)
- Creates subscription in Stripe and local database

#### GET `/api/subscriptions`
- Get user's active subscriptions

#### GET `/api/subscriptions/:id`
- Get subscription details
- Syncs with Stripe for latest status

#### POST `/api/subscriptions/:id/cancel`
- Cancel a subscription
- Supports cancel at period end or immediate cancellation

## Webhooks (`/api/webhooks/stripe`)

### Handled Events:
- `payment_intent.succeeded` - Update transaction status, update creator earnings
- `payment_intent.payment_failed` - Mark transaction as failed
- `customer.subscription.created` - Create local subscription record
- `customer.subscription.updated` - Update subscription status and period
- `customer.subscription.deleted` - Mark subscription as canceled
- `transfer.created` - Update creator earnings for payouts

## Environment Variables

Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Installation

```bash
cd backend
bun add stripe
```

## Usage Examples

### Create Payment Intent (Tip)
```typescript
POST /api/payments/intent
{
  "amount": 10.00,
  "currency": "usd",
  "metadata": {
    "type": "tip",
    "creatorId": "creator-id"
  }
}
```

### Create Subscription
```typescript
POST /api/subscriptions
{
  "plan": "premium",
  "priceId": "price_1234567890"
}
```

### Connect Creator Account
```typescript
POST /api/payments/creator/connect
// Returns onboardingUrl for Stripe Express onboarding
```

### Request Payout
```typescript
POST /api/payments/creator/payout
{
  "amount": 100.00
}
```

## Features

✅ Stripe payment intents for one-time payments
✅ Recurring subscriptions with Stripe
✅ Creator connected accounts (Stripe Express)
✅ Creator earnings tracking
✅ Payout system for creators
✅ Transaction history
✅ Webhook handling for payment events
✅ Refund support
✅ Subscription management (cancel, update)

## Notes

- Stripe is optional - system works without it (with warnings)
- PayPal integration already exists as alternative
- Creator earnings are automatically updated on successful payments
- Subscriptions sync with Stripe webhooks for real-time updates
- Connected accounts use Stripe Express for simplified onboarding
