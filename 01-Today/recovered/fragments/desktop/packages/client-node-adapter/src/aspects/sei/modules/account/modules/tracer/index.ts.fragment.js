// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/tracer/index.ts.
// The original TypeScript and import graph are not restored.




class AccountTracer {
    connect(writer, metricsWriter) {
        this.writer = writer;
        this.metricsWriter = metricsWriter;
    }
    pushAuthSuccess({ via }) {
        this.push('auth_success', {
            via
        });
    }
    pushAuthFailed({ code, expired, logout, status, via }) {
        this.push('auth_failed', {
            code,
            ...expired === undefined ? {} : {
                expired
            },
            logout,
            ...status === undefined ? {} : {
                status
            },
            via
        });
        if (logout) {
            this.deliverMetrics({
                metrics: [
                    {
                        name: 'auth.logout.forced',
                        type: 'counter',
                        value: 1
                    }
                ],
                attributes: {
                    via,
                    code,
                    ...status === undefined ? {} : {
                        status
                    }
                }
            });
        }
    }
    pushSessionReset({ cause, code, issue, status }) {
        this.push('session_reset', {
            cause,
            ...code === undefined ? {} : {
                code
            },
            ...status === undefined ? {} : {
                status
            }
        }, issue);
    }
    push(event, params, issue) {
        const writer = this.writer;
        if (!writer) {
            return;
        }
        this.deliver(writer, {
            id: `account_${event}`,
            ...issue === true ? {
                issue: true
            } : {},
            payload: params,
            ...this.route(event, params)
        });
    }
    async deliver(writer, params) {
        try {
            await writer(params);
        } catch  {
        // Tracing must never change account behavior.
        }
    }
    async deliverMetrics(params) {
        try {
            await this.metricsWriter?.(params);
        } catch  {
        // Metrics must never change account behavior or retry an uncertain delivery.
        }
    }
    route(event, params) {
        if (event === 'auth_success') {
            return {
                level: base_LogLevel.Info,
                target: (/* inlined export .PushTarget.File */"file")
            };
        }
        if (event === 'auth_failed' && params['logout'] !== true) {
            return {
                level: base_LogLevel.Warning,
                target: (/* inlined export .PushTarget.File */"file")
            };
        }
        return {
            level: base_LogLevel.Error,
            target: (/* inlined export .PushTarget.Sentry */"sentry")
        };
    }
}
AccountTracer = __decorate([
    injectable()
], AccountTracer);
