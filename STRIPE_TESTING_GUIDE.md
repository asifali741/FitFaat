# Stripe Premium Payment - Complete Testing Guide

## ✅ STATUS: READY TO TEST NOW!

**Backend is running** ✅ 
**Frontend is ready** ✅ 
**Database configured** ✅ 
**Stripe keys loaded** ✅ 

---

## 🚀 QUICK START - Test Right Now!

### Step 1: Your Backend is Already Running ✅

Check terminal 1:
```
Server running on port 5001
MongoDB Connected
Socket.io initialized for real-time chat
```

### Step 2: Your Frontend is Running ✅

Check the Expo app on your emulator/device

### Step 3: Navigate to Premium

In the app:
1. Go to **Settings** (bottom right)
2. Click **Premium** (in Account section)
3. You should see Premium benefits

### Step 4: Test Payment

**Click "Upgrade to Premium"** and enter test card:

| Field | Test Value |
|-------|-----------|
| **Cardholder Name** | John Doe |
| **Card Number** | 4242 4242 4242 4242 |
| **Expiry (MM/YY)** | 12/25 |
| **CVC** | 123 |

**Click "Pay $10.00"**

### Step 5: Expected Result

✅ See message: **"You are now a Premium Member!"**
✅ Premium status shows as **"Active"**
✅ Can see **"Cancel Premium"** button
✅ All premium features become available

---

## 🔍 What's Working Now

| Component | Status | Details |
|-----------|--------|---------|
| Backend Server | ✅ Running | Port 5001 |
| Database | ✅ Connected | MongoDB |
| Frontend App | ✅ Running | With Premium screen |
| Payment Routes | ✅ Active | 5 endpoints ready |
| Test Cards | ✅ Ready | Stripe test keys loaded |
| Error Handling | ✅ Improved | Detailed logging enabled |

---

## 🧪 Debug Info - If Something Fails

### Check Backend Logs
Terminal shows:
```
POST /api/payment/create-payment-intent 200
POST /api/payment/confirm-payment 200
```

### Check App Console
App logs will show:
```
Starting payment with API_URL: http://10.0.2.2:5001
Token available: true
Step 1: Creating payment intent...
Payment intent response status: 200
Step 2: Confirming payment...
Confirm response status: 200
```

### If "Network request failed"
This means backend not connected. Fix:
1. ✅ Backend running? Check terminal
2. ✅ Port 5001 open? Check backend output
3. ✅ MongoDB running? Check connection logs

---

## ✅ Test Scenarios

### Scenario 1: Successful Payment ✅
- Card: **4242 4242 4242 4242**
- Expected: ✅ Payment succeeds
- User becomes premium
- Database updated

### Scenario 2: Declined Card ❌
- Card: **4000 0000 0000 0002**
- Expected: ❌ Payment fails
- Error message shows
- User stays non-premium

### Scenario 3: Cancel Premium
- Expected: User can cancel subscription
- Status returns to non-premium
- Database updated

---

## 📊 Expected API Responses

### Create Payment Intent (200 OK)
```json
{
  "success": true,
  "clientSecret": "pi_xxxx_secret_xxxx",
  "customerId": "cus_xxxx",
  "amount": 10
}
```

### Confirm Payment (200 OK)
```json
{
  "success": true,
  "message": "Payment confirmed! You are now a premium member",
  "isPremium": true,
  "premiumSubscription": {
    "stripeCustomerId": "cus_xxxx",
    "stripePaymentMethodId": "pm_xxxx",
    "purchaseDate": "2024-12-18T10:30:00Z",
    "expiryDate": "2025-01-18T10:30:00Z",
    "status": "active",
    "amount": 10,
    "transactionId": "pi_xxxx"
  }
}
```

### Premium Status Check (200 OK)
```json
{
  "success": true,
  "isPremium": true,
  "premiumSubscription": {
    "status": "active",
    "expiryDate": "2025-01-18T10:30:00Z"
  }
}
```

---

## 🛠️ Troubleshooting

### Problem: "Network request failed"
**Solution:**
```bash
# Check backend is running
curl http://localhost:5001/api/auth/check

# Restart backend
cd /Users/mc/Desktop/FitFaat/backend
npm run dev
```

### Problem: "User is already a premium member"
**Solution:** This is expected! User is already premium. Test with a new account or cancel premium first.

### Problem: Payment doesn't go through
**Solution:**
1. Check app console for error details
2. Check backend logs for status code
3. Verify MongoDB connection
4. Try decline card (4000 0000 0000 0002) to verify error handling

### Problem: Database not updating
**Solution:**
```javascript
// Check with MongoDB
db.users.findOne({username: "Jonsnow"})
// Look for: isPremium, premiumSubscription fields
```

---

## ✅ Full Testing Checklist

After payment succeeds, verify:

