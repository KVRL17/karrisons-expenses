export function createNotification(message, type = 'info') {
  return {
    id: crypto.randomUUID(),
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  };
}
