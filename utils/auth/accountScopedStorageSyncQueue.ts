let queuedCloudSyncTimer: ReturnType<typeof setTimeout> | null = null;

export const queueAccountScopedStorageCloudSync = (reason = 'local-write') => {
  if (queuedCloudSyncTimer) {
    clearTimeout(queuedCloudSyncTimer);
  }

  queuedCloudSyncTimer = setTimeout(() => {
    queuedCloudSyncTimer = null;
    import('./accountScopedStorage')
      .then(({ backupAccountScopedStorageLocally, backupAccountScopedStorageToCloud }) =>
        Promise.all([
          backupAccountScopedStorageLocally(),
          backupAccountScopedStorageToCloud(),
        ])
      )
      .catch((error) => {
        console.error(`Error syncing account scoped storage after ${reason}:`, error);
      });
  }, 1500);
};
