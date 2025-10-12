import 'dotenv/config';

export default {
  expo: {
    // name: 'Bot',
    // ... other existing expo config
    extra: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    },
  },
};