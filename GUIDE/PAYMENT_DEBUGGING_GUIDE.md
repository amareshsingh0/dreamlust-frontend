# Payment Debugging Guide

## Issue: Payment Screen Not Opening

If the payment screen (Razorpay checkout) is not opening, follow these debugging steps:

### 1. **Check Browser Console**
Open your browser's Developer Tools (F12) and check the Console tab for errors:
- Look for red error messages
- Check if `Razorpay` is available: Type `window.Razorpay` in console
- Check for network errors

### 2. **Check Network Requests**
In Developer Tools → Network tab:
- Look for requests to `/api/tips` (for tips) or `/api/razorpay/create-checkout` (for subscriptions)
- Check if the response contains `paymentOrder` with `key`, `orderId`, and `amount`
- Verify the response status is 200/201

### 3. **Backend Environment Variables**
Ensure these are set in `backend/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_... (or rzp_live_...)
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_BASIC_PLAN_ID=plan_...
RAZORPAY_PREMIUM_PLAN_ID=plan_...
RAZORPAY_PRO_PLAN_ID=plan_...
```

### 4. **For Tips Payment:**
1. Open TipModal
2. Select amount and click "Continue to Payment"
3. Check console for:
   - `Payment order received successfully:` - Should show orderId, amount, hasKey: true
   - `Step changed to payment` - Confirms step transition
   - `Pay button clicked, paymentOrder:` - When clicking pay button
   - `openRazorpayCheckout called` - When opening checkout
   - `Creating Razorpay options:` - Before creating Razorpay instance
   - `razorpay.open() called` - Should open payment modal

### 5. **For Subscriptions:**
1. Go to `/subscription-plans`
2. Click "Upgrade" on a plan
3. Check console for:
   - `Creating Razorpay checkout for plan:`
   - `Razorpay checkout response:`
   - `Redirecting to Razorpay URL:`
4. Should redirect to Razorpay subscription page

### 6. **Common Issues & Fixes:**

#### Issue: "Razorpay key not configured"
**Fix:** Add `RAZORPAY_KEY_ID` to `backend/.env` and restart backend server

#### Issue: "Payment order not received"
**Fix:** Check backend logs for errors in `/api/tips` or `/api/razorpay/create-checkout`

#### Issue: Razorpay script not loading
**Fix:** 
- Check internet connection
- Check browser console for script loading errors
- The script is loaded in `index.html` - verify it's not blocked

#### Issue: Payment modal not opening
**Fix:**
- Check if popup blocker is enabled (disable it)
- Check console for JavaScript errors
- Verify `window.Razorpay` exists: `console.log(window.Razorpay)`

#### Issue: Subscription redirect not working
**Fix:**
- Check if `subscription.short_url` is returned from backend
- Check backend logs for subscription creation errors
- Verify plan IDs are correct in `.env`

### 7. **Test Steps:**

#### Test Tip Payment:
1. Open browser console (F12)
2. Navigate to a creator profile
3. Click "Tip" button
4. Select amount (e.g., ₹10)
5. Click "Continue to Payment"
6. Check console logs
7. Click "Pay with Razorpay"
8. Payment modal should open

#### Test Subscription:
1. Open browser console (F12)
2. Navigate to `/subscription-plans`
3. Click "Upgrade" on Premium plan
4. Check console logs
5. Should redirect to Razorpay subscription page

### 8. **Backend Logs to Check:**
Check your backend server console for:
- `Razorpay subscription created:` - Should show subscription ID and short_url
- Any error messages from Razorpay API
- Database errors when creating subscriptions/tips

### 9. **Quick Fixes:**

1. **Restart Backend Server:**
   ```bash
   cd backend
   bun run dev
   ```

2. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

3. **Check Razorpay Dashboard:**
   - Verify your Razorpay account is active
   - Check if test mode is enabled (for test keys)
   - Verify plan IDs match your dashboard

4. **Verify Script Loading:**
   - Open browser console
   - Type: `typeof window.Razorpay`
   - Should return: `"function"` (not `"undefined"`)

### 10. **Expected Console Output (Success):**

**For Tips:**
```
Payment order received successfully: {orderId: "...", amount: 1000, currency: "INR", hasKey: true, tipId: "..."}
Step changed to payment
Pay button clicked, paymentOrder: {orderId: "...", key: "rzp_...", ...}
openRazorpayCheckout called
Creating Razorpay options: {key: "rzp_...", amount: 1000, ...}
Instantiating Razorpay...
Razorpay instance created, opening checkout...
razorpay.open() called - payment modal should be opening
```

**For Subscriptions:**
```
Creating Razorpay checkout for plan: premium
Razorpay checkout response: {success: true, data: {url: "https://rzp.io/i/..."}}
Redirecting to Razorpay URL: https://rzp.io/i/...
```

---

## Still Not Working?

If after following these steps the payment screen still doesn't open:

1. **Share the console errors** - Copy all red error messages
2. **Share network request details** - Check Network tab for failed requests
3. **Verify backend is running** - Check if backend server is accessible
4. **Check Razorpay credentials** - Verify keys are correct in `.env`
