// Compiled fragment from ../../packages/client-node-adapter/src/decorators/rpc-call-logger/consts.ts.
// The original TypeScript and import graph are not restored.

const RPC_CALL_REPORTER = Symbol('RpcCallReporter');
const RPC_CALL_REPORTER_INJECTED = Symbol('rpcCallReporterInjected');
const RPC_CALL_LOGGED_PROTOTYPE = Symbol('rpcCallLoggedPrototype');
const RPC_CALL_LOGGED_METHOD = Symbol('rpcCallLoggedMethod');
const RPC_LOG_TARGET_NOOP = Symbol('rpcLogTargetNoop');
const RPC_CALL_LOG_ID = 'rpc_call';
const RPC_EVENT_LOG_ID = 'rpc_event';
const REDACTED_VALUE = '[REDACTED]';
const UNAVAILABLE_VALUE = '[UNAVAILABLE]';
const MAX_SNAPSHOT_DEPTH = 8;
const MAX_SNAPSHOT_ITEMS = 100;
const MAX_SNAPSHOT_STRING_LENGTH = 2048;
const MAX_SNAPSHOT_TOTAL_ITEMS = 1000;
const MAX_SNAPSHOT_TOTAL_STRING_LENGTH = 64 * 1024;
