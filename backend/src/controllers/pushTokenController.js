import PushToken from '../models/PushToken.js';

// Save or update user's push token
export const savePushToken = async (req, res) => {
  try {
    const { userId, expoPushToken, platform } = req.body;

    if (!userId || !expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'userId and expoPushToken are required',
      });
    }

    const pushToken = await PushToken.findOneAndUpdate(
      { userId },
      {
        userId,
        expoPushToken,
        deviceInfo: {
          platform: platform || 'android',
        },
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('✅ Push token saved for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Push token saved successfully',
      data: pushToken,
    });
  } catch (error) {
    console.error('❌ Error saving push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save push token',
      error: error.message,
    });
  }
};

// Get all active push tokens
export const getActivePushTokens = async (req, res) => {
  try {
    const tokens = await PushToken.find({ isActive: true });

    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('❌ Error getting push tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get push tokens',
      error: error.message,
    });
  }
};

// Deactivate push token
export const deactivatePushToken = async (req, res) => {
  try {
    const { userId } = req.body;

    const pushToken = await PushToken.findOneAndUpdate(
      { userId },
      { isActive: false },
      { new: true }
    );

    console.log('ℹ️ Push token deactivated for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Push token deactivated',
      data: pushToken,
    });
  } catch (error) {
    console.error('❌ Error deactivating push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate push token',
      error: error.message,
    });
  }
};
