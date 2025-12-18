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

      const { paymentIntentId, cardDetails } = req.body;

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

      // Save the card used for payment if card details are provided
      if (cardDetails && cardDetails.last4 && cardDetails.expiryMonth && cardDetails.expiryYear) {
        const newPaymentMethod = {
          id: `${user._id}-${Date.now()}`,
          type: 'card',
          cardBrand: cardDetails.cardBrand || 'visa',
          last4: cardDetails.last4,
          expiryMonth: cardDetails.expiryMonth,
          expiryYear: cardDetails.expiryYear,
          stripePaymentMethodId: paymentIntent.payment_method || null,
          isDefault: user.paymentMethods && user.paymentMethods.length === 0,
          addedAt: new Date(),
          lastUsed: new Date()
        };
        
        if (!user.paymentMethods) {
          user.paymentMethods = [];
        }
        user.paymentMethods.push(newPaymentMethod);
        console.log(`[Payment] Card saved for user ${user._id}`);
      }

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

// @route   GET /api/payment/methods
// @desc    Get all saved payment methods for user
// @access  Private
router.get('/methods', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('paymentMethods');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      paymentMethods: user.paymentMethods || []
    });
  } catch (error) {
    console.error('[Payment Methods] Error fetching:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
});

// @route   POST /api/payment/methods/add
// @desc    Add a new payment method
// @access  Private
router.post('/methods/add', protect, async (req, res) => {
  try {
    const { cardBrand, last4, expiryMonth, expiryYear, stripePaymentMethodId } = req.body;

    if (!cardBrand || !last4 || !expiryMonth || !expiryYear) {
      return res.status(400).json({
        success: false,
        message: 'Missing required card details'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create payment method object
    const newPaymentMethod = {
      id: `${user._id}-${Date.now()}`,
      type: 'card',
      cardBrand: cardBrand.toLowerCase(),
      last4,
      expiryMonth,
      expiryYear,
      stripePaymentMethodId,
      isDefault: user.paymentMethods.length === 0, // First card is default
      addedAt: new Date(),
      lastUsed: null
    };

    // Add to user's payment methods
    user.paymentMethods.push(newPaymentMethod);
    await user.save();

    console.log('[Payment] New payment method added for user:', user._id);

    res.json({
      success: true,
      message: 'Payment method added successfully',
      paymentMethod: newPaymentMethod
    });
  } catch (error) {
    console.error('[Payment Methods] Error adding:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment method',
      error: error.message
    });
  }
});

// @route   DELETE /api/payment/methods/:methodId
// @desc    Delete a payment method
// @access  Private
router.delete('/methods/:methodId', protect, async (req, res) => {
  try {
    const { methodId } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the payment method
    const paymentMethodIndex = user.paymentMethods.findIndex(m => m.id === methodId);
    
    if (paymentMethodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    const deletedMethod = user.paymentMethods[paymentMethodIndex];

    // Remove the payment method
    user.paymentMethods.splice(paymentMethodIndex, 1);

    // If deleted method was default and there are other methods, set first as default
    if (deletedMethod.isDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    await user.save();

    console.log('[Payment] Payment method deleted for user:', user._id);

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('[Payment Methods] Error deleting:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
      error: error.message
    });
  }
});

// @route   PUT /api/payment/methods/:methodId/set-default
// @desc    Set a payment method as default
// @access  Private
router.put('/methods/:methodId/set-default', protect, async (req, res) => {
  try {
    const { methodId } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if payment method exists
    const paymentMethodIndex = user.paymentMethods.findIndex(m => m.id === methodId);
    
    if (paymentMethodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Remove default from all methods
    user.paymentMethods.forEach(method => {
      method.isDefault = false;
    });

    // Set the selected method as default
    user.paymentMethods[paymentMethodIndex].isDefault = true;

    await user.save();

    console.log('[Payment] Default method set for user:', user._id);

    res.json({
      success: true,
      message: 'Default payment method updated'
    });
  } catch (error) {
    console.error('[Payment Methods] Error setting default:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to set default payment method',
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
