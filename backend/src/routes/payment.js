import express from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51SUbhkPoREsUsXRDG1eZ7Eo9O4IoDjGClyJ95j8YTCMVEjScdis0g8jDFvQZBip3pqSksuezdbLl5DxzGg12ycy300zaYqGAMB');

const PREMIUM_PRICE = 1000; // $10 in cents

// @route   POST /api/payment/create-payment-intent
// @desc    Create a payment intent for premium subscription
// @access  Private
router.post(
  '/create-payment-intent',
  protect,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is already premium
      if (user.isPremium && user.premiumSubscription?.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'User is already a premium member'
        });
      }

      // Create or get Stripe customer
      let customerId = user.premiumSubscription?.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user._id.toString(),
            username: user.username
          }
        });
        customerId = customer.id;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: PREMIUM_PRICE,
        currency: 'usd',
        customer: customerId,
        metadata: {
          userId: user._id.toString(),
          productType: 'premium_subscription'
        },
        description: 'FitFaat Premium Subscription - $10/Month'
      });

      res.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        customerId: customerId,
        amount: PREMIUM_PRICE / 100
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating payment intent',
        error: error.message
      });
    }
  }
);

// @route   POST /api/payment/confirm-payment
// @desc    Confirm payment from Stripe and update user premium status
// @access  Private
router.post(
  '/confirm-payment',
  protect,
  [
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { paymentIntentId } = req.body;

      // Retrieve payment intent from Stripe (Frontend already confirmed it)
      // Backend just verifies the status and updates user
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      console.log(`[Payment] Confirming payment intent: ${paymentIntentId}`);
      console.log(`[Payment] Payment intent status: ${paymentIntent.status}`);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: `Payment was not successful. Status: ${paymentIntent.status}`,
          status: paymentIntent.status
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is already premium
      if (user.isPremium && user.premiumSubscription?.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'User is already a premium member'
        });
      }

      // Calculate expiry date (1 month from now)
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      // Update user premium status
      user.isPremium = true;
      user.premiumSubscription = {
        stripeCustomerId: paymentIntent.customer,
        purchaseDate: new Date(),
        expiryDate: expiryDate,
        status: 'active',
        amount: PREMIUM_PRICE / 100,
        transactionId: paymentIntentId
      };

      await user.save();

      console.log(`[Payment] User ${user._id} upgraded to premium`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed! You are now a premium member',
        isPremium: true,
        premiumSubscription: user.premiumSubscription
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error confirming payment',
        error: error.message
      });
    }
  }
);

// @route   GET /api/payment/premium-status
// @desc    Get user's premium status
// @access  Private
router.get('/premium-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if premium subscription has expired
    if (user.isPremium && user.premiumSubscription?.expiryDate) {
      if (new Date() > new Date(user.premiumSubscription.expiryDate)) {
        user.isPremium = false;
        user.premiumSubscription.status = 'expired';
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      isPremium: user.isPremium,
      premiumSubscription: user.premiumSubscription || null
    });
  } catch (error) {
    console.error('Error fetching premium status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching premium status',
      error: error.message
    });
  }
});

// @route   POST /api/payment/cancel-premium
// @desc    Cancel user's premium subscription
// @access  Private
router.post('/cancel-premium', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isPremium) {
      return res.status(400).json({
        success: false,
        message: 'User is not a premium member'
      });
    }

    // Cancel premium
    user.isPremium = false;
    if (user.premiumSubscription) {
      user.premiumSubscription.status = 'cancelled';
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Premium subscription cancelled',
      isPremium: false
    });
  } catch (error) {
    console.error('Error cancelling premium:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling premium',
      error: error.message
    });
  }
});

// @route   POST /api/payment/webhook
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret'
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object);
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