- [ ] Backend shows 200 response codes
- [ ] App shows success message
- [ ] Premium screen shows "Active" status
- [ ] "Cancel Premium" button visible
- [ ] All premium features accessible
- [ ] MongoDB record updated with isPremium: true
- [ ] Can cancel and status reverts
- [ ] Can purchase again after cancellation

---

## 🎯 Next Steps

1. **Test payment flow** (you're here!)
2. **Verify database** is updated
3. **Test decline card** error handling
4. **Test cancel** functionality
5. **Deploy to production** when ready

---

## 📞 Need Help?

### Check These Files
- Backend logs: `/Users/mc/Desktop/FitFaat/backend` (terminal)
- Frontend logs: App console
- Configuration: `/Users/mc/Desktop/FitFaat/backend/.env`
- Premium screen: `/Users/mc/Desktop/FitFaat/app/(main)/(settings)/premium.tsx`
- Payment routes: `/Users/mc/Desktop/FitFaat/backend/src/routes/payment.js`

### Verify Setup
```bash
# Check Stripe keys
cat /Users/mc/Desktop/FitFaat/backend/.env | grep STRIPE

# Check backend port
cat /Users/mc/Desktop/FitFaat/backend/.env | grep PORT
```

---

**Everything is ready! Start testing now! 🎉**

1. **Press `a`** in the terminal to run on Android emulator
2. The app will load in Android emulator
3. Navigate to: **Settings → Premium**

### **Option C: Test on Physical Device**

1. Scan QR code shown in terminal with Expo Go app
2. App loads on your phone
3. Navigate to: **Settings → Premium**

---

## Step 4: Test Payment Flow

### **Scenario 1: Successful Payment**

1. **Open Settings** → tap **Premium**
2. You should see:
   - Premium badge with star icon
   - Price: **$10/month**
   - Benefits list:
     - Advanced Workout Plans
     - Personalized Nutrition
     - Priority Doctor Consultations
     - Unlimited Food Analysis
     - Weekly Progress Reports
     - Ad-Free Experience
   - **"Upgrade to Premium"** button

3. **Click "Upgrade to Premium"**
4. Card form appears with fields:
   - Cardholder Name
   - Card Number
   - Expiry Date (MM/YY)
   - CVC

5. **Enter Test Card Details:**
   ```
   Name: Test User
   Card: 4242 4242 4242 4242
   Expiry: 12/25
   CVC: 123
   ```

6. **Click "Pay $10.00"**
7. **Success!** 🎉
   - You'll see success message: "You are now a Premium Member!"
   - Premium benefits display
   - Screen shows "Your Premium Benefits"
   - Can now click **"Cancel Premium"** to downgrade

### **Scenario 2: Failed Payment**

1. Use this test card that fails:
   ```
   Name: Test User
   Card: 4000 0000 0000 0002
   Expiry: 12/25
   CVC: 123
   ```

2. Click "Pay $10.00"
3. You'll see: **"Payment Failed"** alert
4. User remains non-premium
5. Can retry with correct card

### **Scenario 3: Check Premium Status**

After successful payment:

1. **Navigate to Profile**
2. You should see premium status indicator
3. **Go to Settings → Premium** again
4. Now shows:
   - "You're a Premium Member!" ✅
   - Active subscription status
   - Plan: Premium Monthly - $10/month
   - Member Since: [today's date]
   - Your premium benefits listed

### **Scenario 4: Cancel Premium**

1. **From Premium screen** (when premium is active)
2. Scroll down and click **"Cancel Premium"** button
3. Confirmation dialog appears
4. Click **"Cancel Premium"** to confirm
5. Status returns to non-premium
6. Can upgrade again anytime

---

## Step 5: Verify Backend Processing

### **Check Logs in Terminal**

Watch your backend terminal for logs like:

```
[ChatbotStorage] Payment intent created: pi_xxxx
[Payment] User marked as premium
[Payment] Subscription expires: 2025-01-18T10:30:00Z
```

### **Check Database**

Connect to MongoDB and verify user record:

```bash
# In mongo shell or MongoDB compass
db.users.findOne({ username: "your_username" })
```

You should see:
```json
{
  "isPremium": true,
  "premiumSubscription": {
    "stripeCustomerId": "cus_xxxx",
    "stripePaymentMethodId": "pm_xxxx",
    "purchaseDate": "2024-12-18T10:30:00Z",
    "expiryDate": "2025-01-18T10:30:00Z",
    "status": "active",
    "amount": 10,
    "transactionId": "pi_xxxx"
  }
}
```

---

## Step 6: Test Edge Cases

### **Test Case 1: Already Premium**

1. User with `isPremium: true` clicks Premium
2. Should see: **"You're a Premium Member!"**
3. Cannot upgrade again (button disabled)

### **Test Case 2: Expired Premium**

1. Manually update user's `expiryDate` to past date in MongoDB
2. Check premium status endpoint
3. System automatically marks as `status: 'expired'`
4. User can purchase again

### **Test Case 3: Logout & Login**

1. Purchase premium
2. Sign out from Settings
3. Sign back in
4. Premium status persists ✅
5. Profile shows premium info

---

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Frontend app loads successfully
- [ ] Settings menu has "Premium" option
- [ ] Premium screen displays correctly
- [ ] Card form validates input (16 digits, MM/YY, 3 digit CVC)
- [ ] Success card (4242...) processes payment
- [ ] Fail card (4000...) shows error
- [ ] User marked as premium in database
- [ ] Premium status reflects in profile
- [ ] Can cancel premium subscription
- [ ] Subscription data saved correctly
- [ ] Expiry date is 1 month from purchase
- [ ] Premium persists after logout/login

---

## API Testing (Using Postman/Thunder Client)

If you want to test API endpoints directly:

### **1. Create Payment Intent**

```
POST http://localhost:5001/api/payment/create-payment-intent
Header: Authorization: Bearer {jwt_token}
Content-Type: application/json

Response:
{
  "success": true,
  "clientSecret": "pi_xxxx_secret_xxxx",
  "customerId": "cus_xxxx",
  "amount": 10
}
```

### **2. Confirm Payment**

```
POST http://localhost:5001/api/payment/confirm-payment
Header: Authorization: Bearer {jwt_token}
Content-Type: application/json

Body:
{
  "paymentIntentId": "pi_xxxx",
  "stripePaymentMethodId": "pm_xxxx"
}

Response:
{
  "success": true,
  "isPremium": true,
  "premiumSubscription": { ... }
}
```

### **3. Check Premium Status**

```
GET http://localhost:5001/api/payment/premium-status
Header: Authorization: Bearer {jwt_token}

Response:
{
  "success": true,
  "isPremium": true,
  "premiumSubscription": { ... }
}
```

### **4. Cancel Premium**

```
POST http://localhost:5001/api/payment/cancel-premium
Header: Authorization: Bearer {jwt_token}

Response:
{
  "success": true,
  "message": "Premium subscription cancelled",
  "isPremium": false
}
```

---

## Troubleshooting

### **Issue: Payment button doesn't work**

**Check:**
- Internet connection is active
- Backend server is running (`npm run dev`)
- Verify `.env` has Stripe keys
- Check browser console for errors (press F12)

### **Issue: Payment succeeds but user not marked premium**

**Check:**
- MongoDB is running
- User document exists in database
- Check backend logs for errors
- Refresh profile page

### **Issue: "User is already premium" error**

**Solution:**
- User already has active premium
- Click "Cancel Premium" first
- Then try to upgrade again

### **Issue: Card validation fails**

**Check:**
- Card number: exactly 16 digits
- Expiry: MM/YY format
- CVC: exactly 3 digits
- Name: must not be empty

### **Issue: .env keys not working**

**Solution:**
1. Stop the backend server (Ctrl+C)
2. Verify `.env` file has correct keys
3. Restart: `npm run dev`
4. Keys will reload from .env

---

## Test Payment Cards Reference

| Card Number | Purpose | Expiry | CVC |
|------------|---------|--------|-----|
| 4242 4242 4242 4242 | ✅ Success | 12/25 | 123 |
| 4000 0000 0000 0002 | ❌ Decline | 12/25 | 123 |
| 4000 0025 0000 3155 | ⚠️ SCA Required | 12/25 | 123 |
| 4000 0000 0000 9995 | ❌ Insufficient Funds | 12/25 | 123 |
| 5555 5555 5555 4444 | ✅ Success (Mastercard) | 12/25 | 123 |

---

## Performance Testing

### **Test Multiple Payments**

1. Create multiple test accounts
2. Each upgrades to premium
3. Verify all payment intents created in Stripe
4. Check all users marked premium in MongoDB

### **Load Testing**

Test 10+ simultaneous payment requests:
- All should process successfully
- No race conditions
- Database entries consistent

---

## Final Verification

Once you complete testing, verify:

✅ Frontend Payment Form → Works  
✅ Backend Payment Routes → Connected  
✅ Stripe Integration → Active  
✅ Database Updates → Correct  
✅ Premium Features → Accessible  
✅ User Profile → Shows Premium Status  
✅ Cancellation → Works  
✅ Re-purchase → Allowed  

---

## Next Steps (Production)

When ready for live:

1. **Get Production Keys** from Stripe Dashboard
2. **Update `.env`** with live keys
3. **Change PREMIUM_PRICE** if needed
4. **Enable Webhooks** in Stripe Dashboard
5. **Test with real cards** (Stripe's sandbox cards won't work)
6. **Deploy to production** server
7. **Monitor Stripe Dashboard** for transactions

---

## Support

- Stripe Test Dashboard: https://dashboard.stripe.com (login with your account)
- FitFaat Docs: See `STRIPE_SETUP.md` and `STRIPE_API_REFERENCE.md`
- Check server logs for detailed error messages

**Happy Testing! 🚀**
