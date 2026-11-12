"use client";

import { mutateDatabase } from "./store";

export function markNotificationsRead(tenantId?: string) {
  mutateDatabase((db) => {
    db.notifications.forEach((notification) => {
      if (tenantId) {
        if (notification.tenantId === tenantId) notification.read = true;
      } else if (!notification.tenantId) {
        notification.read = true;
      }
    });
  });
}

export function markNotificationRead(id: string) {
  mutateDatabase((db) => {
    const notification = db.notifications.find((item) => item.id === id);
    if (notification) notification.read = true;
  });
}
