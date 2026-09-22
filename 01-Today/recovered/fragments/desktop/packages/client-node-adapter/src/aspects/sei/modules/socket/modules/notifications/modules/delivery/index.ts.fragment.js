// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/delivery/index.ts.
// The original TypeScript and import graph are not restored.













class SocketNotificationDelivery extends readonly_events_ReadonlyEvents {
    async initialize() {
        await this.lifecycle.run(async ()=>{
            if (this.presentationSubscriptions.length > 0) {
                return;
            }
            await this.subscribeToPresentation();
        });
    }
    async dispose() {
        await this.lifecycle.run(async ()=>{
            const subscriptions = this.presentationSubscriptions;
            this.presentationSubscriptions = [];
            await Promise.allSettled(subscriptions.map(async (subscription)=>{
                await subscription.unsubscribe();
            }));
            this.reset();
        });
    }
    isDisplaySupported() {
        try {
            return this.presentation.isSupported();
        } catch  {
            return false;
        }
    }
    handleEventPush(message, identity, isPresent) {
        if (message.payload.event !== NOTIFICATION_DELIVER_EVENT) {
            return null;
        }
        try {
            return this.deliver(message, identity, isPresent);
        } catch (error) {
            this.logger.warn(NOTIFICATION_DELIVERY_LOG_CATEGORY, `handling failed: ${describeError(error)}`);
            return null;
        }
    }
    registerRemoteNotification(notification) {
        const { notificationId } = notification;
        if (!notificationId) {
            return;
        }
        if (!this.deduplicator.register(notificationId)) {
            this.logger.info(NOTIFICATION_DELIVERY_LOG_CATEGORY, 'deduplicated source=remote-push');
        }
    }
    reset() {
        this.activations.clear();
        this.deduplicator.clear();
        try {
            this.presentation.dismissAll();
        } catch (error) {
            this.logger.warn(NOTIFICATION_DELIVERY_LOG_CATEGORY, `dismiss failed: ${describeError(error)}`);
        }
    }
    async subscribeToPresentation() {
        const activated = await this.presentation.subscribe('activated', ({ id })=>{
            this.handleActivation(id);
        });
        // 系统拒绝展示时 `show()` 不抛，这个事件是唯一的信号。macOS 上用户拒绝授权
        // 后它会对每一条通知触发，不记录的话「通知没送到」在客户端完全不可见。
        //
        // 走结构化日志而不是 AdapterLogger：后者直接写 process.stderr，只有从终端
        // 起进程时才看得到，既不进本地 NDJSON 也不进 Logs Debug 面板——而这正是
        // 排查「用户说没收到通知」时唯一能拿到的东西。
        const failed = await this.presentation.subscribe('failed', ({ id, reason })=>{
            this.logs.push({
                level: base_LogLevel.Warning,
                id: 'desktop_notification_presentation_failed',
                payload: {
                    notification_id: id,
                    // 原因来自宿主，长度、内容乃至是否存在都不受控；截断后仅作诊断用。
                    // 这条路径本身就是在记录失败，绝不能因为缺字段再抛一次。
                    reason: (reason ?? '').slice(0, 200)
                },
                target: (/* inlined export .PushTarget.File */"file")
            });
        });
        this.presentationSubscriptions = [
            activated,
            failed
        ];
    }
    deliver(message, identity, isPresent) {
        const notification = parseDeliverNotification(message);
        if (!notification) {
            this.logger.warn(NOTIFICATION_DELIVERY_LOG_CATEGORY, 'dropped an undecodable payload');
            return null;
        }
        // The meeting reminder owns its floating window through the public Socket event.
        if (notification.type === 'recording-offer') {
            return null;
        }
        if (!this.deduplicator.register(notification.notificationId)) {
            this.logger.info(NOTIFICATION_DELIVERY_LOG_CATEGORY, 'deduplicated source=web-socket');
            return null;
        }
        const result = {
            ...notification.badge === undefined ? {} : {
                badge: notification.badge
            }
        };
        if (notification.type === CHAT_NOTIFICATION_TYPE && isPresent) {
            this.logger.info(NOTIFICATION_DELIVERY_LOG_CATEGORY, 'suppressed a chat banner for presence');
            return result;
        }
        if (!this.isDisplaySupported()) {
            this.logger.warn(NOTIFICATION_DELIVERY_LOG_CATEGORY, 'notifications are not supported');
            return result;
        }
        this.activations.set(notification.notificationId, {
            identity,
            messageId: notification.messageId ?? notification.notificationId,
            type: notification.type
        });
        this.evictActivationIfNeeded();
        try {
            this.presentation.present({
                id: notification.notificationId,
                groupId: notification.threadId ?? notification.type,
                title: notification.title ?? '',
                ...notification.subtitle === undefined ? {} : {
                    subtitle: notification.subtitle
                },
                ...notification.body === undefined ? {} : {
                    body: notification.body
                },
                silent: notification.sound === 'silent'
            });
        } catch (error) {
            this.activations.delete(notification.notificationId);
            throw error;
        }
        return result;
    }
    handleActivation(notificationId) {
        const activation = this.activations.get(notificationId);
        this.activations.delete(notificationId);
        if (!activation || !this.account.isCurrentUserSocketAuthContext(activation.identity)) {
            return;
        }
        this.activate(activation);
    }
    async activate(activation) {
        try {
            await this.shell.activate();
        } catch (error) {
            this.logger.warn(NOTIFICATION_DELIVERY_LOG_CATEGORY, `activate failed: ${describeError(error)}`);
        }
        if (activation.type !== CHAT_NOTIFICATION_TYPE) {
            return;
        }
        if (!this.account.isCurrentUserSocketAuthContext(activation.identity)) {
            return;
        }
        this.emit('activated', {
            kind: 'chat-message',
            messageId: activation.messageId
        });
    }
    evictActivationIfNeeded() {
        while(this.activations.size > (/* inlined export .MAX_PRESENTED_NOTIFICATION_ACTIVATIONS */256)){
            const oldest = this.activations.keys().next().value;
            if (oldest === undefined) {
                return;
            }
            this.activations.delete(oldest);
        }
    }
    constructor(...args){
        super(...args), this.activations = new Map(), this.presentationSubscriptions = [];
    }
}
__decorate([
    inject(NotificationDeduplicator),
    __metadata("design:type", typeof NotificationDeduplicator === "undefined" ? Object : NotificationDeduplicator)
], SocketNotificationDelivery.prototype, "deduplicator", void 0);
__decorate([
    inject(DesktopNotificationPresentation),
    __metadata("design:type", typeof DesktopNotificationPresentation === "undefined" ? Object : DesktopNotificationPresentation)
], SocketNotificationDelivery.prototype, "presentation", void 0);
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], SocketNotificationDelivery.prototype, "shell", void 0);
__decorate([
    inject(LogsShellService),
    __metadata("design:type", typeof LogsShellService === "undefined" ? Object : LogsShellService)
], SocketNotificationDelivery.prototype, "logs", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], SocketNotificationDelivery.prototype, "account", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], SocketNotificationDelivery.prototype, "logger", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], SocketNotificationDelivery.prototype, "lifecycle", void 0);
SocketNotificationDelivery = __decorate([
    injectable()
], SocketNotificationDelivery);
