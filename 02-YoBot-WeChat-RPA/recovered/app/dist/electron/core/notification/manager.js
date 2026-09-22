import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { resolveBootstrapAgentFileLayout } from '../platform/file_layout.js';
export class NotificationManager {
    static instance;
    dataFile;
    notifications = [];
    listeners = [];
    constructor() {
        const dataDir = resolveBootstrapAgentFileLayout({
            userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
        }).dataDir;
        if (!fs.existsSync(dataDir)) {
            try {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            catch (e) {
                console.error('[NotificationManager] Failed to create data directory:', e);
            }
        }
        this.dataFile = path.join(dataDir, 'notifications.json');
        this.load();
    }
    static getInstance() {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }
    load() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf-8');
                const parsed = JSON.parse(data);
                const loaded = Array.isArray(parsed) ? parsed : [];
                const seenKeys = new Set();
                this.notifications = loaded.filter((notification) => {
                    const key = this.getDedupeKey(notification);
                    if (!key)
                        return true;
                    if (seenKeys.has(key))
                        return false;
                    seenKeys.add(key);
                    return true;
                });
            }
        }
        catch (error) {
            console.error('[NotificationManager] Failed to load notifications:', error);
            this.notifications = [];
        }
    }
    save() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.notifications, null, 2));
            this.notifyListeners();
        }
        catch (error) {
            console.error('[NotificationManager] Failed to save notifications:', error);
        }
    }
    addNotification(notification) {
        const dedupeKey = this.getDedupeKey(notification);
        if (dedupeKey) {
            const existing = this.notifications.find(item => this.getDedupeKey(item) === dedupeKey);
            if (existing) {
                // An adapter fallback may win the race and write a generic preview
                // before the producer publishes the final, structured notification.
                // Upgrade that same record in place so it keeps its identity/read
                // state and never causes a second desktop toast.
                if (notification.metadata?.notificationAuthoritative === true
                    && existing.metadata?.notificationAuthoritative !== true) {
                    const { id, timestamp, read } = existing;
                    Object.assign(existing, notification, { id, timestamp, read, dedupeKey });
                    this.save();
                }
                return existing;
            }
        }
        const newNotification = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            read: false,
            ...notification,
            dedupeKey,
        };
        this.notifications.unshift(newNotification);
        // Limit history to 100 items
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        this.save();
        return newNotification;
    }
    getDedupeKey(notification) {
        const key = notification.dedupeKey || notification.metadata?.notificationKey;
        return typeof key === 'string' && key.trim() ? key.trim() : undefined;
    }
    getNotifications(unreadOnly = false) {
        if (unreadOnly) {
            return this.notifications.filter(n => !n.read);
        }
        return this.notifications;
    }
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.save();
        }
    }
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.save();
    }
    deleteNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.save();
    }
    clearAll() {
        this.notifications = [];
        this.save();
    }
    subscribe(listener) {
        this.listeners.push(listener);
        // Initial call
        listener(this.notifications);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.notifications));
    }
}
