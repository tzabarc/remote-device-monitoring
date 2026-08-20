class StatusStore {
  constructor() {
    this.statuses = new Map();
  }

  setStatus(deviceId, status) {
    this.statuses.set(deviceId, status);
  }

  getStatus(deviceId) {
    return this.statuses.get(deviceId) || { status: "unknown", checkedAt: null };
  }

  deleteStatus(deviceId) {
    this.statuses.delete(deviceId);
  }

  // Drops any tracked status for a device id not in validIds — used after
  // an undo restores a config where some devices no longer exist.
  deleteMissing(validIds) {
    for (const id of this.statuses.keys()) {
      if (!validIds.has(id)) this.statuses.delete(id);
    }
  }

  getAll() {
    return Object.fromEntries(this.statuses);
  }
}

export const store = new StatusStore();
