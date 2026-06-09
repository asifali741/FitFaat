export type LocalSyncRestoreEvent = {
  restoredAt: string;
  restoredItemCount: number;
  restoredKeys: string[];
};

type LocalSyncRestoreListener = (event: LocalSyncRestoreEvent) => void;

class LocalSyncEventEmitter {
  private restoreListeners = new Set<LocalSyncRestoreListener>();

  subscribe(listener: LocalSyncRestoreListener): () => void {
    this.restoreListeners.add(listener);
    return () => {
      this.restoreListeners.delete(listener);
    };
  }

  emitRestore(event: LocalSyncRestoreEvent): void {
    this.restoreListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('LocalSync restore listener error:', error);
      }
    });
  }
}

export const localSyncEvents = new LocalSyncEventEmitter();
