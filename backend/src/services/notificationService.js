import * as Expo from 'expo-server-sdk';
import PushToken from '../models/PushToken.js';

const expo = new Expo.Expo();

/**
 * Send push notification to all active users
 */
export const sendNewsNotification = async (newsTitle, newsDescription) => {
  try {
    console.log('\n🔄 Starting notification send process...');
    
    // Get all active push tokens
    const pushTokens = await PushToken.find({ isActive: true });

    console.log(`📊 Found ${pushTokens.length} active push tokens in database`);
    
    if (pushTokens.length === 0) {
      console.log('⚠️ No active push tokens found in database. Make sure:');
      console.log('  1. Users have opened the app');
      console.log('  2. Granted notification permissions');
      console.log('  3. Token registration endpoint is working');
      return { sent: 0, failed: 0, total: 0 };
    }

    // Log token details
    pushTokens.forEach((pt, idx) => {
      console.log(`  Token ${idx + 1}: userId=${pt.userId}, active=${pt.isActive}`);
    });

    console.log(`\n📢 Preparing to send notification to ${pushTokens.length} devices...`);
    console.log(`   Title: "${newsTitle}"`);
    console.log(`   Body: "${newsDescription}"`);

    // Prepare messages
    const messages = [];
    let invalidCount = 0;
    
    for (const tokenDoc of pushTokens) {
      const token = tokenDoc.expoPushToken;

      // Check if token is valid
      if (!Expo.isExpoPushToken(token)) {
        console.log(`❌ Invalid token detected: ${token}`);
        invalidCount++;
        continue;
      }

      messages.push({
        to: token,
        sound: 'default',
        title: '📰 ' + newsTitle,
        body: newsDescription || 'New news has been published',
        data: {
          type: 'news',
          title: newsTitle,
          description: newsDescription,
        },
        badge: 1,
        priority: 'high',
      });
    }

    if (invalidCount > 0) {
      console.log(`⚠️ Skipped ${invalidCount} invalid tokens`);
    }
    
    console.log(`✅ Prepared ${messages.length} valid messages to send`);

    // Send notifications in chunks (Expo API limit is 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    console.log(`📦 Split into ${chunks.length} chunk(s) for sending`);
    
    const tickets = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const [idx, chunk] of chunks.entries()) {
      try {
        console.log(`\n📤 Sending chunk ${idx + 1}/${chunks.length} (${chunk.length} messages)...`);
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        sentCount += chunk.length;
        console.log(`✅ Chunk ${idx + 1} sent successfully`);
        
        // Log ticket details
        ticketChunk.forEach((ticket, ticketIdx) => {
          if (ticket.status === 'error') {
            console.log(`   ❌ Ticket ${ticketIdx + 1}: Error - ${ticket.message}`);
          } else {
            console.log(`   ✅ Ticket ${ticketIdx + 1}: ID = ${ticket.id}`);
          }
        });
      } catch (error) {
        console.error(`❌ Error sending chunk ${idx + 1}:`, error.message);
        failedCount += chunk.length;
      }
    }

    // Check for errors in tickets
    let errorCount = 0;
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        console.error(`❌ Notification error: ${ticket.message}`);
        if (ticket.details?.error === 'InvalidCredentials') {
          console.log(`⚠️ Invalid token - might need to deactivate`);
        }
        errorCount++;
      }
    }

    console.log(`\n📊 ═════════════════════════════════════`);
    console.log(`📊 NOTIFICATION SEND SUMMARY`);
    console.log(`📊 ═════════════════════════════════════`);
    console.log(`   ✅ Total Sent: ${sentCount}`);
    console.log(`   ❌ Total Failed: ${failedCount + errorCount}`);
    console.log(`   📈 From Database: ${pushTokens.length}`);
    console.log(`   🔄 Status: ${sentCount > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📊 ═════════════════════════════════════\n`);

    return { sent: sentCount, failed: failedCount + errorCount, total: pushTokens.length };
  } catch (error) {
    console.error('❌ Error sending news notification:', error);
    throw error;
  }
};
