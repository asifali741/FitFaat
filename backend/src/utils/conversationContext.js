/**
 * Conversation Context Manager
 * Maintains conversation history and context for multi-turn interactions
 */

/**
 * Conversation session store
 * In production, use Redis or database
 */
class ConversationManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> conversation data
    this.maxMessages = 6; // Last 2-3 exchanges (6 messages)
    this.cleanupInterval = 30 * 60 * 1000; // 30 minutes
    this.sessionTimeout = 60 * 60 * 1000; // 1 hour
    
    // Start cleanup task
    this.startCleanup();
  }

  /**
   * Create or get session
   * @param {string} sessionId - Unique session identifier
   * @returns {Object} Session data
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        messages: [],
        category: null,
        createdAt: Date.now(),
        lastActivity: Date.now()
      });
    }
    
    const session = this.sessions.get(sessionId);
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Add message to session
   * @param {string} sessionId - Session ID
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {string} category - Health category (optional)
   */
  addMessage(sessionId, role, content, category = null) {
    const session = this.getSession(sessionId);
    
    session.messages.push({
      role,
      content,
      timestamp: Date.now()
    });

    if (category) {
      session.category = category;
    }

    // Keep only last maxMessages
    if (session.messages.length > this.maxMessages) {
      session.messages = session.messages.slice(-this.maxMessages);
    }

    session.lastActivity = Date.now();
  }

  /**
   * Get conversation history (last 2-3 exchanges)
   * @param {string} sessionId - Session ID
   * @returns {Array} Messages array
   */
  getHistory(sessionId) {
    const session = this.getSession(sessionId);
    return session.messages || [];
  }

  /**
   * Get current health category context
   * @param {string} sessionId - Session ID
   * @returns {string|null} Category if known
   */
  getCategory(sessionId) {
    const session = this.getSession(sessionId);
    return session.category;
  }

  /**
   * Clear session history
   * @param {string} sessionId - Session ID
   */
  clearSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Format history for AI context
   * @param {string} sessionId - Session ID
   * @returns {string} Formatted conversation
   */
  formatHistory(sessionId) {
    const history = this.getHistory(sessionId);
    
    if (history.length === 0) {
      return '';
    }

    const formatted = history
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    return `Previous conversation:\n${formatted}\n\n`;
  }

  /**
   * Get session summary for logging
   * @param {string} sessionId - Session ID
   * @returns {Object} Summary info
   */
  getSessionSummary(sessionId) {
    const session = this.getSession(sessionId);
    return {
      id: sessionId,
      messageCount: session.messages.length,
      category: session.category,
      duration: Date.now() - session.createdAt,
      lastActivityAgo: Date.now() - session.lastActivity
    };
  }

  /**
   * Clean up expired sessions
   * @private
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Start periodic cleanup
   * @private
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Get stats about all sessions
   * @returns {Object} Statistics
   */
  getStats() {
    let totalMessages = 0;
    const categories = {};

    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
      if (session.category) {
        categories[session.category] = (categories[session.category] || 0) + 1;
      }
    }

    return {
      activeSessions: this.sessions.size,
      totalMessages,
      categories
    };
  }
}

// Singleton instance
let manager = null;

/**
 * Get conversation manager instance
 * @returns {ConversationManager} Singleton manager
 */
export function getConversationManager() {
  if (!manager) {
    manager = new ConversationManager();
  }
  return manager;
}

export default ConversationManager;
