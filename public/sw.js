// Minimal service worker — its only job is to present reminder
// notifications (so notificationclick works even if the tab that scheduled
// them is backgrounded) and route a tap back into the app. The actual
// scheduling (setTimeout) lives in the page session, not here — see
// src/lib/reminderScheduler.js.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskId = event.notification.data?.taskId;
  const url = taskId ? `/?remind=${taskId}` : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
