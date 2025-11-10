import mongoose from 'mongoose';

const pushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true, // One token per user
      index: true,
    },
    expoPushToken: {
      type: String,
      required: true,
    },
    deviceInfo: {
      platform: String, // 'android' or 'ios'
      appVersion: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const PushToken = mongoose.model('PushToken', pushTokenSchema);

export default PushToken;
