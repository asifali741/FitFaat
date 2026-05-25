/**
 * Lightweight event emitter for profile image updates.
 * When the user uploads or removes their profile picture,
 * this emitter notifies all subscribers (Drawer, Profile screen, etc.)
 * so they can refresh without restarting the app.
 */

export type ProfileImageUpdateEvent = {
  backendImageUrl?: string | null;
  displayImageUrl?: string | null;
  gmailImageUrl?: string | null;
  removed?: boolean;
  updatedAt?: string;
  userKey?: string;
};

type Listener = (event?: ProfileImageUpdateEvent) => void;

class ProfileImageEventEmitter {
  private listeners: Set<Listener> = new Set();
  private latestEvent?: ProfileImageUpdateEvent;

  /** Subscribe to profile image change events. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.latestEvent) {
      try {
        listener(this.latestEvent);
      } catch (error) {
        console.error('ProfileImageEvent listener error:', error);
      }
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Notify all subscribers that the profile image has changed. */
  emit(event?: ProfileImageUpdateEvent): void {
    this.latestEvent = event;
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('ProfileImageEvent listener error:', error);
      }
    });
  }

  getLatest(): ProfileImageUpdateEvent | undefined {
    return this.latestEvent;
  }
}

export const profileImageEvents = new ProfileImageEventEmitter();
