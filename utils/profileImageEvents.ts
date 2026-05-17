/**
 * Lightweight event emitter for profile image updates.
 * When the user uploads or removes their profile picture,
 * this emitter notifies all subscribers (Drawer, Profile screen, etc.)
 * so they can refresh without restarting the app.
 */

type Listener = () => void;

class ProfileImageEventEmitter {
  private listeners: Set<Listener> = new Set();

  /** Subscribe to profile image change events. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Notify all subscribers that the profile image has changed. */
  emit(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('ProfileImageEvent listener error:', error);
      }
    });
  }
}

export const profileImageEvents = new ProfileImageEventEmitter();
