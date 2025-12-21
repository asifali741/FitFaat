/**
 * Advanced Logging & Analytics
 * Tracks queries, responses, and patterns for improvement
 */

/**
 * Query logger
 */
class ChatLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000; // Keep recent logs in memory
  }

  /**
   * Log a query and response
   * @param {Object} data - Log data
   */
  log(data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: data.sessionId,
      userMessage: data.userMessage,
      responseType: data.responseType, // 'nutrition', 'health', 'greeting', 'rejected', 'error'
      source: data.source, // 'dataset', 'health-dataset', 'system', 'gemini'
      category: data.category, // health category if applicable
      responseLength: data.response?.length || 0,
      processingTime: data.processingTime || 0,
      status: data.status, // 'success', 'not_found', 'restricted', 'out_of_scope'
      error: data.error || null
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console log for debugging
    this.printLog(logEntry);
  }

  /**
   * Print log to console with formatting
   * @private
   */
  printLog(entry) {
    const statusEmoji = {
      success: '✅',
      not_found: '❌',
      restricted: '🚫',
      out_of_scope: '⚠️',
      error: '⛔'
    };

    const emoji = statusEmoji[entry.status] || '📝';
    const type = entry.responseType.toUpperCase().padEnd(12);
    const source = entry.source.padEnd(15);

    console.log(
      `${emoji} [${entry.timestamp}] ${type} | ${source} | ${entry.status.padEnd(10)} | ${entry.processingTime}ms`
    );

    if (entry.error) {
      console.error(`   Error: ${entry.error}`);
    }
  }

  /**
   * Get analytics for a time period
   * @param {number} hours - Hours to analyze (default: 24)
   * @returns {Object} Analytics data
   */
  getAnalytics(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const relevantLogs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);

    if (relevantLogs.length === 0) {
      return { period: `${hours} hours`, totalQueries: 0, breakdown: {} };
    }

    const breakdown = {
      byType: {},
      bySource: {},
      byStatus: {},
      byCategory: {},
      notFound: [],
      restricted: [],
      errors: []
    };

    for (const log of relevantLogs) {
      // Count by type
      breakdown.byType[log.responseType] = (breakdown.byType[log.responseType] || 0) + 1;

      // Count by source
      breakdown.bySource[log.source] = (breakdown.bySource[log.source] || 0) + 1;

      // Count by status
      breakdown.byStatus[log.status] = (breakdown.byStatus[log.status] || 0) + 1;

      // Count by category
      if (log.category) {
        breakdown.byCategory[log.category] = (breakdown.byCategory[log.category] || 0) + 1;
      }

      // Collect not found queries
      if (log.status === 'not_found') {
        breakdown.notFound.push({
          query: log.userMessage,
          time: log.timestamp
        });
      }

      // Collect restricted queries
      if (log.status === 'restricted') {
        breakdown.restricted.push({
          query: log.userMessage,
          time: log.timestamp
        });
      }

      // Collect errors
      if (log.error) {
        breakdown.errors.push({
          message: log.userMessage,
          error: log.error,
          time: log.timestamp
        });
      }
    }

    return {
      period: `${hours} hours`,
      totalQueries: relevantLogs.length,
      averageResponseTime: Math.round(
        relevantLogs.reduce((sum, log) => sum + log.processingTime, 0) / relevantLogs.length
      ),
      breakdown
    };
  }

  /**
   * Export logs as JSON
   * @param {number} limit - Max logs to export
   * @returns {Array} Log entries
   */
  exportLogs(limit = 1000) {
    return this.logs.slice(-limit);
  }

  /**
   * Clear old logs
   * @param {number} hours - Keep only last N hours
   */
  clearOldLogs(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const oldCount = this.logs.length;

    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);

    console.log(`🧹 Cleared ${oldCount - this.logs.length} old logs`);
  }

  /**
   * Reset all logs
   */
  clearAll() {
    this.logs = [];
    console.log('🧹 All logs cleared');
  }

  /**
   * Get recent unanswered queries
   * @returns {Array} Queries with 'not_found' or 'out_of_scope' status
   */
  getUnansweredQueries() {
    return this.logs
      .filter(log => log.status === 'not_found' || log.status === 'out_of_scope')
      .slice(-50); // Last 50
  }

  /**
   * Print formatted report
   */
  printReport(hours = 24) {
    const analytics = this.getAnalytics(hours);

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║          CHATBOT ANALYTICS REPORT          ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log(`📊 Period: ${analytics.period}`);
    console.log(`📈 Total Queries: ${analytics.totalQueries}`);
    console.log(`⏱️  Avg Response Time: ${analytics.averageResponseTime}ms\n`);

    console.log('📋 By Type:');
    for (const [type, count] of Object.entries(analytics.breakdown.byType)) {
      console.log(`   ${type}: ${count}`);
    }

    console.log('\n📍 By Source:');
    for (const [source, count] of Object.entries(analytics.breakdown.bySource)) {
      console.log(`   ${source}: ${count}`);
    }

    console.log('\n✅ By Status:');
    for (const [status, count] of Object.entries(analytics.breakdown.byStatus)) {
      console.log(`   ${status}: ${count}`);
    }

    if (Object.keys(analytics.breakdown.byCategory).length > 0) {
      console.log('\n🏷️  By Category:');
      for (const [category, count] of Object.entries(analytics.breakdown.byCategory)) {
        console.log(`   ${category}: ${count}`);
      }
    }

    if (analytics.breakdown.notFound.length > 0) {
      console.log(`\n❌ Not Found (${analytics.breakdown.notFound.length}):`);
      analytics.breakdown.notFound.slice(-5).forEach(item => {
        console.log(`   • "${item.query}"`);
      });
    }

    if (analytics.breakdown.errors.length > 0) {
      console.log(`\n⛔ Errors (${analytics.breakdown.errors.length}):`);
      analytics.breakdown.errors.slice(-5).forEach(item => {
        console.log(`   • "${item.message}": ${item.error}`);
      });
    }

    console.log('\n');
  }
}

// Singleton instance
let logger = null;

/**
 * Get or create logger instance
 * @returns {ChatLogger} Logger instance
 */
export function getLogger() {
  if (!logger) {
    logger = new ChatLogger();
  }
  return logger;
}

export default ChatLogger;
