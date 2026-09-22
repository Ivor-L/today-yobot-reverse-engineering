(() => {
var __webpack_modules__ = ({
685(module) {
"use strict";


var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Add a listener for a given event.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {EventEmitter}
 * @private
 */
function addListener(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') {
    throw new TypeError('The listener must be a function');
  }

  var listener = new EE(fn, context || emitter, once)
    , evt = prefix ? prefix + event : event;

  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [emitter._events[evt], listener];

  return emitter;
}

/**
 * Clear event by name.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} evt The Event name.
 * @private
 */
function clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new Events();
  else delete emitter._events[evt];
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Array} The registered listeners.
 * @public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  var evt = prefix ? prefix + event : event
    , handlers = this._events[evt];

  if (!handlers) return [];
  if (handlers.fn) return [handlers.fn];

  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
    ee[i] = handlers[i].fn;
  }

  return ee;
};

/**
 * Return the number of listeners listening to a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Number} The number of listeners.
 * @public
 */
EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = prefix ? prefix + event : event
    , listeners = this._events[evt];

  if (!listeners) return 0;
  if (listeners.fn) return 1;
  return listeners.length;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  return addListener(this, event, fn, context, false);
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  return addListener(this, event, fn, context, true);
};

/**
 * Remove the listeners of a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {*} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    clearEvent(this, evt);
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
      listeners.fn === fn &&
      (!once || listeners.once) &&
      (!context || listeners.context === context)
    ) {
      clearEvent(this, evt);
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
        listeners[i].fn !== fn ||
        (once && !listeners[i].once) ||
        (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else clearEvent(this, evt);
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {(String|Symbol)} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) clearEvent(this, evt);
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if (true) {
  module.exports = EventEmitter;
}


},
286(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/thenable.d.ts" preserve="true"/>
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProgressType = exports.ProgressToken = exports.createMessageConnection = exports.NullLogger = exports.ConnectionOptions = exports.ConnectionStrategy = exports.AbstractMessageBuffer = exports.WriteableStreamMessageWriter = exports.AbstractMessageWriter = exports.MessageWriter = exports.ReadableStreamMessageReader = exports.AbstractMessageReader = exports.MessageReader = exports.SharedArrayReceiverStrategy = exports.SharedArraySenderStrategy = exports.CancellationToken = exports.CancellationTokenSource = exports.Emitter = exports.Event = exports.Disposable = exports.LRUCache = exports.Touch = exports.LinkedMap = exports.ParameterStructures = exports.NotificationType9 = exports.NotificationType8 = exports.NotificationType7 = exports.NotificationType6 = exports.NotificationType5 = exports.NotificationType4 = exports.NotificationType3 = exports.NotificationType2 = exports.NotificationType1 = exports.NotificationType0 = exports.NotificationType = exports.ErrorCodes = exports.ResponseError = exports.RequestType9 = exports.RequestType8 = exports.RequestType7 = exports.RequestType6 = exports.RequestType5 = exports.RequestType4 = exports.RequestType3 = exports.RequestType2 = exports.RequestType1 = exports.RequestType0 = exports.RequestType = exports.Message = exports.RAL = void 0;
exports.MessageStrategy = exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.RequestCancellationReceiverStrategy = exports.IdCancellationReceiverStrategy = exports.CancellationReceiverStrategy = exports.ConnectionError = exports.ConnectionErrors = exports.LogTraceNotification = exports.SetTraceNotification = exports.TraceFormat = exports.TraceValues = exports.TraceValue = exports.Trace = void 0;
const messages_1 = __webpack_require__(28);
Object.defineProperty(exports, "Message", ({ enumerable: true, get: function () { return messages_1.Message; } }));
Object.defineProperty(exports, "RequestType", ({ enumerable: true, get: function () { return messages_1.RequestType; } }));
Object.defineProperty(exports, "RequestType0", ({ enumerable: true, get: function () { return messages_1.RequestType0; } }));
Object.defineProperty(exports, "RequestType1", ({ enumerable: true, get: function () { return messages_1.RequestType1; } }));
Object.defineProperty(exports, "RequestType2", ({ enumerable: true, get: function () { return messages_1.RequestType2; } }));
Object.defineProperty(exports, "RequestType3", ({ enumerable: true, get: function () { return messages_1.RequestType3; } }));
Object.defineProperty(exports, "RequestType4", ({ enumerable: true, get: function () { return messages_1.RequestType4; } }));
Object.defineProperty(exports, "RequestType5", ({ enumerable: true, get: function () { return messages_1.RequestType5; } }));
Object.defineProperty(exports, "RequestType6", ({ enumerable: true, get: function () { return messages_1.RequestType6; } }));
Object.defineProperty(exports, "RequestType7", ({ enumerable: true, get: function () { return messages_1.RequestType7; } }));
Object.defineProperty(exports, "RequestType8", ({ enumerable: true, get: function () { return messages_1.RequestType8; } }));
Object.defineProperty(exports, "RequestType9", ({ enumerable: true, get: function () { return messages_1.RequestType9; } }));
Object.defineProperty(exports, "ResponseError", ({ enumerable: true, get: function () { return messages_1.ResponseError; } }));
Object.defineProperty(exports, "ErrorCodes", ({ enumerable: true, get: function () { return messages_1.ErrorCodes; } }));
Object.defineProperty(exports, "NotificationType", ({ enumerable: true, get: function () { return messages_1.NotificationType; } }));
Object.defineProperty(exports, "NotificationType0", ({ enumerable: true, get: function () { return messages_1.NotificationType0; } }));
Object.defineProperty(exports, "NotificationType1", ({ enumerable: true, get: function () { return messages_1.NotificationType1; } }));
Object.defineProperty(exports, "NotificationType2", ({ enumerable: true, get: function () { return messages_1.NotificationType2; } }));
Object.defineProperty(exports, "NotificationType3", ({ enumerable: true, get: function () { return messages_1.NotificationType3; } }));
Object.defineProperty(exports, "NotificationType4", ({ enumerable: true, get: function () { return messages_1.NotificationType4; } }));
Object.defineProperty(exports, "NotificationType5", ({ enumerable: true, get: function () { return messages_1.NotificationType5; } }));
Object.defineProperty(exports, "NotificationType6", ({ enumerable: true, get: function () { return messages_1.NotificationType6; } }));
Object.defineProperty(exports, "NotificationType7", ({ enumerable: true, get: function () { return messages_1.NotificationType7; } }));
Object.defineProperty(exports, "NotificationType8", ({ enumerable: true, get: function () { return messages_1.NotificationType8; } }));
Object.defineProperty(exports, "NotificationType9", ({ enumerable: true, get: function () { return messages_1.NotificationType9; } }));
Object.defineProperty(exports, "ParameterStructures", ({ enumerable: true, get: function () { return messages_1.ParameterStructures; } }));
const linkedMap_1 = __webpack_require__(819);
Object.defineProperty(exports, "LinkedMap", ({ enumerable: true, get: function () { return linkedMap_1.LinkedMap; } }));
Object.defineProperty(exports, "LRUCache", ({ enumerable: true, get: function () { return linkedMap_1.LRUCache; } }));
Object.defineProperty(exports, "Touch", ({ enumerable: true, get: function () { return linkedMap_1.Touch; } }));
const disposable_1 = __webpack_require__(742);
Object.defineProperty(exports, "Disposable", ({ enumerable: true, get: function () { return disposable_1.Disposable; } }));
const events_1 = __webpack_require__(157);
Object.defineProperty(exports, "Event", ({ enumerable: true, get: function () { return events_1.Event; } }));
Object.defineProperty(exports, "Emitter", ({ enumerable: true, get: function () { return events_1.Emitter; } }));
const cancellation_1 = __webpack_require__(995);
Object.defineProperty(exports, "CancellationTokenSource", ({ enumerable: true, get: function () { return cancellation_1.CancellationTokenSource; } }));
Object.defineProperty(exports, "CancellationToken", ({ enumerable: true, get: function () { return cancellation_1.CancellationToken; } }));
const sharedArrayCancellation_1 = __webpack_require__(595);
Object.defineProperty(exports, "SharedArraySenderStrategy", ({ enumerable: true, get: function () { return sharedArrayCancellation_1.SharedArraySenderStrategy; } }));
Object.defineProperty(exports, "SharedArrayReceiverStrategy", ({ enumerable: true, get: function () { return sharedArrayCancellation_1.SharedArrayReceiverStrategy; } }));
const messageReader_1 = __webpack_require__(890);
Object.defineProperty(exports, "MessageReader", ({ enumerable: true, get: function () { return messageReader_1.MessageReader; } }));
Object.defineProperty(exports, "AbstractMessageReader", ({ enumerable: true, get: function () { return messageReader_1.AbstractMessageReader; } }));
Object.defineProperty(exports, "ReadableStreamMessageReader", ({ enumerable: true, get: function () { return messageReader_1.ReadableStreamMessageReader; } }));
const messageWriter_1 = __webpack_require__(282);
Object.defineProperty(exports, "MessageWriter", ({ enumerable: true, get: function () { return messageWriter_1.MessageWriter; } }));
Object.defineProperty(exports, "AbstractMessageWriter", ({ enumerable: true, get: function () { return messageWriter_1.AbstractMessageWriter; } }));
Object.defineProperty(exports, "WriteableStreamMessageWriter", ({ enumerable: true, get: function () { return messageWriter_1.WriteableStreamMessageWriter; } }));
const messageBuffer_1 = __webpack_require__(399);
Object.defineProperty(exports, "AbstractMessageBuffer", ({ enumerable: true, get: function () { return messageBuffer_1.AbstractMessageBuffer; } }));
const connection_1 = __webpack_require__(852);
Object.defineProperty(exports, "ConnectionStrategy", ({ enumerable: true, get: function () { return connection_1.ConnectionStrategy; } }));
Object.defineProperty(exports, "ConnectionOptions", ({ enumerable: true, get: function () { return connection_1.ConnectionOptions; } }));
Object.defineProperty(exports, "NullLogger", ({ enumerable: true, get: function () { return connection_1.NullLogger; } }));
Object.defineProperty(exports, "createMessageConnection", ({ enumerable: true, get: function () { return connection_1.createMessageConnection; } }));
Object.defineProperty(exports, "ProgressToken", ({ enumerable: true, get: function () { return connection_1.ProgressToken; } }));
Object.defineProperty(exports, "ProgressType", ({ enumerable: true, get: function () { return connection_1.ProgressType; } }));
Object.defineProperty(exports, "Trace", ({ enumerable: true, get: function () { return connection_1.Trace; } }));
Object.defineProperty(exports, "TraceValue", ({ enumerable: true, get: function () { return connection_1.TraceValue; } }));
Object.defineProperty(exports, "TraceFormat", ({ enumerable: true, get: function () { return connection_1.TraceFormat; } }));
Object.defineProperty(exports, "SetTraceNotification", ({ enumerable: true, get: function () { return connection_1.SetTraceNotification; } }));
Object.defineProperty(exports, "LogTraceNotification", ({ enumerable: true, get: function () { return connection_1.LogTraceNotification; } }));
Object.defineProperty(exports, "ConnectionErrors", ({ enumerable: true, get: function () { return connection_1.ConnectionErrors; } }));
Object.defineProperty(exports, "ConnectionError", ({ enumerable: true, get: function () { return connection_1.ConnectionError; } }));
Object.defineProperty(exports, "CancellationReceiverStrategy", ({ enumerable: true, get: function () { return connection_1.CancellationReceiverStrategy; } }));
Object.defineProperty(exports, "IdCancellationReceiverStrategy", ({ enumerable: true, get: function () { return connection_1.IdCancellationReceiverStrategy; } }));
Object.defineProperty(exports, "RequestCancellationReceiverStrategy", ({ enumerable: true, get: function () { return connection_1.RequestCancellationReceiverStrategy; } }));
Object.defineProperty(exports, "CancellationSenderStrategy", ({ enumerable: true, get: function () { return connection_1.CancellationSenderStrategy; } }));
Object.defineProperty(exports, "CancellationStrategy", ({ enumerable: true, get: function () { return connection_1.CancellationStrategy; } }));
Object.defineProperty(exports, "MessageStrategy", ({ enumerable: true, get: function () { return connection_1.MessageStrategy; } }));
Object.defineProperty(exports, "TraceValues", ({ enumerable: true, get: function () { return connection_1.TraceValues; } }));
const ral_1 = __importDefault(__webpack_require__(29));
exports.RAL = ral_1.default;


},
995(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CancellationTokenSource = exports.CancellationToken = void 0;
const ral_1 = __importDefault(__webpack_require__(29));
const Is = __importStar(__webpack_require__(928));
const events_1 = __webpack_require__(157);
var CancellationToken;
(function (CancellationToken) {
    CancellationToken.None = Object.freeze({
        isCancellationRequested: false,
        onCancellationRequested: events_1.Event.None
    });
    CancellationToken.Cancelled = Object.freeze({
        isCancellationRequested: true,
        onCancellationRequested: events_1.Event.None
    });
    function is(value) {
        const candidate = value;
        return candidate && (candidate === CancellationToken.None
            || candidate === CancellationToken.Cancelled
            || (Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested));
    }
    CancellationToken.is = is;
})(CancellationToken || (exports.CancellationToken = CancellationToken = {}));
const shortcutEvent = Object.freeze(function (callback, context) {
    const handle = (0, ral_1.default)().timer.setTimeout(callback.bind(context), 0);
    return { dispose() { handle.dispose(); } };
});
class MutableToken {
    _isCancelled = false;
    _emitter;
    cancel() {
        if (!this._isCancelled) {
            this._isCancelled = true;
            if (this._emitter) {
                this._emitter.fire(undefined);
                this.dispose();
            }
        }
    }
    get isCancellationRequested() {
        return this._isCancelled;
    }
    get onCancellationRequested() {
        if (this._isCancelled) {
            return shortcutEvent;
        }
        if (!this._emitter) {
            this._emitter = new events_1.Emitter();
        }
        return this._emitter.event;
    }
    dispose() {
        if (this._emitter) {
            this._emitter.dispose();
            this._emitter = undefined;
        }
    }
}
class CancellationTokenSource {
    _token;
    get token() {
        if (!this._token) {
            // be lazy and create the token only when
            // actually needed
            this._token = new MutableToken();
        }
        return this._token;
    }
    cancel() {
        if (!this._token) {
            // save an object by returning the default
            // cancelled token when cancellation happens
            // before someone asks for the token
            this._token = CancellationToken.Cancelled;
        }
        else {
            this._token.cancel();
        }
    }
    dispose() {
        if (!this._token) {
            // ensure to initialize with an empty token if we had none
            this._token = CancellationToken.None;
        }
        else if (this._token instanceof MutableToken) {
            // actually dispose
            this._token.dispose();
        }
    }
}
exports.CancellationTokenSource = CancellationTokenSource;


},
852(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/thenable.d.ts" preserve="true"/>
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConnectionOptions = exports.MessageStrategy = exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.CancellationReceiverStrategy = exports.RequestCancellationReceiverStrategy = exports.IdCancellationReceiverStrategy = exports.ConnectionStrategy = exports.ConnectionError = exports.ConnectionErrors = exports.LogTraceNotification = exports.SetTraceNotification = exports.TraceFormat = exports.TraceValues = exports.TraceValue = exports.Trace = exports.NullLogger = exports.ProgressType = exports.ProgressToken = void 0;
exports.createMessageConnection = createMessageConnection;
const ral_1 = __importDefault(__webpack_require__(29));
const Is = __importStar(__webpack_require__(928));
const messages_1 = __webpack_require__(28);
const linkedMap_1 = __webpack_require__(819);
const events_1 = __webpack_require__(157);
const cancellation_1 = __webpack_require__(995);
var CancelNotification;
(function (CancelNotification) {
    CancelNotification.type = new messages_1.NotificationType('$/cancelRequest');
})(CancelNotification || (CancelNotification = {}));
var ProgressToken;
(function (ProgressToken) {
    function is(value) {
        return typeof value === 'string' || typeof value === 'number';
    }
    ProgressToken.is = is;
})(ProgressToken || (exports.ProgressToken = ProgressToken = {}));
var ProgressNotification;
(function (ProgressNotification) {
    ProgressNotification.type = new messages_1.NotificationType('$/progress');
})(ProgressNotification || (ProgressNotification = {}));
class ProgressType {
    /**
     * Clients must not use these properties. They are here to ensure correct typing.
     * in TypeScript
     */
    __;
    _pr;
    constructor() {
    }
}
exports.ProgressType = ProgressType;
var StarRequestHandler;
(function (StarRequestHandler) {
    function is(value) {
        return Is.func(value);
    }
    StarRequestHandler.is = is;
})(StarRequestHandler || (StarRequestHandler = {}));
exports.NullLogger = Object.freeze({
    error: () => { },
    warn: () => { },
    info: () => { },
    log: () => { }
});
var Trace;
(function (Trace) {
    Trace[Trace["Off"] = 0] = "Off";
    Trace[Trace["Messages"] = 1] = "Messages";
    Trace[Trace["Compact"] = 2] = "Compact";
    Trace[Trace["Verbose"] = 3] = "Verbose";
})(Trace || (exports.Trace = Trace = {}));
var TraceValue;
(function (TraceValue) {
    /**
     * Turn tracing off.
     */
    TraceValue.Off = 'off';
    /**
     * Trace messages only.
     */
    TraceValue.Messages = 'messages';
    /**
     * Compact message tracing.
     */
    TraceValue.Compact = 'compact';
    /**
     * Verbose message tracing.
     */
    TraceValue.Verbose = 'verbose';
})(TraceValue || (exports.TraceValue = TraceValue = {}));
/**
 * @deprecated Use TraceValue instead
 */
exports.TraceValues = TraceValue;
(function (Trace) {
    function fromString(value) {
        if (!Is.string(value)) {
            return Trace.Off;
        }
        value = value.toLowerCase();
        switch (value) {
            case 'off':
                return Trace.Off;
            case 'messages':
                return Trace.Messages;
            case 'compact':
                return Trace.Compact;
            case 'verbose':
                return Trace.Verbose;
            default:
                return Trace.Off;
        }
    }
    Trace.fromString = fromString;
    function toString(value) {
        switch (value) {
            case Trace.Off:
                return 'off';
            case Trace.Messages:
                return 'messages';
            case Trace.Compact:
                return 'compact';
            case Trace.Verbose:
                return 'verbose';
            default:
                return 'off';
        }
    }
    Trace.toString = toString;
})(Trace || (exports.Trace = Trace = {}));
var TraceFormat;
(function (TraceFormat) {
    TraceFormat["Text"] = "text";
    TraceFormat["JSON"] = "json";
})(TraceFormat || (exports.TraceFormat = TraceFormat = {}));
(function (TraceFormat) {
    function fromString(value) {
        if (!Is.string(value)) {
            return TraceFormat.Text;
        }
        value = value.toLowerCase();
        if (value === 'json') {
            return TraceFormat.JSON;
        }
        else {
            return TraceFormat.Text;
        }
    }
    TraceFormat.fromString = fromString;
})(TraceFormat || (exports.TraceFormat = TraceFormat = {}));
var SetTraceNotification;
(function (SetTraceNotification) {
    SetTraceNotification.type = new messages_1.NotificationType('$/setTrace');
})(SetTraceNotification || (exports.SetTraceNotification = SetTraceNotification = {}));
var LogTraceNotification;
(function (LogTraceNotification) {
    LogTraceNotification.type = new messages_1.NotificationType('$/logTrace');
})(LogTraceNotification || (exports.LogTraceNotification = LogTraceNotification = {}));
var ConnectionErrors;
(function (ConnectionErrors) {
    /**
     * The connection is closed.
     */
    ConnectionErrors[ConnectionErrors["Closed"] = 1] = "Closed";
    /**
     * The connection got disposed.
     */
    ConnectionErrors[ConnectionErrors["Disposed"] = 2] = "Disposed";
    /**
     * The connection is already in listening mode.
     */
    ConnectionErrors[ConnectionErrors["AlreadyListening"] = 3] = "AlreadyListening";
})(ConnectionErrors || (exports.ConnectionErrors = ConnectionErrors = {}));
class ConnectionError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, ConnectionError.prototype);
    }
}
exports.ConnectionError = ConnectionError;
var ConnectionStrategy;
(function (ConnectionStrategy) {
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.cancelUndispatched);
    }
    ConnectionStrategy.is = is;
})(ConnectionStrategy || (exports.ConnectionStrategy = ConnectionStrategy = {}));
var IdCancellationReceiverStrategy;
(function (IdCancellationReceiverStrategy) {
    function is(value) {
        const candidate = value;
        return candidate && (candidate.kind === undefined || candidate.kind === 'id') && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === undefined || Is.func(candidate.dispose));
    }
    IdCancellationReceiverStrategy.is = is;
})(IdCancellationReceiverStrategy || (exports.IdCancellationReceiverStrategy = IdCancellationReceiverStrategy = {}));
var RequestCancellationReceiverStrategy;
(function (RequestCancellationReceiverStrategy) {
    function is(value) {
        const candidate = value;
        return candidate && candidate.kind === 'request' && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === undefined || Is.func(candidate.dispose));
    }
    RequestCancellationReceiverStrategy.is = is;
})(RequestCancellationReceiverStrategy || (exports.RequestCancellationReceiverStrategy = RequestCancellationReceiverStrategy = {}));
var CancellationReceiverStrategy;
(function (CancellationReceiverStrategy) {
    CancellationReceiverStrategy.Message = Object.freeze({
        createCancellationTokenSource(_) {
            return new cancellation_1.CancellationTokenSource();
        }
    });
    function is(value) {
        return IdCancellationReceiverStrategy.is(value) || RequestCancellationReceiverStrategy.is(value);
    }
    CancellationReceiverStrategy.is = is;
})(CancellationReceiverStrategy || (exports.CancellationReceiverStrategy = CancellationReceiverStrategy = {}));
var CancellationSenderStrategy;
(function (CancellationSenderStrategy) {
    CancellationSenderStrategy.Message = Object.freeze({
        sendCancellation(conn, id) {
            return conn.sendNotification(CancelNotification.type, { id });
        },
        cleanup(_) { }
    });
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
    }
    CancellationSenderStrategy.is = is;
})(CancellationSenderStrategy || (exports.CancellationSenderStrategy = CancellationSenderStrategy = {}));
var CancellationStrategy;
(function (CancellationStrategy) {
    CancellationStrategy.Message = Object.freeze({
        receiver: CancellationReceiverStrategy.Message,
        sender: CancellationSenderStrategy.Message
    });
    function is(value) {
        const candidate = value;
        return candidate && CancellationReceiverStrategy.is(candidate.receiver) && CancellationSenderStrategy.is(candidate.sender);
    }
    CancellationStrategy.is = is;
})(CancellationStrategy || (exports.CancellationStrategy = CancellationStrategy = {}));
var MessageStrategy;
(function (MessageStrategy) {
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.handleMessage);
    }
    MessageStrategy.is = is;
})(MessageStrategy || (exports.MessageStrategy = MessageStrategy = {}));
var ConnectionOptions;
(function (ConnectionOptions) {
    function is(value) {
        const candidate = value;
        return candidate
            && (CancellationStrategy.is(candidate.cancellationStrategy) || ConnectionStrategy.is(candidate.connectionStrategy) || MessageStrategy.is(candidate.messageStrategy) || Is.number(candidate.maxParallelism));
    }
    ConnectionOptions.is = is;
})(ConnectionOptions || (exports.ConnectionOptions = ConnectionOptions = {}));
var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["New"] = 1] = "New";
    ConnectionState[ConnectionState["Listening"] = 2] = "Listening";
    ConnectionState[ConnectionState["Closed"] = 3] = "Closed";
    ConnectionState[ConnectionState["Disposed"] = 4] = "Disposed";
})(ConnectionState || (ConnectionState = {}));
function createMessageConnection(messageReader, messageWriter, _logger, options) {
    const logger = _logger !== undefined ? _logger : exports.NullLogger;
    let sequenceNumber = 0;
    let notificationSequenceNumber = 0;
    let unknownResponseSequenceNumber = 0;
    const version = '2.0';
    const maxParallelism = options?.maxParallelism ?? -1;
    let inFlight = 0;
    let starRequestHandler = undefined;
    const requestHandlers = new Map();
    let starNotificationHandler = undefined;
    const notificationHandlers = new Map();
    const progressHandlers = new Map();
    let timer;
    let messageQueue = new linkedMap_1.LinkedMap();
    let responsePromises = new Map();
    let knownCanceledRequests = new Set();
    let requestTokens = new Map();
    let trace = Trace.Off;
    let traceFormat = TraceFormat.Text;
    let tracer;
    let state = ConnectionState.New;
    const errorEmitter = new events_1.Emitter();
    const closeEmitter = new events_1.Emitter();
    const unhandledNotificationEmitter = new events_1.Emitter();
    const unhandledProgressEmitter = new events_1.Emitter();
    const disposeEmitter = new events_1.Emitter();
    const cancellationStrategy = (options && options.cancellationStrategy) ? options.cancellationStrategy : CancellationStrategy.Message;
    function cancelUndispatched(_message) {
        return undefined;
    }
    function isListening() {
        return state === ConnectionState.Listening;
    }
    function isClosed() {
        return state === ConnectionState.Closed;
    }
    function isDisposed() {
        return state === ConnectionState.Disposed;
    }
    function closeHandler() {
        if (state === ConnectionState.New || state === ConnectionState.Listening) {
            state = ConnectionState.Closed;
            closeEmitter.fire(undefined);
        }
        // If the connection is disposed don't sent close events.
    }
    function readErrorHandler(error) {
        errorEmitter.fire([error, undefined, undefined]);
    }
    function writeErrorHandler(data) {
        errorEmitter.fire(data);
    }
    messageReader.onClose(closeHandler);
    messageReader.onError(readErrorHandler);
    messageWriter.onClose(closeHandler);
    messageWriter.onError(writeErrorHandler);
    function createRequestQueueKey(id) {
        if (id === null) {
            throw new Error(`Can't send requests with id null since the response can't be correlated.`);
        }
        return 'req-' + id.toString();
    }
    function createResponseQueueKey(id) {
        if (id === null) {
            return 'res-unknown-' + (++unknownResponseSequenceNumber).toString();
        }
        else {
            return 'res-' + id.toString();
        }
    }
    function createNotificationQueueKey() {
        return 'not-' + (++notificationSequenceNumber).toString();
    }
    function addMessageToQueue(queue, message) {
        if (messages_1.Message.isRequest(message)) {
            queue.set(createRequestQueueKey(message.id), message);
        }
        else if (messages_1.Message.isResponse(message)) {
            // If we have unlimited parallelism we queue the response to keep
            // the previous semantics.
            if (maxParallelism === -1) {
                queue.set(createResponseQueueKey(message.id), message);
            }
            else {
                // If we have limited parallelism we resolve responses to avoid
                // dead locks.
                handleResponse(message);
            }
        }
        else {
            queue.set(createNotificationQueueKey(), message);
        }
    }
    function triggerMessageQueue() {
        if (timer || messageQueue.size === 0) {
            return;
        }
        if (maxParallelism !== -1 && inFlight >= maxParallelism) {
            return;
        }
        timer = (0, ral_1.default)().timer.setImmediate(async () => {
            timer = undefined;
            if (messageQueue.size === 0) {
                return;
            }
            if (maxParallelism !== -1 && inFlight >= maxParallelism) {
                return;
            }
            const message = messageQueue.shift();
            let result;
            try {
                inFlight++;
                const messageStrategy = options?.messageStrategy;
                if (MessageStrategy.is(messageStrategy)) {
                    result = messageStrategy.handleMessage(message, handleMessage);
                }
                else {
                    result = handleMessage(message);
                }
            }
            catch (error) {
                logger.error(`Processing message queue failed: ${error.toString()}`);
            }
            finally {
                if (result instanceof Promise) {
                    result.then(() => {
                        inFlight--;
                        triggerMessageQueue();
                    }).catch((error) => {
                        logger.error(`Processing message queue failed: ${error.toString()}`);
                    });
                }
                else {
                    inFlight--;
                }
                triggerMessageQueue();
            }
        });
    }
    async function handleMessage(message) {
        if (messages_1.Message.isRequest(message)) {
            return handleRequest(message);
        }
        else if (messages_1.Message.isNotification(message)) {
            return handleNotification(message);
        }
        else if (messages_1.Message.isResponse(message)) {
            return handleResponse(message);
        }
        else {
            return handleInvalidMessage(message);
        }
    }
    const callback = (message) => {
        try {
            // We have received a cancellation message. Check if the message is still in the queue
            // and cancel it if allowed to do so.
            if (messages_1.Message.isNotification(message) && message.method === CancelNotification.type.method) {
                const cancelId = message.params.id;
                const key = createRequestQueueKey(cancelId);
                const toCancel = messageQueue.get(key);
                if (messages_1.Message.isRequest(toCancel)) {
                    const strategy = options?.connectionStrategy;
                    const response = (strategy && strategy.cancelUndispatched) ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
                    if (response && (response.error !== undefined || response.result !== undefined)) {
                        messageQueue.delete(key);
                        requestTokens.delete(cancelId);
                        response.id = toCancel.id;
                        traceSendingResponse(response, message.method, Date.now());
                        messageWriter.write(response).catch(() => logger.error(`Sending response for canceled message failed.`));
                        return;
                    }
                }
                const cancellationToken = requestTokens.get(cancelId);
                // The request is already running. Cancel the token
                if (cancellationToken !== undefined) {
                    cancellationToken.cancel();
                    traceReceivedNotification(message);
                    return;
                }
                else {
                    // Remember the cancel but still queue the message to
                    // clean up state in process message.
                    knownCanceledRequests.add(cancelId);
                }
            }
            addMessageToQueue(messageQueue, message);
        }
        finally {
            triggerMessageQueue();
        }
    };
    async function handleRequest(requestMessage) {
        if (isDisposed()) {
            // we return here silently since we fired an event when the
            // connection got disposed.
            return Promise.resolve();
        }
        function reply(resultOrError, method, startTime) {
            const message = {
                jsonrpc: version,
                id: requestMessage.id
            };
            if (resultOrError instanceof messages_1.ResponseError) {
                message.error = resultOrError.toJson();
            }
            else {
                message.result = resultOrError === undefined ? null : resultOrError;
            }
            traceSendingResponse(message, method, startTime);
            return messageWriter.write(message);
        }
        function replyError(error, method, startTime) {
            const message = {
                jsonrpc: version,
                id: requestMessage.id,
                error: error.toJson()
            };
            traceSendingResponse(message, method, startTime);
            return messageWriter.write(message);
        }
        traceReceivedRequest(requestMessage);
        const element = requestHandlers.get(requestMessage.method);
        let type;
        let requestHandler;
        if (element) {
            type = element.type;
            requestHandler = element.handler;
        }
        const startTime = Date.now();
        if (requestHandler || starRequestHandler) {
            const tokenKey = requestMessage.id ?? String(Date.now()); //
            const cancellationSource = IdCancellationReceiverStrategy.is(cancellationStrategy.receiver)
                ? cancellationStrategy.receiver.createCancellationTokenSource(tokenKey)
                : cancellationStrategy.receiver.createCancellationTokenSource(requestMessage);
            if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id)) {
                cancellationSource.cancel();
            }
            if (requestMessage.id !== null) {
                requestTokens.set(tokenKey, cancellationSource);
            }
            try {
                let handlerResult;
                if (requestHandler) {
                    if (requestMessage.params === undefined) {
                        if (type !== undefined && type.numberOfParams !== 0) {
                            return replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`), requestMessage.method, startTime);
                        }
                        handlerResult = requestHandler(cancellationSource.token);
                    }
                    else if (Array.isArray(requestMessage.params)) {
                        if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byName) {
                            return replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by name but received parameters by position`), requestMessage.method, startTime);
                        }
                        handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
                    }
                    else {
                        if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                            return replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by position but received parameters by name`), requestMessage.method, startTime);
                        }
                        handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
                    }
                }
                else if (starRequestHandler) {
                    handlerResult = starRequestHandler(requestMessage.method, requestMessage.params, cancellationSource.token);
                }
                const resultOrError = await handlerResult;
                await reply(resultOrError, requestMessage.method, startTime);
            }
            catch (error) {
                if (error instanceof messages_1.ResponseError) {
                    await reply(error, requestMessage.method, startTime);
                }
                else if (error && Is.string(error.message)) {
                    await replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
                }
                else {
                    await replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
                }
            }
            finally {
                requestTokens.delete(tokenKey);
            }
        }
        else {
            await replyError(new messages_1.ResponseError(messages_1.ErrorCodes.MethodNotFound, `Unhandled method ${requestMessage.method}`), requestMessage.method, startTime);
        }
    }
    function handleResponse(responseMessage) {
        if (isDisposed()) {
            // See handle request.
            return;
        }
        if (responseMessage.id === null) {
            if (responseMessage.error) {
                logger.error(`Received response message without id: Error is: \n${JSON.stringify(responseMessage.error, undefined, 4)}`);
            }
            else {
                logger.error(`Received response message without id. No further error information provided.`);
            }
        }
        else {
            const key = responseMessage.id;
            const responsePromise = responsePromises.get(key);
            traceReceivedResponse(responseMessage, responsePromise);
            if (responsePromise !== undefined) {
                responsePromises.delete(key);
                try {
                    if (responseMessage.error) {
                        const error = responseMessage.error;
                        responsePromise.reject(new messages_1.ResponseError(error.code, error.message, error.data));
                    }
                    else if (responseMessage.result !== undefined) {
                        responsePromise.resolve(responseMessage.result);
                    }
                    else {
                        throw new Error('Should never happen.');
                    }
                }
                catch (error) {
                    if (error.message) {
                        logger.error(`Response handler '${responsePromise.method}' failed with message: ${error.message}`);
                    }
                    else {
                        logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
                    }
                }
            }
        }
    }
    async function handleNotification(message) {
        if (isDisposed()) {
            // See handle request.
            return;
        }
        let type = undefined;
        let notificationHandler;
        if (message.method === CancelNotification.type.method) {
            const cancelId = message.params.id;
            knownCanceledRequests.delete(cancelId);
            traceReceivedNotification(message);
            return;
        }
        else {
            const element = notificationHandlers.get(message.method);
            if (element) {
                notificationHandler = element.handler;
                type = element.type;
            }
        }
        if (notificationHandler || starNotificationHandler) {
            try {
                traceReceivedNotification(message);
                if (notificationHandler) {
                    if (message.params === undefined) {
                        if (type !== undefined) {
                            if (type.numberOfParams !== 0 && type.parameterStructures !== messages_1.ParameterStructures.byName) {
                                logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received none.`);
                            }
                        }
                        await notificationHandler();
                    }
                    else if (Array.isArray(message.params)) {
                        // There are JSON-RPC libraries that send progress message as positional params although
                        // specified as named. So convert them if this is the case.
                        const params = message.params;
                        if (message.method === ProgressNotification.type.method && params.length === 2 && ProgressToken.is(params[0])) {
                            await notificationHandler({ token: params[0], value: params[1] });
                        }
                        else {
                            if (type !== undefined) {
                                if (type.parameterStructures === messages_1.ParameterStructures.byName) {
                                    logger.error(`Notification ${message.method} defines parameters by name but received parameters by position`);
                                }
                                if (type.numberOfParams !== message.params.length) {
                                    logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`);
                                }
                            }
                            await notificationHandler(...params);
                        }
                    }
                    else {
                        if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                            logger.error(`Notification ${message.method} defines parameters by position but received parameters by name`);
                        }
                        await notificationHandler(message.params);
                    }
                }
                else if (starNotificationHandler) {
                    await starNotificationHandler(message.method, message.params);
                }
            }
            catch (error) {
                if (error.message) {
                    logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
                }
                else {
                    logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
                }
            }
        }
        else {
            unhandledNotificationEmitter.fire(message);
        }
    }
    function handleInvalidMessage(message) {
        if (!message) {
            logger.error('Received empty message.');
            return;
        }
        logger.error(`Received message which is neither a response nor a notification message:\n${JSON.stringify(message, null, 4)}`);
        // Test whether we find an id to reject the promise
        const responseMessage = message;
        if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
            const key = responseMessage.id;
            const responseHandler = responsePromises.get(key);
            if (responseHandler) {
                responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
            }
        }
    }
    function stringifyTrace(params) {
        if (params === undefined || params === null) {
            return undefined;
        }
        switch (trace) {
            case Trace.Verbose:
                return JSON.stringify(params, null, 4);
            case Trace.Compact:
                return JSON.stringify(params);
            default:
                return undefined;
        }
    }
    function traceSendingRequest(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
                data = `Params: ${stringifyTrace(message.params)}`;
            }
            tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
        }
        else {
            logLSPMessage('send-request', message);
        }
    }
    function traceSendingNotification(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose || trace === Trace.Compact) {
                if (message.params) {
                    data = `Params: ${stringifyTrace(message.params)}`;
                }
                else {
                    data = 'No parameters provided.';
                }
            }
            tracer.log(`Sending notification '${message.method}'.`, data);
        }
        else {
            logLSPMessage('send-notification', message);
        }
    }
    function traceSendingResponse(message, method, startTime) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose || trace === Trace.Compact) {
                if (message.error && message.error.data) {
                    data = `Error data: ${stringifyTrace(message.error.data)}`;
                }
                else {
                    if (message.result) {
                        data = `Result: ${stringifyTrace(message.result)}`;
                    }
                    else if (message.error === undefined) {
                        data = 'No result returned.';
                    }
                }
            }
            tracer.log(`Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`, data);
        }
        else {
            logLSPMessage('send-response', message);
        }
    }
    function traceReceivedRequest(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
                data = `Params: ${stringifyTrace(message.params)}`;
            }
            tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
        }
        else {
            logLSPMessage('receive-request', message);
        }
    }
    function traceReceivedNotification(message) {
        if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose || trace === Trace.Compact) {
                if (message.params) {
                    data = `Params: ${stringifyTrace(message.params)}`;
                }
                else {
                    data = 'No parameters provided.';
                }
            }
            tracer.log(`Received notification '${message.method}'.`, data);
        }
        else {
            logLSPMessage('receive-notification', message);
        }
    }
    function traceReceivedResponse(message, responsePromise) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose || trace === Trace.Compact) {
                if (message.error && message.error.data) {
                    data = `Error data: ${stringifyTrace(message.error.data)}`;
                }
                else {
                    if (message.result) {
                        data = `Result: ${stringifyTrace(message.result)}`;
                    }
                    else if (message.error === undefined) {
                        data = 'No result returned.';
                    }
                }
            }
            if (responsePromise) {
                const error = message.error ? ` Request failed: ${message.error.message} (${message.error.code}).` : '';
                tracer.log(`Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`, data);
            }
            else {
                tracer.log(`Received response ${message.id} without active response promise.`, data);
            }
        }
        else {
            logLSPMessage('receive-response', message);
        }
    }
    function logLSPMessage(type, message) {
        if (!tracer || trace === Trace.Off) {
            return;
        }
        const lspMessage = {
            isLSPMessage: true,
            type,
            message,
            timestamp: Date.now()
        };
        tracer.log(lspMessage);
    }
    function throwIfClosedOrDisposed() {
        if (isClosed()) {
            throw new ConnectionError(ConnectionErrors.Closed, 'Connection is closed.');
        }
        if (isDisposed()) {
            throw new ConnectionError(ConnectionErrors.Disposed, 'Connection is disposed.');
        }
    }
    function throwIfListening() {
        if (isListening()) {
            throw new ConnectionError(ConnectionErrors.AlreadyListening, 'Connection is already listening');
        }
    }
    function throwIfNotListening() {
        if (!isListening()) {
            throw new Error('Call listen() first.');
        }
    }
    function undefinedToNull(param) {
        if (param === undefined) {
            return null;
        }
        else {
            return param;
        }
    }
    function nullToUndefined(param) {
        if (param === null) {
            return undefined;
        }
        else {
            return param;
        }
    }
    function isNamedParam(param) {
        return param !== undefined && param !== null && !Array.isArray(param) && typeof param === 'object';
    }
    function computeSingleParam(parameterStructures, param) {
        switch (parameterStructures) {
            case messages_1.ParameterStructures.auto:
                if (isNamedParam(param)) {
                    return nullToUndefined(param);
                }
                else {
                    return [undefinedToNull(param)];
                }
            case messages_1.ParameterStructures.byName:
                if (!isNamedParam(param)) {
                    throw new Error(`Received parameters by name but param is not an object literal.`);
                }
                return nullToUndefined(param);
            case messages_1.ParameterStructures.byPosition:
                return [undefinedToNull(param)];
            default:
                throw new Error(`Unknown parameter structure ${parameterStructures.toString()}`);
        }
    }
    function computeMessageParams(type, params) {
        let result;
        const numberOfParams = type.numberOfParams;
        switch (numberOfParams) {
            case 0:
                result = undefined;
                break;
            case 1:
                result = computeSingleParam(type.parameterStructures, params[0]);
                break;
            default:
                result = [];
                for (let i = 0; i < params.length && i < numberOfParams; i++) {
                    result.push(undefinedToNull(params[i]));
                }
                if (params.length < numberOfParams) {
                    for (let i = params.length; i < numberOfParams; i++) {
                        result.push(null);
                    }
                }
                break;
        }
        return result;
    }
    const connection = {
        sendNotification: (type, ...args) => {
            throwIfClosedOrDisposed();
            let method;
            let messageParams;
            if (Is.string(type)) {
                method = type;
                const first = args[0];
                let paramStart = 0;
                let parameterStructures = messages_1.ParameterStructures.auto;
                if (messages_1.ParameterStructures.is(first)) {
                    paramStart = 1;
                    parameterStructures = first;
                }
                const paramEnd = args.length;
                const numberOfParams = paramEnd - paramStart;
                switch (numberOfParams) {
                    case 0:
                        messageParams = undefined;
                        break;
                    case 1:
                        messageParams = computeSingleParam(parameterStructures, args[paramStart]);
                        break;
                    default:
                        if (parameterStructures === messages_1.ParameterStructures.byName) {
                            throw new Error(`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`);
                        }
                        messageParams = args.slice(paramStart, paramEnd).map(value => undefinedToNull(value));
                        break;
                }
            }
            else {
                const params = args;
                method = type.method;
                messageParams = computeMessageParams(type, params);
            }
            const notificationMessage = {
                jsonrpc: version,
                method: method,
                params: messageParams
            };
            traceSendingNotification(notificationMessage);
            return messageWriter.write(notificationMessage).catch((error) => {
                logger.error(`Sending notification failed.`);
                throw error;
            });
        },
        onNotification: (type, handler) => {
            throwIfClosedOrDisposed();
            let method;
            if (Is.func(type)) {
                starNotificationHandler = type;
            }
            else if (handler) {
                if (Is.string(type)) {
                    method = type;
                    notificationHandlers.set(type, { type: undefined, handler });
                }
                else {
                    method = type.method;
                    notificationHandlers.set(type.method, { type, handler });
                }
            }
            return {
                dispose: () => {
                    if (method !== undefined) {
                        if (notificationHandlers.get(method)?.handler === handler) {
                            notificationHandlers.delete(method);
                        }
                    }
                    else if (starNotificationHandler === type) {
                        starNotificationHandler = undefined;
                    }
                }
            };
        },
        onProgress: (_type, token, handler) => {
            if (progressHandlers.has(token)) {
                throw new Error(`Progress handler for token ${token} already registered`);
            }
            progressHandlers.set(token, handler);
            return {
                dispose: () => {
                    if (progressHandlers.get(token) === handler) {
                        progressHandlers.delete(token);
                    }
                }
            };
        },
        sendProgress: (_type, token, value) => {
            // This should not await but simple return to ensure that we don't have another
            // async scheduling. Otherwise one send could overtake another send.
            return connection.sendNotification(ProgressNotification.type, { token, value });
        },
        onUnhandledProgress: unhandledProgressEmitter.event,
        sendRequest: (type, ...args) => {
            throwIfClosedOrDisposed();
            throwIfNotListening();
            function sendCancellation(connection, id) {
                const p = cancellationStrategy.sender.sendCancellation(connection, id);
                if (p === undefined) {
                    logger.log(`Received no promise from cancellation strategy when cancelling id ${id}`);
                }
                else {
                    p.catch(() => {
                        logger.log(`Sending cancellation messages for id ${id} failed.`);
                    });
                }
            }
            let method;
            let messageParams;
            let token = undefined;
            if (Is.string(type)) {
                method = type;
                const first = args[0];
                const last = args[args.length - 1];
                let paramStart = 0;
                let parameterStructures = messages_1.ParameterStructures.auto;
                if (messages_1.ParameterStructures.is(first)) {
                    paramStart = 1;
                    parameterStructures = first;
                }
                let paramEnd = args.length;
                if (cancellation_1.CancellationToken.is(last)) {
                    paramEnd = paramEnd - 1;
                    token = last;
                }
                const numberOfParams = paramEnd - paramStart;
                switch (numberOfParams) {
                    case 0:
                        messageParams = undefined;
                        break;
                    case 1:
                        messageParams = computeSingleParam(parameterStructures, args[paramStart]);
                        break;
                    default:
                        if (parameterStructures === messages_1.ParameterStructures.byName) {
                            throw new Error(`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`);
                        }
                        messageParams = args.slice(paramStart, paramEnd).map(value => undefinedToNull(value));
                        break;
                }
            }
            else {
                const params = args;
                method = type.method;
                messageParams = computeMessageParams(type, params);
                const numberOfParams = type.numberOfParams;
                token = cancellation_1.CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : undefined;
            }
            const id = sequenceNumber++;
            let disposable;
            let tokenWasCancelled = false;
            if (token !== undefined) {
                if (token.isCancellationRequested) {
                    tokenWasCancelled = true;
                }
                else {
                    disposable = token.onCancellationRequested(() => {
                        sendCancellation(connection, id);
                    });
                }
            }
            const requestMessage = {
                jsonrpc: version,
                id: id,
                method: method,
                params: messageParams
            };
            traceSendingRequest(requestMessage);
            if (typeof cancellationStrategy.sender.enableCancellation === 'function') {
                cancellationStrategy.sender.enableCancellation(requestMessage);
            }
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
                const resolveWithCleanup = (r) => {
                    resolve(r);
                    cancellationStrategy.sender.cleanup(id);
                    disposable?.dispose();
                };
                const rejectWithCleanup = (r) => {
                    reject(r);
                    cancellationStrategy.sender.cleanup(id);
                    disposable?.dispose();
                };
                const responsePromise = { method: method, timerStart: Date.now(), resolve: resolveWithCleanup, reject: rejectWithCleanup };
                try {
                    responsePromises.set(id, responsePromise);
                    await messageWriter.write(requestMessage);
                    if (tokenWasCancelled) {
                        sendCancellation(connection, id);
                    }
                }
                catch (error) {
                    // Writing the message failed. So we need to delete it from the response promises and
                    // reject it.
                    responsePromises.delete(id);
                    responsePromise.reject(new messages_1.ResponseError(messages_1.ErrorCodes.MessageWriteError, error.message ? error.message : 'Unknown reason'));
                    logger.error(`Sending request failed.`);
                    throw error;
                }
            });
        },
        onRequest: (type, handler) => {
            throwIfClosedOrDisposed();
            let method = null;
            if (StarRequestHandler.is(type)) {
                method = undefined;
                starRequestHandler = type;
            }
            else if (Is.string(type)) {
                method = null;
                if (handler !== undefined) {
                    method = type;
                    requestHandlers.set(type, { handler: handler, type: undefined });
                }
            }
            else {
                if (handler !== undefined) {
                    method = type.method;
                    requestHandlers.set(type.method, { type, handler });
                }
            }
            return {
                dispose: () => {
                    if (method === null) {
                        return;
                    }
                    if (method !== undefined) {
                        if (requestHandlers.get(method)?.handler === handler) {
                            requestHandlers.delete(method);
                        }
                    }
                    else if (starRequestHandler === type) {
                        starRequestHandler = undefined;
                    }
                }
            };
        },
        hasPendingResponse: () => {
            return responsePromises.size > 0;
        },
        trace: async (_value, _tracer, sendNotificationOrTraceOptions) => {
            let _sendNotification = false;
            let _traceFormat = TraceFormat.Text;
            if (sendNotificationOrTraceOptions !== undefined) {
                if (Is.boolean(sendNotificationOrTraceOptions)) {
                    _sendNotification = sendNotificationOrTraceOptions;
                }
                else {
                    _sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
                    _traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
                }
            }
            trace = _value;
            traceFormat = _traceFormat;
            if (trace === Trace.Off) {
                tracer = undefined;
            }
            else {
                tracer = _tracer;
            }
            if (_sendNotification && !isClosed() && !isDisposed()) {
                await connection.sendNotification(SetTraceNotification.type, { value: Trace.toString(_value) });
            }
        },
        onError: errorEmitter.event,
        onClose: closeEmitter.event,
        onUnhandledNotification: unhandledNotificationEmitter.event,
        onDispose: disposeEmitter.event,
        end: () => {
            messageWriter.end();
        },
        dispose: () => {
            if (isDisposed()) {
                return;
            }
            state = ConnectionState.Disposed;
            disposeEmitter.fire(undefined);
            const error = new messages_1.ResponseError(messages_1.ErrorCodes.PendingResponseRejected, 'Pending response rejected since connection got disposed');
            for (const promise of responsePromises.values()) {
                promise.reject(error);
            }
            responsePromises = new Map();
            requestTokens = new Map();
            knownCanceledRequests = new Set();
            messageQueue = new linkedMap_1.LinkedMap();
            // Test for backwards compatibility
            if (Is.func(messageWriter.dispose)) {
                messageWriter.dispose();
            }
            if (Is.func(messageReader.dispose)) {
                messageReader.dispose();
            }
        },
        listen: () => {
            throwIfClosedOrDisposed();
            throwIfListening();
            state = ConnectionState.Listening;
            messageReader.listen(callback);
        },
        inspect: () => {
            (0, ral_1.default)().console.log('inspect');
        }
    };
    connection.onNotification(LogTraceNotification.type, (params) => {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        const verbose = trace === Trace.Verbose || trace === Trace.Compact;
        tracer.log(params.message, verbose ? params.verbose : undefined);
    });
    connection.onNotification(ProgressNotification.type, async (params) => {
        const handler = progressHandlers.get(params.token);
        if (handler) {
            await handler(params.value);
        }
        else {
            unhandledProgressEmitter.fire(params);
        }
    });
    return connection;
}


},
742(__unused_rspack_module, exports) {
"use strict";
var __rspack_unused_export;

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
__rspack_unused_export = ({ value: true });
exports.Disposable = void 0;
var Disposable;
(function (Disposable) {
    function create(func) {
        return {
            dispose: func
        };
    }
    Disposable.create = create;
})(Disposable || (exports.Disposable = Disposable = {}));


},
157(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Emitter = exports.Event = void 0;
const ral_1 = __importDefault(__webpack_require__(29));
var Event;
(function (Event) {
    const _disposable = { dispose() { } };
    Event.None = function () { return _disposable; };
})(Event || (exports.Event = Event = {}));
class CallbackList {
    _callbacks;
    _contexts;
    add(callback, context = null, bucket) {
        if (!this._callbacks) {
            this._callbacks = [];
            this._contexts = [];
        }
        this._callbacks.push(callback);
        this._contexts.push(context);
        if (Array.isArray(bucket)) {
            bucket.push({ dispose: () => this.remove(callback, context) });
        }
    }
    remove(callback, context = null) {
        if (!this._callbacks) {
            return;
        }
        let foundCallbackWithDifferentContext = false;
        for (let i = 0, len = this._callbacks.length; i < len; i++) {
            if (this._callbacks[i] === callback) {
                if (this._contexts[i] === context) {
                    // callback & context match => remove it
                    this._callbacks.splice(i, 1);
                    this._contexts.splice(i, 1);
                    return;
                }
                else {
                    foundCallbackWithDifferentContext = true;
                }
            }
        }
        if (foundCallbackWithDifferentContext) {
            throw new Error('When adding a listener with a context, you should remove it with the same context');
        }
    }
    invoke(...args) {
        if (!this._callbacks) {
            return [];
        }
        const ret = [], callbacks = this._callbacks.slice(0), contexts = this._contexts.slice(0);
        for (let i = 0, len = callbacks.length; i < len; i++) {
            try {
                ret.push(callbacks[i].apply(contexts[i], args));
            }
            catch (e) {
                (0, ral_1.default)().console.error(e);
            }
        }
        return ret;
    }
    isEmpty() {
        return !this._callbacks || this._callbacks.length === 0;
    }
    dispose() {
        this._callbacks = undefined;
        this._contexts = undefined;
    }
}
class Emitter {
    _options;
    static _noop = function () { };
    _event;
    _callbacks;
    constructor(_options) {
        this._options = _options;
    }
    /**
     * For the public to allow to subscribe
     * to events from this Emitter
     */
    get event() {
        if (!this._event) {
            this._event = (listener, thisArgs, disposables) => {
                if (!this._callbacks) {
                    this._callbacks = new CallbackList();
                }
                if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty()) {
                    this._options.onFirstListenerAdd(this);
                }
                this._callbacks.add(listener, thisArgs);
                const result = {
                    dispose: () => {
                        if (!this._callbacks) {
                            // disposable is disposed after emitter is disposed.
                            return;
                        }
                        this._callbacks.remove(listener, thisArgs);
                        result.dispose = Emitter._noop;
                        if (this._options && this._options.onLastListenerRemove && this._callbacks.isEmpty()) {
                            this._options.onLastListenerRemove(this);
                        }
                    }
                };
                if (Array.isArray(disposables)) {
                    disposables.push(result);
                }
                return result;
            };
        }
        return this._event;
    }
    /**
     * To be kept private to fire an event to
     * subscribers
     */
    fire(event) {
        if (this._callbacks) {
            this._callbacks.invoke.call(this._callbacks, event);
        }
    }
    dispose() {
        if (this._callbacks) {
            this._callbacks.dispose();
            this._callbacks = undefined;
        }
    }
}
exports.Emitter = Emitter;


},
928(__unused_rspack_module, exports) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.boolean = boolean;
exports.string = string;
exports.number = number;
exports.error = error;
exports.func = func;
exports.array = array;
exports.stringArray = stringArray;
function boolean(value) {
    return value === true || value === false;
}
function string(value) {
    return typeof value === 'string' || value instanceof String;
}
function number(value) {
    return typeof value === 'number' || value instanceof Number;
}
function error(value) {
    return value instanceof Error;
}
function func(value) {
    return typeof value === 'function';
}
function array(value) {
    return Array.isArray(value);
}
function stringArray(value) {
    return array(value) && value.every(elem => string(elem));
}


},
819(__unused_rspack_module, exports) {
"use strict";
var __rspack_unused_export;

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
__rspack_unused_export = ({ value: true });
exports.LRUCache = exports.LinkedMap = exports.Touch = void 0;
var Touch;
(function (Touch) {
    Touch.None = 0;
    Touch.First = 1;
    Touch.AsOld = Touch.First;
    Touch.Last = 2;
    Touch.AsNew = Touch.Last;
})(Touch || (exports.Touch = Touch = {}));
class LinkedMap {
    [Symbol.toStringTag] = 'LinkedMap';
    _map;
    _head;
    _tail;
    _size;
    _state;
    constructor() {
        this._map = new Map();
        this._head = undefined;
        this._tail = undefined;
        this._size = 0;
        this._state = 0;
    }
    clear() {
        this._map.clear();
        this._head = undefined;
        this._tail = undefined;
        this._size = 0;
        this._state++;
    }
    isEmpty() {
        return !this._head && !this._tail;
    }
    get size() {
        return this._size;
    }
    get first() {
        return this._head?.value;
    }
    get last() {
        return this._tail?.value;
    }
    before(key) {
        const item = this._map.get(key);
        return item ? item.previous?.value : undefined;
    }
    after(key) {
        const item = this._map.get(key);
        return item ? item.next?.value : undefined;
    }
    has(key) {
        return this._map.has(key);
    }
    get(key, touch = Touch.None) {
        const item = this._map.get(key);
        if (!item) {
            return undefined;
        }
        if (touch !== Touch.None) {
            this.touch(item, touch);
        }
        return item.value;
    }
    set(key, value, touch = Touch.None) {
        let item = this._map.get(key);
        if (item) {
            item.value = value;
            if (touch !== Touch.None) {
                this.touch(item, touch);
            }
        }
        else {
            item = { key, value, next: undefined, previous: undefined };
            switch (touch) {
                case Touch.None:
                    this.addItemLast(item);
                    break;
                case Touch.First:
                    this.addItemFirst(item);
                    break;
                case Touch.Last:
                    this.addItemLast(item);
                    break;
                default:
                    this.addItemLast(item);
                    break;
            }
            this._map.set(key, item);
            this._size++;
        }
        return this;
    }
    delete(key) {
        return !!this.remove(key);
    }
    remove(key) {
        const item = this._map.get(key);
        if (!item) {
            return undefined;
        }
        this._map.delete(key);
        this.removeItem(item);
        this._size--;
        return item.value;
    }
    shift() {
        if (!this._head && !this._tail) {
            return undefined;
        }
        if (!this._head || !this._tail) {
            throw new Error('Invalid list');
        }
        const item = this._head;
        this._map.delete(item.key);
        this.removeItem(item);
        this._size--;
        return item.value;
    }
    forEach(callbackfn, thisArg) {
        const state = this._state;
        let current = this._head;
        while (current) {
            if (thisArg) {
                callbackfn.bind(thisArg)(current.value, current.key, this);
            }
            else {
                callbackfn(current.value, current.key, this);
            }
            if (this._state !== state) {
                throw new Error(`LinkedMap got modified during iteration.`);
            }
            current = current.next;
        }
    }
    keys() {
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]: () => {
                return iterator;
            },
            next: () => {
                if (this._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: current.key, done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            }
        };
        return iterator;
    }
    values() {
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]: () => {
                return iterator;
            },
            next: () => {
                if (this._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: current.value, done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            }
        };
        return iterator;
    }
    entries() {
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]: () => {
                return iterator;
            },
            next: () => {
                if (this._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: [current.key, current.value], done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            }
        };
        return iterator;
    }
    [Symbol.iterator]() {
        return this.entries();
    }
    trimOld(newSize) {
        if (newSize >= this.size) {
            return;
        }
        if (newSize === 0) {
            this.clear();
            return;
        }
        let current = this._head;
        let currentSize = this.size;
        while (current && currentSize > newSize) {
            this._map.delete(current.key);
            current = current.next;
            currentSize--;
        }
        this._head = current;
        this._size = currentSize;
        if (current) {
            current.previous = undefined;
        }
        this._state++;
    }
    addItemFirst(item) {
        // First time Insert
        if (!this._head && !this._tail) {
            this._tail = item;
        }
        else if (!this._head) {
            throw new Error('Invalid list');
        }
        else {
            item.next = this._head;
            this._head.previous = item;
        }
        this._head = item;
        this._state++;
    }
    addItemLast(item) {
        // First time Insert
        if (!this._head && !this._tail) {
            this._head = item;
        }
        else if (!this._tail) {
            throw new Error('Invalid list');
        }
        else {
            item.previous = this._tail;
            this._tail.next = item;
        }
        this._tail = item;
        this._state++;
    }
    removeItem(item) {
        if (item === this._head && item === this._tail) {
            this._head = undefined;
            this._tail = undefined;
        }
        else if (item === this._head) {
            // This can only happened if size === 1 which is handle
            // by the case above.
            if (!item.next) {
                throw new Error('Invalid list');
            }
            item.next.previous = undefined;
            this._head = item.next;
        }
        else if (item === this._tail) {
            // This can only happened if size === 1 which is handle
            // by the case above.
            if (!item.previous) {
                throw new Error('Invalid list');
            }
            item.previous.next = undefined;
            this._tail = item.previous;
        }
        else {
            const next = item.next;
            const previous = item.previous;
            if (!next || !previous) {
                throw new Error('Invalid list');
            }
            next.previous = previous;
            previous.next = next;
        }
        item.next = undefined;
        item.previous = undefined;
        this._state++;
    }
    touch(item, touch) {
        if (!this._head || !this._tail) {
            throw new Error('Invalid list');
        }
        if ((touch !== Touch.First && touch !== Touch.Last)) {
            return;
        }
        if (touch === Touch.First) {
            if (item === this._head) {
                return;
            }
            const next = item.next;
            const previous = item.previous;
            // Unlink the item
            if (item === this._tail) {
                // previous must be defined since item was not head but is tail
                // So there are more than on item in the map
                previous.next = undefined;
                this._tail = previous;
            }
            else {
                // Both next and previous are not undefined since item was neither head nor tail.
                next.previous = previous;
                previous.next = next;
            }
            // Insert the node at head
            item.previous = undefined;
            item.next = this._head;
            this._head.previous = item;
            this._head = item;
            this._state++;
        }
        else if (touch === Touch.Last) {
            if (item === this._tail) {
                return;
            }
            const next = item.next;
            const previous = item.previous;
            // Unlink the item.
            if (item === this._head) {
                // next must be defined since item was not tail but is head
                // So there are more than on item in the map
                next.previous = undefined;
                this._head = next;
            }
            else {
                // Both next and previous are not undefined since item was neither head nor tail.
                next.previous = previous;
                previous.next = next;
            }
            item.next = undefined;
            item.previous = this._tail;
            this._tail.next = item;
            this._tail = item;
            this._state++;
        }
    }
    toJSON() {
        const data = [];
        this.forEach((value, key) => {
            data.push([key, value]);
        });
        return data;
    }
    fromJSON(data) {
        this.clear();
        for (const [key, value] of data) {
            this.set(key, value);
        }
    }
}
exports.LinkedMap = LinkedMap;
class LRUCache extends LinkedMap {
    _limit;
    _ratio;
    constructor(limit, ratio = 1) {
        super();
        this._limit = limit;
        this._ratio = Math.min(Math.max(0, ratio), 1);
    }
    get limit() {
        return this._limit;
    }
    set limit(limit) {
        this._limit = limit;
        this.checkTrim();
    }
    get ratio() {
        return this._ratio;
    }
    set ratio(ratio) {
        this._ratio = Math.min(Math.max(0, ratio), 1);
        this.checkTrim();
    }
    get(key, touch = Touch.AsNew) {
        return super.get(key, touch);
    }
    peek(key) {
        return super.get(key, Touch.None);
    }
    set(key, value) {
        super.set(key, value, Touch.Last);
        this.checkTrim();
        return this;
    }
    checkTrim() {
        if (this.size > this._limit) {
            this.trimOld(Math.round(this._limit * this._ratio));
        }
    }
}
exports.LRUCache = LRUCache;


},
399(__unused_rspack_module, exports) {
"use strict";
var __rspack_unused_export;

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
__rspack_unused_export = ({ value: true });
exports.AbstractMessageBuffer = void 0;
const CR = 13;
const LF = 10;
const CRLF = '\r\n';
class AbstractMessageBuffer {
    _encoding;
    _chunks;
    _totalLength;
    constructor(encoding = 'utf-8') {
        this._encoding = encoding;
        this._chunks = [];
        this._totalLength = 0;
    }
    get encoding() {
        return this._encoding;
    }
    append(chunk) {
        const toAppend = typeof chunk === 'string' ? this.fromString(chunk, this._encoding) : chunk;
        this._chunks.push(toAppend);
        this._totalLength += toAppend.byteLength;
    }
    tryReadHeaders(lowerCaseKeys = false) {
        if (this._chunks.length === 0) {
            return undefined;
        }
        let state = 0;
        let chunkIndex = 0;
        let offset = 0;
        let chunkBytesRead = 0;
        row: while (chunkIndex < this._chunks.length) {
            const chunk = this._chunks[chunkIndex];
            offset = 0;
            while (offset < chunk.length) {
                const value = chunk[offset];
                switch (value) {
                    case CR:
                        switch (state) {
                            case 0:
                                state = 1;
                                break;
                            case 2:
                                state = 3;
                                break;
                            default:
                                state = 0;
                        }
                        break;
                    case LF:
                        switch (state) {
                            case 1:
                                state = 2;
                                break;
                            case 3:
                                state = 4;
                                offset++;
                                break row;
                            default:
                                state = 0;
                        }
                        break;
                    default:
                        state = 0;
                }
                offset++;
            }
            chunkBytesRead += chunk.byteLength;
            chunkIndex++;
        }
        if (state !== 4) {
            return undefined;
        }
        // The buffer contains the two CRLF at the end. So we will
        // have two empty lines after the split at the end as well.
        const buffer = this._read(chunkBytesRead + offset);
        const result = new Map();
        const headers = this.toString(buffer, 'ascii').split(CRLF);
        if (headers.length < 2) {
            return result;
        }
        for (let i = 0; i < headers.length - 2; i++) {
            const header = headers[i];
            const index = header.indexOf(':');
            if (index === -1) {
                throw new Error(`Message header must separate key and value using ':'\n${header}`);
            }
            const key = header.substr(0, index);
            const value = header.substr(index + 1).trim();
            result.set(lowerCaseKeys ? key.toLowerCase() : key, value);
        }
        return result;
    }
    tryReadBody(length) {
        if (this._totalLength < length) {
            return undefined;
        }
        return this._read(length);
    }
    get numberOfBytes() {
        return this._totalLength;
    }
    _read(byteCount) {
        if (byteCount === 0) {
            return this.emptyBuffer();
        }
        if (byteCount > this._totalLength) {
            throw new Error(`Cannot read so many bytes!`);
        }
        if (this._chunks[0].byteLength === byteCount) {
            // super fast path, precisely first chunk must be returned
            const chunk = this._chunks[0];
            this._chunks.shift();
            this._totalLength -= byteCount;
            return this.asNative(chunk);
        }
        if (this._chunks[0].byteLength > byteCount) {
            // fast path, the reading is entirely within the first chunk
            const chunk = this._chunks[0];
            const result = this.asNative(chunk, byteCount);
            this._chunks[0] = chunk.slice(byteCount);
            this._totalLength -= byteCount;
            return result;
        }
        const result = this.allocNative(byteCount);
        let resultOffset = 0;
        const chunkIndex = 0;
        while (byteCount > 0) {
            const chunk = this._chunks[chunkIndex];
            if (chunk.byteLength > byteCount) {
                // this chunk will survive
                const chunkPart = chunk.slice(0, byteCount);
                result.set(chunkPart, resultOffset);
                resultOffset += byteCount;
                this._chunks[chunkIndex] = chunk.slice(byteCount);
                this._totalLength -= byteCount;
                byteCount -= byteCount;
            }
            else {
                // this chunk will be entirely read
                result.set(chunk, resultOffset);
                resultOffset += chunk.byteLength;
                this._chunks.shift();
                this._totalLength -= chunk.byteLength;
                byteCount -= chunk.byteLength;
            }
        }
        return result;
    }
}
exports.AbstractMessageBuffer = AbstractMessageBuffer;


},
890(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReadableStreamMessageReader = exports.AbstractMessageReader = exports.MessageReader = void 0;
const ral_1 = __importDefault(__webpack_require__(29));
const Is = __importStar(__webpack_require__(928));
const events_1 = __webpack_require__(157);
const semaphore_1 = __webpack_require__(908);
var MessageReader;
(function (MessageReader) {
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.listen) && Is.func(candidate.dispose) &&
            Is.func(candidate.onError) && Is.func(candidate.onClose) && Is.func(candidate.onPartialMessage);
    }
    MessageReader.is = is;
})(MessageReader || (exports.MessageReader = MessageReader = {}));
class AbstractMessageReader {
    errorEmitter;
    closeEmitter;
    partialMessageEmitter;
    constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
        this.partialMessageEmitter = new events_1.Emitter();
    }
    dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
        this.partialMessageEmitter.dispose();
    }
    get onError() {
        return this.errorEmitter.event;
    }
    fireError(error) {
        this.errorEmitter.fire(this.asError(error));
    }
    get onClose() {
        return this.closeEmitter.event;
    }
    fireClose() {
        this.closeEmitter.fire(undefined);
    }
    get onPartialMessage() {
        return this.partialMessageEmitter.event;
    }
    firePartialMessage(info) {
        this.partialMessageEmitter.fire(info);
    }
    asError(error) {
        if (error instanceof Error) {
            return error;
        }
        else {
            return new Error(`Reader received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
        }
    }
}
exports.AbstractMessageReader = AbstractMessageReader;
var ResolvedMessageReaderOptions;
(function (ResolvedMessageReaderOptions) {
    function fromOptions(options) {
        let charset;
        let result;
        let contentDecoder;
        const contentDecoders = new Map();
        let contentTypeDecoder;
        const contentTypeDecoders = new Map();
        if (options === undefined || typeof options === 'string') {
            charset = options ?? 'utf-8';
        }
        else {
            charset = options.charset ?? 'utf-8';
            if (options.contentDecoder !== undefined) {
                contentDecoder = options.contentDecoder;
                contentDecoders.set(contentDecoder.name, contentDecoder);
            }
            if (options.contentDecoders !== undefined) {
                for (const decoder of options.contentDecoders) {
                    contentDecoders.set(decoder.name, decoder);
                }
            }
            if (options.contentTypeDecoder !== undefined) {
                contentTypeDecoder = options.contentTypeDecoder;
                contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
            }
            if (options.contentTypeDecoders !== undefined) {
                for (const decoder of options.contentTypeDecoders) {
                    contentTypeDecoders.set(decoder.name, decoder);
                }
            }
        }
        if (contentTypeDecoder === undefined) {
            contentTypeDecoder = (0, ral_1.default)().applicationJson.decoder;
            contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
        }
        return { charset, contentDecoder, contentDecoders, contentTypeDecoder, contentTypeDecoders };
    }
    ResolvedMessageReaderOptions.fromOptions = fromOptions;
})(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));
class ReadableStreamMessageReader extends AbstractMessageReader {
    readable;
    options;
    callback;
    nextMessageLength;
    messageToken;
    buffer;
    partialMessageTimer;
    _partialMessageTimeout;
    readSemaphore;
    constructor(readable, options) {
        super();
        this.readable = readable;
        this.options = ResolvedMessageReaderOptions.fromOptions(options);
        this.buffer = (0, ral_1.default)().messageBuffer.create(this.options.charset);
        this._partialMessageTimeout = 10000;
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.readSemaphore = new semaphore_1.Semaphore(1);
    }
    set partialMessageTimeout(timeout) {
        this._partialMessageTimeout = timeout;
    }
    get partialMessageTimeout() {
        return this._partialMessageTimeout;
    }
    listen(callback) {
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.partialMessageTimer = undefined;
        this.callback = callback;
        const result = this.readable.onData((data) => {
            this.onData(data);
        });
        this.readable.onError((error) => this.fireError(error));
        this.readable.onClose(() => this.fireClose());
        return result;
    }
    onData(data) {
        try {
            this.buffer.append(data);
            while (true) {
                if (this.nextMessageLength === -1) {
                    const headers = this.buffer.tryReadHeaders(true);
                    if (!headers) {
                        return;
                    }
                    const contentLength = headers.get('content-length');
                    if (!contentLength) {
                        this.fireError(new Error(`Header must provide a Content-Length property.\n${JSON.stringify(Object.fromEntries(headers))}`));
                        return;
                    }
                    const length = parseInt(contentLength);
                    if (isNaN(length)) {
                        this.fireError(new Error(`Content-Length value must be a number. Got ${contentLength}`));
                        return;
                    }
                    this.nextMessageLength = length;
                }
                const body = this.buffer.tryReadBody(this.nextMessageLength);
                if (body === undefined) {
                    /** We haven't received the full message yet. */
                    this.setPartialMessageTimer();
                    return;
                }
                this.clearPartialMessageTimer();
                this.nextMessageLength = -1;
                // Make sure that we convert one received message after the
                // other. Otherwise it could happen that a decoding of a second
                // smaller message finished before the decoding of a first larger
                // message and then we would deliver the second message first.
                this.readSemaphore.lock(async () => {
                    const bytes = this.options.contentDecoder !== undefined
                        ? await this.options.contentDecoder.decode(body)
                        : body;
                    const message = await this.options.contentTypeDecoder.decode(bytes, this.options);
                    this.callback(message);
                }).catch((error) => {
                    this.fireError(error);
                });
            }
        }
        catch (error) {
            this.fireError(error);
        }
    }
    clearPartialMessageTimer() {
        if (this.partialMessageTimer) {
            this.partialMessageTimer.dispose();
            this.partialMessageTimer = undefined;
        }
    }
    setPartialMessageTimer() {
        this.clearPartialMessageTimer();
        if (this._partialMessageTimeout <= 0) {
            return;
        }
        this.partialMessageTimer = (0, ral_1.default)().timer.setTimeout((token, timeout) => {
            this.partialMessageTimer = undefined;
            if (token === this.messageToken) {
                this.firePartialMessage({ messageToken: token, waitingTime: timeout });
                this.setPartialMessageTimer();
            }
        }, this._partialMessageTimeout, this.messageToken, this._partialMessageTimeout);
    }
}
exports.ReadableStreamMessageReader = ReadableStreamMessageReader;


},
282(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WriteableStreamMessageWriter = exports.AbstractMessageWriter = exports.MessageWriter = void 0;
const ral_1 = __importDefault(__webpack_require__(29));
const Is = __importStar(__webpack_require__(928));
const semaphore_1 = __webpack_require__(908);
const events_1 = __webpack_require__(157);
const ContentLength = 'Content-Length: ';
const CRLF = '\r\n';
var MessageWriter;
(function (MessageWriter) {
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.dispose) && Is.func(candidate.onClose) &&
            Is.func(candidate.onError) && Is.func(candidate.write);
    }
    MessageWriter.is = is;
})(MessageWriter || (exports.MessageWriter = MessageWriter = {}));
class AbstractMessageWriter {
    errorEmitter;
    closeEmitter;
    constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
    }
    dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
    }
    get onError() {
        return this.errorEmitter.event;
    }
    fireError(error, message, count) {
        this.errorEmitter.fire([this.asError(error), message, count]);
    }
    get onClose() {
        return this.closeEmitter.event;
    }
    fireClose() {
        this.closeEmitter.fire(undefined);
    }
    asError(error) {
        if (error instanceof Error) {
            return error;
        }
        else {
            return new Error(`Writer received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
        }
    }
}
exports.AbstractMessageWriter = AbstractMessageWriter;
var ResolvedMessageWriterOptions;
(function (ResolvedMessageWriterOptions) {
    function fromOptions(options) {
        if (options === undefined || typeof options === 'string') {
            return { charset: options ?? 'utf-8', contentTypeEncoder: (0, ral_1.default)().applicationJson.encoder };
        }
        else {
            return { charset: options.charset ?? 'utf-8', contentEncoder: options.contentEncoder, contentTypeEncoder: options.contentTypeEncoder ?? (0, ral_1.default)().applicationJson.encoder };
        }
    }
    ResolvedMessageWriterOptions.fromOptions = fromOptions;
})(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));
class WriteableStreamMessageWriter extends AbstractMessageWriter {
    writable;
    options;
    errorCount;
    writeSemaphore;
    constructor(writable, options) {
        super();
        this.writable = writable;
        this.options = ResolvedMessageWriterOptions.fromOptions(options);
        this.errorCount = 0;
        this.writeSemaphore = new semaphore_1.Semaphore(1);
        this.writable.onError((error) => this.fireError(error));
        this.writable.onClose(() => this.fireClose());
    }
    async write(msg) {
        return this.writeSemaphore.lock(async () => {
            const payload = this.options.contentTypeEncoder.encode(msg, this.options).then((buffer) => {
                if (this.options.contentEncoder !== undefined) {
                    return this.options.contentEncoder.encode(buffer);
                }
                else {
                    return buffer;
                }
            });
            return payload.then((buffer) => {
                const headers = [];
                headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
                headers.push(CRLF);
                return this.doWrite(msg, headers, buffer);
            }, (error) => {
                this.fireError(error);
                throw error;
            });
        });
    }
    async doWrite(msg, headers, data) {
        try {
            await this.writable.write(headers.join(''), 'ascii');
            return this.writable.write(data);
        }
        catch (error) {
            this.handleError(error, msg);
            return Promise.reject(error);
        }
    }
    handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
    }
    end() {
        this.writable.end();
    }
}
exports.WriteableStreamMessageWriter = WriteableStreamMessageWriter;


},
28(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Message = exports.NotificationType9 = exports.NotificationType8 = exports.NotificationType7 = exports.NotificationType6 = exports.NotificationType5 = exports.NotificationType4 = exports.NotificationType3 = exports.NotificationType2 = exports.NotificationType1 = exports.NotificationType0 = exports.NotificationType = exports.RequestType9 = exports.RequestType8 = exports.RequestType7 = exports.RequestType6 = exports.RequestType5 = exports.RequestType4 = exports.RequestType3 = exports.RequestType2 = exports.RequestType1 = exports.RequestType = exports.RequestType0 = exports.AbstractMessageSignature = exports.ParameterStructures = exports.ResponseError = exports.ErrorCodes = void 0;
const is = __importStar(__webpack_require__(928));
/**
 * Predefined error codes.
 */
var ErrorCodes;
(function (ErrorCodes) {
    // Defined by JSON RPC
    ErrorCodes.ParseError = -32700;
    ErrorCodes.InvalidRequest = -32600;
    ErrorCodes.MethodNotFound = -32601;
    ErrorCodes.InvalidParams = -32602;
    ErrorCodes.InternalError = -32603;
    /**
     * This is the start range of JSON RPC reserved error codes.
     * It doesn't denote a real error code. No application error codes should
     * be defined between the start and end range. For backwards
     * compatibility the `ServerNotInitialized` and the `UnknownErrorCode`
     * are left in the range.
     *
     * @since 3.16.0
    */
    ErrorCodes.jsonrpcReservedErrorRangeStart = -32099;
    /** @deprecated use  jsonrpcReservedErrorRangeStart */
    ErrorCodes.serverErrorStart = -32099;
    /**
     * An error occurred when write a message to the transport layer.
     */
    ErrorCodes.MessageWriteError = -32099;
    /**
     * An error occurred when reading a message from the transport layer.
     */
    ErrorCodes.MessageReadError = -32098;
    /**
     * The connection got disposed or lost and all pending responses got
     * rejected.
     */
    ErrorCodes.PendingResponseRejected = -32097;
    /**
     * The connection is inactive and a use of it failed.
     */
    ErrorCodes.ConnectionInactive = -32096;
    /**
     * Error code indicating that a server received a notification or
     * request before the server has received the `initialize` request.
     */
    ErrorCodes.ServerNotInitialized = -32002;
    ErrorCodes.UnknownErrorCode = -32001;
    /**
     * This is the end range of JSON RPC reserved error codes.
     * It doesn't denote a real error code.
     *
     * @since 3.16.0
    */
    ErrorCodes.jsonrpcReservedErrorRangeEnd = -32000;
    /** @deprecated use  jsonrpcReservedErrorRangeEnd */
    ErrorCodes.serverErrorEnd = -32000;
})(ErrorCodes || (exports.ErrorCodes = ErrorCodes = {}));
/**
 * An error object return in a response in case a request
 * has failed.
 */
class ResponseError extends Error {
    code;
    data;
    constructor(code, message, data) {
        super(message);
        this.code = is.number(code) ? code : ErrorCodes.UnknownErrorCode;
        this.data = data;
        Object.setPrototypeOf(this, ResponseError.prototype);
    }
    toJson() {
        const result = {
            code: this.code,
            message: this.message
        };
        if (this.data !== undefined) {
            result.data = this.data;
        }
        return result;
    }
}
exports.ResponseError = ResponseError;
class ParameterStructures {
    kind;
    /**
     * The parameter structure is automatically inferred on the number of parameters
     * and the parameter type in case of a single param.
     */
    static auto = new ParameterStructures('auto');
    /**
     * Forces `byPosition` parameter structure. This is useful if you have a single
     * parameter which has a literal type.
     */
    static byPosition = new ParameterStructures('byPosition');
    /**
     * Forces `byName` parameter structure. This is only useful when having a single
     * parameter. The library will report errors if used with a different number of
     * parameters.
     */
    static byName = new ParameterStructures('byName');
    constructor(kind) {
        this.kind = kind;
    }
    static is(value) {
        return value === ParameterStructures.auto || value === ParameterStructures.byName || value === ParameterStructures.byPosition;
    }
    toString() {
        return this.kind;
    }
}
exports.ParameterStructures = ParameterStructures;
/**
 * An abstract implementation of a MessageType.
 */
class AbstractMessageSignature {
    method;
    numberOfParams;
    constructor(method, numberOfParams) {
        this.method = method;
        this.numberOfParams = numberOfParams;
    }
    get parameterStructures() {
        return ParameterStructures.auto;
    }
}
exports.AbstractMessageSignature = AbstractMessageSignature;
/**
 * Classes to type request response pairs
 */
class RequestType0 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 0);
    }
}
exports.RequestType0 = RequestType0;
class RequestType extends AbstractMessageSignature {
    _parameterStructures;
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.RequestType = RequestType;
class RequestType1 extends AbstractMessageSignature {
    _parameterStructures;
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.RequestType1 = RequestType1;
class RequestType2 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 2);
    }
}
exports.RequestType2 = RequestType2;
class RequestType3 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 3);
    }
}
exports.RequestType3 = RequestType3;
class RequestType4 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 4);
    }
}
exports.RequestType4 = RequestType4;
class RequestType5 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 5);
    }
}
exports.RequestType5 = RequestType5;
class RequestType6 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 6);
    }
}
exports.RequestType6 = RequestType6;
class RequestType7 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 7);
    }
}
exports.RequestType7 = RequestType7;
class RequestType8 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 8);
    }
}
exports.RequestType8 = RequestType8;
class RequestType9 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 9);
    }
}
exports.RequestType9 = RequestType9;
class NotificationType extends AbstractMessageSignature {
    _parameterStructures;
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.NotificationType = NotificationType;
class NotificationType0 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 0);
    }
}
exports.NotificationType0 = NotificationType0;
class NotificationType1 extends AbstractMessageSignature {
    _parameterStructures;
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.NotificationType1 = NotificationType1;
class NotificationType2 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 2);
    }
}
exports.NotificationType2 = NotificationType2;
class NotificationType3 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 3);
    }
}
exports.NotificationType3 = NotificationType3;
class NotificationType4 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 4);
    }
}
exports.NotificationType4 = NotificationType4;
class NotificationType5 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 5);
    }
}
exports.NotificationType5 = NotificationType5;
class NotificationType6 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 6);
    }
}
exports.NotificationType6 = NotificationType6;
class NotificationType7 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 7);
    }
}
exports.NotificationType7 = NotificationType7;
class NotificationType8 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 8);
    }
}
exports.NotificationType8 = NotificationType8;
class NotificationType9 extends AbstractMessageSignature {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    _;
    constructor(method) {
        super(method, 9);
    }
}
exports.NotificationType9 = NotificationType9;
var Message;
(function (Message) {
    /**
     * Tests if the given message is a request message
     */
    function isRequest(message) {
        const candidate = message;
        return candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id));
    }
    Message.isRequest = isRequest;
    /**
     * Tests if the given message is a notification message
     */
    function isNotification(message) {
        const candidate = message;
        return candidate && is.string(candidate.method) && message.id === void 0;
    }
    Message.isNotification = isNotification;
    /**
     * Tests if the given message is a response message
     */
    function isResponse(message) {
        const candidate = message;
        return candidate && (candidate.result !== void 0 || !!candidate.error) && (is.string(candidate.id) || is.number(candidate.id) || candidate.id === null);
    }
    Message.isResponse = isResponse;
})(Message || (exports.Message = Message = {}));


},
29(__unused_rspack_module, exports) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
let _ral;
function RAL() {
    if (_ral === undefined) {
        throw new Error(`No runtime abstraction layer installed`);
    }
    return _ral;
}
(function (RAL) {
    function install(ral) {
        if (ral === undefined) {
            throw new Error(`No runtime abstraction layer provided`);
        }
        _ral = ral;
    }
    RAL.install = install;
})(RAL || (RAL = {}));
exports["default"] = RAL;


},
908(__unused_rspack_module, exports, __webpack_require__) {
"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Semaphore = void 0;
const ral_1 = __importDefault(__webpack_require__(29));
class Semaphore {
    _capacity;
    _active;
    _waiting;
    constructor(capacity = 1) {
        if (capacity <= 0) {
            throw new Error('Capacity must be greater than 0');
        }
        this._capacity = capacity;
        this._active = 0;
        this._waiting = [];
    }
    lock(thunk) {
        return new Promise((resolve, reject) => {
            this._waiting.push({ thunk, resolve, reject });
            this.runNext();
        });
    }
    get active() {
        return this._active;
    }
    runNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
            return;
        }
        (0, ral_1.default)().timer.setImmediate(() => this.doRunNext());
    }
    doRunNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
            return;
        }
        const next = this._waiting.shift();
        this._active++;
        if (this._active > this._capacity) {
            throw new Error(`Too many thunks active`);
        }
        try {
            const result = next.thunk();
            if (result instanceof Promise) {
                result.then((value) => {
                    this._active--;
                    next.resolve(value);
                    this.runNext();
                }, (err) => {
                    this._active--;
                    next.reject(err);
                    this.runNext();
                });
            }
            else {
                this._active--;
                next.resolve(result);
                this.runNext();
            }
        }
        catch (err) {
            this._active--;
            next.reject(err);
            this.runNext();
        }
    }
}
exports.Semaphore = Semaphore;


},
595(__unused_rspack_module, exports, __webpack_require__) {
"use strict";
var __rspack_unused_export;

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
__rspack_unused_export = ({ value: true });
exports.SharedArrayReceiverStrategy = exports.SharedArraySenderStrategy = void 0;
const cancellation_1 = __webpack_require__(995);
var CancellationState;
(function (CancellationState) {
    CancellationState.Continue = 0;
    CancellationState.Cancelled = 1;
})(CancellationState || (CancellationState = {}));
class SharedArraySenderStrategy {
    buffers;
    constructor() {
        this.buffers = new Map();
    }
    enableCancellation(request) {
        if (request.id === null) {
            return;
        }
        const buffer = new SharedArrayBuffer(4);
        const data = new Int32Array(buffer, 0, 1);
        data[0] = CancellationState.Continue;
        this.buffers.set(request.id, buffer);
        request.$cancellationData = buffer;
    }
    async sendCancellation(_conn, id) {
        const buffer = this.buffers.get(id);
        if (buffer === undefined) {
            return;
        }
        const data = new Int32Array(buffer, 0, 1);
        Atomics.store(data, 0, CancellationState.Cancelled);
    }
    cleanup(id) {
        this.buffers.delete(id);
    }
    dispose() {
        this.buffers.clear();
    }
}
exports.SharedArraySenderStrategy = SharedArraySenderStrategy;
class SharedArrayBufferCancellationToken {
    data;
    constructor(buffer) {
        this.data = new Int32Array(buffer, 0, 1);
    }
    get isCancellationRequested() {
        return Atomics.load(this.data, 0) === CancellationState.Cancelled;
    }
    get onCancellationRequested() {
        throw new Error(`Cancellation over SharedArrayBuffer doesn't support cancellation events`);
    }
}
class SharedArrayBufferCancellationTokenSource {
    token;
    constructor(buffer) {
        this.token = new SharedArrayBufferCancellationToken(buffer);
    }
    cancel() {
    }
    dispose() {
    }
}
class SharedArrayReceiverStrategy {
    kind = 'request';
    createCancellationTokenSource(request) {
        const buffer = request.$cancellationData;
        if (buffer === undefined) {
            return new cancellation_1.CancellationTokenSource();
        }
        return new SharedArrayBufferCancellationTokenSource(buffer);
    }
}
exports.SharedArrayReceiverStrategy = SharedArrayReceiverStrategy;


},
404() {
/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var Reflect;
(function (Reflect) {
    // Metadata Proposal
    // https://rbuckton.github.io/reflect-metadata/
    (function (factory) {
        var root = typeof globalThis === "object" ? globalThis :
            typeof global === "object" ? global :
                typeof self === "object" ? self :
                    typeof this === "object" ? this :
                        sloppyModeThis();
        var exporter = makeExporter(Reflect);
        if (typeof root.Reflect !== "undefined") {
            exporter = makeExporter(root.Reflect, exporter);
        }
        factory(exporter, root);
        if (typeof root.Reflect === "undefined") {
            root.Reflect = Reflect;
        }
        function makeExporter(target, previous) {
            return function (key, value) {
                Object.defineProperty(target, key, { configurable: true, writable: true, value: value });
                if (previous)
                    previous(key, value);
            };
        }
        function functionThis() {
            try {
                return Function("return this;")();
            }
            catch (_) { }
        }
        function indirectEvalThis() {
            try {
                return (void 0, eval)("(function() { return this; })()");
            }
            catch (_) { }
        }
        function sloppyModeThis() {
            return functionThis() || indirectEvalThis();
        }
    })(function (exporter, root) {
        var hasOwn = Object.prototype.hasOwnProperty;
        // feature test for Symbol support
        var supportsSymbol = typeof Symbol === "function";
        var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
        var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
        var supportsCreate = typeof Object.create === "function"; // feature test for Object.create support
        var supportsProto = { __proto__: [] } instanceof Array; // feature test for __proto__ support
        var downLevel = !supportsCreate && !supportsProto;
        var HashMap = {
            // create an object in dictionary mode (a.k.a. "slow" mode in v8)
            create: supportsCreate
                ? function () { return MakeDictionary(Object.create(null)); }
                : supportsProto
                    ? function () { return MakeDictionary({ __proto__: null }); }
                    : function () { return MakeDictionary({}); },
            has: downLevel
                ? function (map, key) { return hasOwn.call(map, key); }
                : function (map, key) { return key in map; },
            get: downLevel
                ? function (map, key) { return hasOwn.call(map, key) ? map[key] : undefined; }
                : function (map, key) { return map[key]; },
        };
        // Load global or shim versions of Map, Set, and WeakMap
        var functionPrototype = Object.getPrototypeOf(Function);
        var _Map = typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
        var _Set = typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
        var _WeakMap = typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
        var registrySymbol = supportsSymbol ? Symbol.for("@reflect-metadata:registry") : undefined;
        var metadataRegistry = GetOrCreateMetadataRegistry();
        var metadataProvider = CreateMetadataProvider(metadataRegistry);
        /**
         * Applies a set of decorators to a property of a target object.
         * @param decorators An array of decorators.
         * @param target The target object.
         * @param propertyKey (Optional) The property key to decorate.
         * @param attributes (Optional) The property descriptor for the target key.
         * @remarks Decorators are applied in reverse order.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Example = Reflect.decorate(decoratorsArray, Example);
         *
         *     // property (on constructor)
         *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Object.defineProperty(Example, "staticMethod",
         *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
         *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
         *
         *     // method (on prototype)
         *     Object.defineProperty(Example.prototype, "method",
         *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
         *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
         *
         */
        function decorate(decorators, target, propertyKey, attributes) {
            if (!IsUndefined(propertyKey)) {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
                    throw new TypeError();
                if (IsNull(attributes))
                    attributes = undefined;
                propertyKey = ToPropertyKey(propertyKey);
                return DecorateProperty(decorators, target, propertyKey, attributes);
            }
            else {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsConstructor(target))
                    throw new TypeError();
                return DecorateConstructor(decorators, target);
            }
        }
        exporter("decorate", decorate);
        // 4.1.2 Reflect.metadata(metadataKey, metadataValue)
        // https://rbuckton.github.io/reflect-metadata/#reflect.metadata
        /**
         * A default metadata decorator factory that can be used on a class, class member, or parameter.
         * @param metadataKey The key for the metadata entry.
         * @param metadataValue The value for the metadata entry.
         * @returns A decorator function.
         * @remarks
         * If `metadataKey` is already defined for the target and target key, the
         * metadataValue for that key will be overwritten.
         * @example
         *
         *     // constructor
         *     @Reflect.metadata(key, value)
         *     class Example {
         *     }
         *
         *     // property (on constructor, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticProperty;
         *     }
         *
         *     // property (on prototype, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         property;
         *     }
         *
         *     // method (on constructor)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticMethod() { }
         *     }
         *
         *     // method (on prototype)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         method() { }
         *     }
         *
         */
        function metadata(metadataKey, metadataValue) {
            function decorator(target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
                    throw new TypeError();
                OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
            }
            return decorator;
        }
        exporter("metadata", metadata);
        /**
         * Define a unique metadata entry on the target.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param metadataValue A value that contains attached metadata.
         * @param target The target object on which to define metadata.
         * @param propertyKey (Optional) The property key for the target.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Reflect.defineMetadata("custom:annotation", options, Example);
         *
         *     // property (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
         *
         *     // method (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
         *
         *     // decorator factory as metadata-producing annotation.
         *     function MyAnnotation(options): Decorator {
         *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
         *     }
         *
         */
        function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        exporter("defineMetadata", defineMetadata);
        /**
         * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasMetadata", hasMetadata);
        /**
         * Gets a value indicating whether the target object has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasOwnMetadata", hasOwnMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetMetadata(metadataKey, target, propertyKey);
        }
        exporter("getMetadata", getMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("getOwnMetadata", getOwnMetadata);
        /**
         * Gets the metadata keys defined on the target object or its prototype chain.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "method");
         *
         */
        function getMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryMetadataKeys(target, propertyKey);
        }
        exporter("getMetadataKeys", getMetadataKeys);
        /**
         * Gets the unique metadata keys defined on the target object.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
         *
         */
        function getOwnMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryOwnMetadataKeys(target, propertyKey);
        }
        exporter("getOwnMetadataKeys", getOwnMetadataKeys);
        /**
         * Deletes the metadata entry from the target object with the provided key.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata entry was found and deleted; otherwise, false.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.deleteMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function deleteMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            var provider = GetMetadataProvider(target, propertyKey, /*Create*/ false);
            if (IsUndefined(provider))
                return false;
            return provider.OrdinaryDeleteMetadata(metadataKey, target, propertyKey);
        }
        exporter("deleteMetadata", deleteMetadata);
        function DecorateConstructor(decorators, target) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsConstructor(decorated))
                        throw new TypeError();
                    target = decorated;
                }
            }
            return target;
        }
        function DecorateProperty(decorators, target, propertyKey, descriptor) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target, propertyKey, descriptor);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsObject(decorated))
                        throw new TypeError();
                    descriptor = decorated;
                }
            }
            return descriptor;
        }
        // 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
        function OrdinaryHasMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return true;
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryHasMetadata(MetadataKey, parent, P);
            return false;
        }
        // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
        function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
            var provider = GetMetadataProvider(O, P, /*Create*/ false);
            if (IsUndefined(provider))
                return false;
            return ToBoolean(provider.OrdinaryHasOwnMetadata(MetadataKey, O, P));
        }
        // 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
        function OrdinaryGetMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return OrdinaryGetOwnMetadata(MetadataKey, O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryGetMetadata(MetadataKey, parent, P);
            return undefined;
        }
        // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
        function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
            var provider = GetMetadataProvider(O, P, /*Create*/ false);
            if (IsUndefined(provider))
                return;
            return provider.OrdinaryGetOwnMetadata(MetadataKey, O, P);
        }
        // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
        function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
            var provider = GetMetadataProvider(O, P, /*Create*/ true);
            provider.OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P);
        }
        // 3.1.6.1 OrdinaryMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
        function OrdinaryMetadataKeys(O, P) {
            var ownKeys = OrdinaryOwnMetadataKeys(O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (parent === null)
                return ownKeys;
            var parentKeys = OrdinaryMetadataKeys(parent, P);
            if (parentKeys.length <= 0)
                return ownKeys;
            if (ownKeys.length <= 0)
                return parentKeys;
            var set = new _Set();
            var keys = [];
            for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
                var key = ownKeys_1[_i];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
                var key = parentKeys_1[_a];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            return keys;
        }
        // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
        function OrdinaryOwnMetadataKeys(O, P) {
            var provider = GetMetadataProvider(O, P, /*create*/ false);
            if (!provider) {
                return [];
            }
            return provider.OrdinaryOwnMetadataKeys(O, P);
        }
        // 6 ECMAScript Data Types and Values
        // https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
        function Type(x) {
            if (x === null)
                return 1 /* Null */;
            switch (typeof x) {
                case "undefined": return 0 /* Undefined */;
                case "boolean": return 2 /* Boolean */;
                case "string": return 3 /* String */;
                case "symbol": return 4 /* Symbol */;
                case "number": return 5 /* Number */;
                case "object": return x === null ? 1 /* Null */ : 6 /* Object */;
                default: return 6 /* Object */;
            }
        }
        // 6.1.1 The Undefined Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
        function IsUndefined(x) {
            return x === undefined;
        }
        // 6.1.2 The Null Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
        function IsNull(x) {
            return x === null;
        }
        // 6.1.5 The Symbol Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
        function IsSymbol(x) {
            return typeof x === "symbol";
        }
        // 6.1.7 The Object Type
        // https://tc39.github.io/ecma262/#sec-object-type
        function IsObject(x) {
            return typeof x === "object" ? x !== null : typeof x === "function";
        }
        // 7.1 Type Conversion
        // https://tc39.github.io/ecma262/#sec-type-conversion
        // 7.1.1 ToPrimitive(input [, PreferredType])
        // https://tc39.github.io/ecma262/#sec-toprimitive
        function ToPrimitive(input, PreferredType) {
            switch (Type(input)) {
                case 0 /* Undefined */: return input;
                case 1 /* Null */: return input;
                case 2 /* Boolean */: return input;
                case 3 /* String */: return input;
                case 4 /* Symbol */: return input;
                case 5 /* Number */: return input;
            }
            var hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
            var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
            if (exoticToPrim !== undefined) {
                var result = exoticToPrim.call(input, hint);
                if (IsObject(result))
                    throw new TypeError();
                return result;
            }
            return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
        }
        // 7.1.1.1 OrdinaryToPrimitive(O, hint)
        // https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
        function OrdinaryToPrimitive(O, hint) {
            if (hint === "string") {
                var toString_1 = O.toString;
                if (IsCallable(toString_1)) {
                    var result = toString_1.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            else {
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var toString_2 = O.toString;
                if (IsCallable(toString_2)) {
                    var result = toString_2.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            throw new TypeError();
        }
        // 7.1.2 ToBoolean(argument)
        // https://tc39.github.io/ecma262/2016/#sec-toboolean
        function ToBoolean(argument) {
            return !!argument;
        }
        // 7.1.12 ToString(argument)
        // https://tc39.github.io/ecma262/#sec-tostring
        function ToString(argument) {
            return "" + argument;
        }
        // 7.1.14 ToPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-topropertykey
        function ToPropertyKey(argument) {
            var key = ToPrimitive(argument, 3 /* String */);
            if (IsSymbol(key))
                return key;
            return ToString(key);
        }
        // 7.2 Testing and Comparison Operations
        // https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations
        // 7.2.2 IsArray(argument)
        // https://tc39.github.io/ecma262/#sec-isarray
        function IsArray(argument) {
            return Array.isArray
                ? Array.isArray(argument)
                : argument instanceof Object
                    ? argument instanceof Array
                    : Object.prototype.toString.call(argument) === "[object Array]";
        }
        // 7.2.3 IsCallable(argument)
        // https://tc39.github.io/ecma262/#sec-iscallable
        function IsCallable(argument) {
            // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
            return typeof argument === "function";
        }
        // 7.2.4 IsConstructor(argument)
        // https://tc39.github.io/ecma262/#sec-isconstructor
        function IsConstructor(argument) {
            // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
            return typeof argument === "function";
        }
        // 7.2.7 IsPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-ispropertykey
        function IsPropertyKey(argument) {
            switch (Type(argument)) {
                case 3 /* String */: return true;
                case 4 /* Symbol */: return true;
                default: return false;
            }
        }
        function SameValueZero(x, y) {
            return x === y || x !== x && y !== y;
        }
        // 7.3 Operations on Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-objects
        // 7.3.9 GetMethod(V, P)
        // https://tc39.github.io/ecma262/#sec-getmethod
        function GetMethod(V, P) {
            var func = V[P];
            if (func === undefined || func === null)
                return undefined;
            if (!IsCallable(func))
                throw new TypeError();
            return func;
        }
        // 7.4 Operations on Iterator Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
        function GetIterator(obj) {
            var method = GetMethod(obj, iteratorSymbol);
            if (!IsCallable(method))
                throw new TypeError(); // from Call
            var iterator = method.call(obj);
            if (!IsObject(iterator))
                throw new TypeError();
            return iterator;
        }
        // 7.4.4 IteratorValue(iterResult)
        // https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
        function IteratorValue(iterResult) {
            return iterResult.value;
        }
        // 7.4.5 IteratorStep(iterator)
        // https://tc39.github.io/ecma262/#sec-iteratorstep
        function IteratorStep(iterator) {
            var result = iterator.next();
            return result.done ? false : result;
        }
        // 7.4.6 IteratorClose(iterator, completion)
        // https://tc39.github.io/ecma262/#sec-iteratorclose
        function IteratorClose(iterator) {
            var f = iterator["return"];
            if (f)
                f.call(iterator);
        }
        // 9.1 Ordinary Object Internal Methods and Internal Slots
        // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
        // 9.1.1.1 OrdinaryGetPrototypeOf(O)
        // https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
        function OrdinaryGetPrototypeOf(O) {
            var proto = Object.getPrototypeOf(O);
            if (typeof O !== "function" || O === functionPrototype)
                return proto;
            // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
            // Try to determine the superclass constructor. Compatible implementations
            // must either set __proto__ on a subclass constructor to the superclass constructor,
            // or ensure each class has a valid `constructor` property on its prototype that
            // points back to the constructor.
            // If this is not the same as Function.[[Prototype]], then this is definately inherited.
            // This is the case when in ES6 or when using __proto__ in a compatible browser.
            if (proto !== functionPrototype)
                return proto;
            // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
            var prototype = O.prototype;
            var prototypeProto = prototype && Object.getPrototypeOf(prototype);
            if (prototypeProto == null || prototypeProto === Object.prototype)
                return proto;
            // If the constructor was not a function, then we cannot determine the heritage.
            var constructor = prototypeProto.constructor;
            if (typeof constructor !== "function")
                return proto;
            // If we have some kind of self-reference, then we cannot determine the heritage.
            if (constructor === O)
                return proto;
            // we have a pretty good guess at the heritage.
            return constructor;
        }
        // Global metadata registry
        // - Allows `import "reflect-metadata"` and `import "reflect-metadata/no-conflict"` to interoperate.
        // - Uses isolated metadata if `Reflect` is frozen before the registry can be installed.
        /**
         * Creates a registry used to allow multiple `reflect-metadata` providers.
         */
        function CreateMetadataRegistry() {
            var fallback;
            if (!IsUndefined(registrySymbol) &&
                typeof root.Reflect !== "undefined" &&
                !(registrySymbol in root.Reflect) &&
                typeof root.Reflect.defineMetadata === "function") {
                // interoperate with older version of `reflect-metadata` that did not support a registry.
                fallback = CreateFallbackProvider(root.Reflect);
            }
            var first;
            var second;
            var rest;
            var targetProviderMap = new _WeakMap();
            var registry = {
                registerProvider: registerProvider,
                getProvider: getProvider,
                setProvider: setProvider,
            };
            return registry;
            function registerProvider(provider) {
                if (!Object.isExtensible(registry)) {
                    throw new Error("Cannot add provider to a frozen registry.");
                }
                switch (true) {
                    case fallback === provider: break;
                    case IsUndefined(first):
                        first = provider;
                        break;
                    case first === provider: break;
                    case IsUndefined(second):
                        second = provider;
                        break;
                    case second === provider: break;
                    default:
                        if (rest === undefined)
                            rest = new _Set();
                        rest.add(provider);
                        break;
                }
            }
            function getProviderNoCache(O, P) {
                if (!IsUndefined(first)) {
                    if (first.isProviderFor(O, P))
                        return first;
                    if (!IsUndefined(second)) {
                        if (second.isProviderFor(O, P))
                            return first;
                        if (!IsUndefined(rest)) {
                            var iterator = GetIterator(rest);
                            while (true) {
                                var next = IteratorStep(iterator);
                                if (!next) {
                                    return undefined;
                                }
                                var provider = IteratorValue(next);
                                if (provider.isProviderFor(O, P)) {
                                    IteratorClose(iterator);
                                    return provider;
                                }
                            }
                        }
                    }
                }
                if (!IsUndefined(fallback) && fallback.isProviderFor(O, P)) {
                    return fallback;
                }
                return undefined;
            }
            function getProvider(O, P) {
                var providerMap = targetProviderMap.get(O);
                var provider;
                if (!IsUndefined(providerMap)) {
                    provider = providerMap.get(P);
                }
                if (!IsUndefined(provider)) {
                    return provider;
                }
                provider = getProviderNoCache(O, P);
                if (!IsUndefined(provider)) {
                    if (IsUndefined(providerMap)) {
                        providerMap = new _Map();
                        targetProviderMap.set(O, providerMap);
                    }
                    providerMap.set(P, provider);
                }
                return provider;
            }
            function hasProvider(provider) {
                if (IsUndefined(provider))
                    throw new TypeError();
                return first === provider || second === provider || !IsUndefined(rest) && rest.has(provider);
            }
            function setProvider(O, P, provider) {
                if (!hasProvider(provider)) {
                    throw new Error("Metadata provider not registered.");
                }
                var existingProvider = getProvider(O, P);
                if (existingProvider !== provider) {
                    if (!IsUndefined(existingProvider)) {
                        return false;
                    }
                    var providerMap = targetProviderMap.get(O);
                    if (IsUndefined(providerMap)) {
                        providerMap = new _Map();
                        targetProviderMap.set(O, providerMap);
                    }
                    providerMap.set(P, provider);
                }
                return true;
            }
        }
        /**
         * Gets or creates the shared registry of metadata providers.
         */
        function GetOrCreateMetadataRegistry() {
            var metadataRegistry;
            if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
                metadataRegistry = root.Reflect[registrySymbol];
            }
            if (IsUndefined(metadataRegistry)) {
                metadataRegistry = CreateMetadataRegistry();
            }
            if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
                Object.defineProperty(root.Reflect, registrySymbol, {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: metadataRegistry
                });
            }
            return metadataRegistry;
        }
        function CreateMetadataProvider(registry) {
            // [[Metadata]] internal slot
            // https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
            var metadata = new _WeakMap();
            var provider = {
                isProviderFor: function (O, P) {
                    var targetMetadata = metadata.get(O);
                    if (IsUndefined(targetMetadata))
                        return false;
                    return targetMetadata.has(P);
                },
                OrdinaryDefineOwnMetadata: OrdinaryDefineOwnMetadata,
                OrdinaryHasOwnMetadata: OrdinaryHasOwnMetadata,
                OrdinaryGetOwnMetadata: OrdinaryGetOwnMetadata,
                OrdinaryOwnMetadataKeys: OrdinaryOwnMetadataKeys,
                OrdinaryDeleteMetadata: OrdinaryDeleteMetadata,
            };
            metadataRegistry.registerProvider(provider);
            return provider;
            function GetOrCreateMetadataMap(O, P, Create) {
                var targetMetadata = metadata.get(O);
                var createdTargetMetadata = false;
                if (IsUndefined(targetMetadata)) {
                    if (!Create)
                        return undefined;
                    targetMetadata = new _Map();
                    metadata.set(O, targetMetadata);
                    createdTargetMetadata = true;
                }
                var metadataMap = targetMetadata.get(P);
                if (IsUndefined(metadataMap)) {
                    if (!Create)
                        return undefined;
                    metadataMap = new _Map();
                    targetMetadata.set(P, metadataMap);
                    if (!registry.setProvider(O, P, provider)) {
                        targetMetadata.delete(P);
                        if (createdTargetMetadata) {
                            metadata.delete(O);
                        }
                        throw new Error("Wrong provider for target.");
                    }
                }
                return metadataMap;
            }
            // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
            function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return false;
                return ToBoolean(metadataMap.has(MetadataKey));
            }
            // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
            function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return undefined;
                return metadataMap.get(MetadataKey);
            }
            // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
            function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
                metadataMap.set(MetadataKey, MetadataValue);
            }
            // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
            function OrdinaryOwnMetadataKeys(O, P) {
                var keys = [];
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return keys;
                var keysObj = metadataMap.keys();
                var iterator = GetIterator(keysObj);
                var k = 0;
                while (true) {
                    var next = IteratorStep(iterator);
                    if (!next) {
                        keys.length = k;
                        return keys;
                    }
                    var nextValue = IteratorValue(next);
                    try {
                        keys[k] = nextValue;
                    }
                    catch (e) {
                        try {
                            IteratorClose(iterator);
                        }
                        finally {
                            throw e;
                        }
                    }
                    k++;
                }
            }
            function OrdinaryDeleteMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return false;
                if (!metadataMap.delete(MetadataKey))
                    return false;
                if (metadataMap.size === 0) {
                    var targetMetadata = metadata.get(O);
                    if (!IsUndefined(targetMetadata)) {
                        targetMetadata.delete(P);
                        if (targetMetadata.size === 0) {
                            metadata.delete(targetMetadata);
                        }
                    }
                }
                return true;
            }
        }
        function CreateFallbackProvider(reflect) {
            var defineMetadata = reflect.defineMetadata, hasOwnMetadata = reflect.hasOwnMetadata, getOwnMetadata = reflect.getOwnMetadata, getOwnMetadataKeys = reflect.getOwnMetadataKeys, deleteMetadata = reflect.deleteMetadata;
            var metadataOwner = new _WeakMap();
            var provider = {
                isProviderFor: function (O, P) {
                    var metadataPropertySet = metadataOwner.get(O);
                    if (!IsUndefined(metadataPropertySet) && metadataPropertySet.has(P)) {
                        return true;
                    }
                    if (getOwnMetadataKeys(O, P).length) {
                        if (IsUndefined(metadataPropertySet)) {
                            metadataPropertySet = new _Set();
                            metadataOwner.set(O, metadataPropertySet);
                        }
                        metadataPropertySet.add(P);
                        return true;
                    }
                    return false;
                },
                OrdinaryDefineOwnMetadata: defineMetadata,
                OrdinaryHasOwnMetadata: hasOwnMetadata,
                OrdinaryGetOwnMetadata: getOwnMetadata,
                OrdinaryOwnMetadataKeys: getOwnMetadataKeys,
                OrdinaryDeleteMetadata: deleteMetadata,
            };
            return provider;
        }
        /**
         * Gets the metadata provider for an object. If the object has no metadata provider and this is for a create operation,
         * then this module's metadata provider is assigned to the object.
         */
        function GetMetadataProvider(O, P, Create) {
            var registeredProvider = metadataRegistry.getProvider(O, P);
            if (!IsUndefined(registeredProvider)) {
                return registeredProvider;
            }
            if (Create) {
                if (metadataRegistry.setProvider(O, P, metadataProvider)) {
                    return metadataProvider;
                }
                throw new Error("Illegal state.");
            }
            return undefined;
        }
        // naive Map shim
        function CreateMapPolyfill() {
            var cacheSentinel = {};
            var arraySentinel = [];
            var MapIterator = /** @class */ (function () {
                function MapIterator(keys, values, selector) {
                    this._index = 0;
                    this._keys = keys;
                    this._values = values;
                    this._selector = selector;
                }
                MapIterator.prototype["@@iterator"] = function () { return this; };
                MapIterator.prototype[iteratorSymbol] = function () { return this; };
                MapIterator.prototype.next = function () {
                    var index = this._index;
                    if (index >= 0 && index < this._keys.length) {
                        var result = this._selector(this._keys[index], this._values[index]);
                        if (index + 1 >= this._keys.length) {
                            this._index = -1;
                            this._keys = arraySentinel;
                            this._values = arraySentinel;
                        }
                        else {
                            this._index++;
                        }
                        return { value: result, done: false };
                    }
                    return { value: undefined, done: true };
                };
                MapIterator.prototype.throw = function (error) {
                    if (this._index >= 0) {
                        this._index = -1;
                        this._keys = arraySentinel;
                        this._values = arraySentinel;
                    }
                    throw error;
                };
                MapIterator.prototype.return = function (value) {
                    if (this._index >= 0) {
                        this._index = -1;
                        this._keys = arraySentinel;
                        this._values = arraySentinel;
                    }
                    return { value: value, done: true };
                };
                return MapIterator;
            }());
            var Map = /** @class */ (function () {
                function Map() {
                    this._keys = [];
                    this._values = [];
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                }
                Object.defineProperty(Map.prototype, "size", {
                    get: function () { return this._keys.length; },
                    enumerable: true,
                    configurable: true
                });
                Map.prototype.has = function (key) { return this._find(key, /*insert*/ false) >= 0; };
                Map.prototype.get = function (key) {
                    var index = this._find(key, /*insert*/ false);
                    return index >= 0 ? this._values[index] : undefined;
                };
                Map.prototype.set = function (key, value) {
                    var index = this._find(key, /*insert*/ true);
                    this._values[index] = value;
                    return this;
                };
                Map.prototype.delete = function (key) {
                    var index = this._find(key, /*insert*/ false);
                    if (index >= 0) {
                        var size = this._keys.length;
                        for (var i = index + 1; i < size; i++) {
                            this._keys[i - 1] = this._keys[i];
                            this._values[i - 1] = this._values[i];
                        }
                        this._keys.length--;
                        this._values.length--;
                        if (SameValueZero(key, this._cacheKey)) {
                            this._cacheKey = cacheSentinel;
                            this._cacheIndex = -2;
                        }
                        return true;
                    }
                    return false;
                };
                Map.prototype.clear = function () {
                    this._keys.length = 0;
                    this._values.length = 0;
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                };
                Map.prototype.keys = function () { return new MapIterator(this._keys, this._values, getKey); };
                Map.prototype.values = function () { return new MapIterator(this._keys, this._values, getValue); };
                Map.prototype.entries = function () { return new MapIterator(this._keys, this._values, getEntry); };
                Map.prototype["@@iterator"] = function () { return this.entries(); };
                Map.prototype[iteratorSymbol] = function () { return this.entries(); };
                Map.prototype._find = function (key, insert) {
                    if (!SameValueZero(this._cacheKey, key)) {
                        this._cacheIndex = -1;
                        for (var i = 0; i < this._keys.length; i++) {
                            if (SameValueZero(this._keys[i], key)) {
                                this._cacheIndex = i;
                                break;
                            }
                        }
                    }
                    if (this._cacheIndex < 0 && insert) {
                        this._cacheIndex = this._keys.length;
                        this._keys.push(key);
                        this._values.push(undefined);
                    }
                    return this._cacheIndex;
                };
                return Map;
            }());
            return Map;
            function getKey(key, _) {
                return key;
            }
            function getValue(_, value) {
                return value;
            }
            function getEntry(key, value) {
                return [key, value];
            }
        }
        // naive Set shim
        function CreateSetPolyfill() {
            var Set = /** @class */ (function () {
                function Set() {
                    this._map = new _Map();
                }
                Object.defineProperty(Set.prototype, "size", {
                    get: function () { return this._map.size; },
                    enumerable: true,
                    configurable: true
                });
                Set.prototype.has = function (value) { return this._map.has(value); };
                Set.prototype.add = function (value) { return this._map.set(value, value), this; };
                Set.prototype.delete = function (value) { return this._map.delete(value); };
                Set.prototype.clear = function () { this._map.clear(); };
                Set.prototype.keys = function () { return this._map.keys(); };
                Set.prototype.values = function () { return this._map.keys(); };
                Set.prototype.entries = function () { return this._map.entries(); };
                Set.prototype["@@iterator"] = function () { return this.keys(); };
                Set.prototype[iteratorSymbol] = function () { return this.keys(); };
                return Set;
            }());
            return Set;
        }
        // naive WeakMap shim
        function CreateWeakMapPolyfill() {
            var UUID_SIZE = 16;
            var keys = HashMap.create();
            var rootKey = CreateUniqueKey();
            return /** @class */ (function () {
                function WeakMap() {
                    this._key = CreateUniqueKey();
                }
                WeakMap.prototype.has = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? HashMap.has(table, this._key) : false;
                };
                WeakMap.prototype.get = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? HashMap.get(table, this._key) : undefined;
                };
                WeakMap.prototype.set = function (target, value) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ true);
                    table[this._key] = value;
                    return this;
                };
                WeakMap.prototype.delete = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? delete table[this._key] : false;
                };
                WeakMap.prototype.clear = function () {
                    // NOTE: not a real clear, just makes the previous data unreachable
                    this._key = CreateUniqueKey();
                };
                return WeakMap;
            }());
            function CreateUniqueKey() {
                var key;
                do
                    key = "@@WeakMap@@" + CreateUUID();
                while (HashMap.has(keys, key));
                keys[key] = true;
                return key;
            }
            function GetOrCreateWeakMapTable(target, create) {
                if (!hasOwn.call(target, rootKey)) {
                    if (!create)
                        return undefined;
                    Object.defineProperty(target, rootKey, { value: HashMap.create() });
                }
                return target[rootKey];
            }
            function FillRandomBytes(buffer, size) {
                for (var i = 0; i < size; ++i)
                    buffer[i] = Math.random() * 0xff | 0;
                return buffer;
            }
            function GenRandomBytes(size) {
                if (typeof Uint8Array === "function") {
                    var array = new Uint8Array(size);
                    if (typeof crypto !== "undefined") {
                        crypto.getRandomValues(array);
                    }
                    else if (typeof msCrypto !== "undefined") {
                        msCrypto.getRandomValues(array);
                    }
                    else {
                        FillRandomBytes(array, size);
                    }
                    return array;
                }
                return FillRandomBytes(new Array(size), size);
            }
            function CreateUUID() {
                var data = GenRandomBytes(UUID_SIZE);
                // mark as random - RFC 4122 § 4.4
                data[6] = data[6] & 0x4f | 0x40;
                data[8] = data[8] & 0xbf | 0x80;
                var result = "";
                for (var offset = 0; offset < UUID_SIZE; ++offset) {
                    var byte = data[offset];
                    if (offset === 4 || offset === 6 || offset === 8)
                        result += "-";
                    if (byte < 16)
                        result += "0";
                    result += byte.toString(16).toLowerCase();
                }
                return result;
            }
        }
        // uses a heuristic used by v8 and chakra to force an object into dictionary mode.
        function MakeDictionary(obj) {
            obj.__ = undefined;
            delete obj.__;
            return obj;
        }
    });
})(Reflect || (Reflect = {}));


},
784() {
/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var Reflect;
(function (Reflect) {
    // Metadata Proposal
    // https://rbuckton.github.io/reflect-metadata/
    (function (factory) {
        var root = typeof globalThis === "object" ? globalThis :
            typeof global === "object" ? global :
                typeof self === "object" ? self :
                    typeof this === "object" ? this :
                        sloppyModeThis();
        var exporter = makeExporter(Reflect);
        if (typeof root.Reflect !== "undefined") {
            exporter = makeExporter(root.Reflect, exporter);
        }
        factory(exporter, root);
        if (typeof root.Reflect === "undefined") {
            root.Reflect = Reflect;
        }
        function makeExporter(target, previous) {
            return function (key, value) {
                Object.defineProperty(target, key, { configurable: true, writable: true, value: value });
                if (previous)
                    previous(key, value);
            };
        }
        function sloppyModeThis() {
            throw new ReferenceError("globalThis could not be found. Please polyfill globalThis before loading this module.");
        }
    })(function (exporter, root) {
        // feature test for Symbol support
        var supportsSymbol = typeof Symbol === "function";
        var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : fail("Symbol.toPrimitive not found.");
        var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : fail("Symbol.iterator not found.");
        // Load global or shim versions of Map, Set, and WeakMap
        var functionPrototype = Object.getPrototypeOf(Function);
        var _Map = typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : fail("A valid Map constructor could not be found.");
        var _Set = typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : fail("A valid Set constructor could not be found.");
        var _WeakMap = typeof WeakMap === "function" ? WeakMap : fail("A valid WeakMap constructor could not be found.");
        var registrySymbol = supportsSymbol ? Symbol.for("@reflect-metadata:registry") : undefined;
        var metadataRegistry = GetOrCreateMetadataRegistry();
        var metadataProvider = CreateMetadataProvider(metadataRegistry);
        /**
         * Applies a set of decorators to a property of a target object.
         * @param decorators An array of decorators.
         * @param target The target object.
         * @param propertyKey (Optional) The property key to decorate.
         * @param attributes (Optional) The property descriptor for the target key.
         * @remarks Decorators are applied in reverse order.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Example = Reflect.decorate(decoratorsArray, Example);
         *
         *     // property (on constructor)
         *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Object.defineProperty(Example, "staticMethod",
         *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
         *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
         *
         *     // method (on prototype)
         *     Object.defineProperty(Example.prototype, "method",
         *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
         *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
         *
         */
        function decorate(decorators, target, propertyKey, attributes) {
            if (!IsUndefined(propertyKey)) {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
                    throw new TypeError();
                if (IsNull(attributes))
                    attributes = undefined;
                propertyKey = ToPropertyKey(propertyKey);
                return DecorateProperty(decorators, target, propertyKey, attributes);
            }
            else {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsConstructor(target))
                    throw new TypeError();
                return DecorateConstructor(decorators, target);
            }
        }
        exporter("decorate", decorate);
        // 4.1.2 Reflect.metadata(metadataKey, metadataValue)
        // https://rbuckton.github.io/reflect-metadata/#reflect.metadata
        /**
         * A default metadata decorator factory that can be used on a class, class member, or parameter.
         * @param metadataKey The key for the metadata entry.
         * @param metadataValue The value for the metadata entry.
         * @returns A decorator function.
         * @remarks
         * If `metadataKey` is already defined for the target and target key, the
         * metadataValue for that key will be overwritten.
         * @example
         *
         *     // constructor
         *     @Reflect.metadata(key, value)
         *     class Example {
         *     }
         *
         *     // property (on constructor, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticProperty;
         *     }
         *
         *     // property (on prototype, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         property;
         *     }
         *
         *     // method (on constructor)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticMethod() { }
         *     }
         *
         *     // method (on prototype)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         method() { }
         *     }
         *
         */
        function metadata(metadataKey, metadataValue) {
            function decorator(target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
                    throw new TypeError();
                OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
            }
            return decorator;
        }
        exporter("metadata", metadata);
        /**
         * Define a unique metadata entry on the target.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param metadataValue A value that contains attached metadata.
         * @param target The target object on which to define metadata.
         * @param propertyKey (Optional) The property key for the target.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Reflect.defineMetadata("custom:annotation", options, Example);
         *
         *     // property (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
         *
         *     // method (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
         *
         *     // decorator factory as metadata-producing annotation.
         *     function MyAnnotation(options): Decorator {
         *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
         *     }
         *
         */
        function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        exporter("defineMetadata", defineMetadata);
        /**
         * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasMetadata", hasMetadata);
        /**
         * Gets a value indicating whether the target object has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasOwnMetadata", hasOwnMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetMetadata(metadataKey, target, propertyKey);
        }
        exporter("getMetadata", getMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("getOwnMetadata", getOwnMetadata);
        /**
         * Gets the metadata keys defined on the target object or its prototype chain.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "method");
         *
         */
        function getMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryMetadataKeys(target, propertyKey);
        }
        exporter("getMetadataKeys", getMetadataKeys);
        /**
         * Gets the unique metadata keys defined on the target object.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
         *
         */
        function getOwnMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryOwnMetadataKeys(target, propertyKey);
        }
        exporter("getOwnMetadataKeys", getOwnMetadataKeys);
        /**
         * Deletes the metadata entry from the target object with the provided key.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata entry was found and deleted; otherwise, false.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.deleteMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function deleteMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            var provider = GetMetadataProvider(target, propertyKey, /*Create*/ false);
            if (IsUndefined(provider))
                return false;
            return provider.OrdinaryDeleteMetadata(metadataKey, target, propertyKey);
        }
        exporter("deleteMetadata", deleteMetadata);
        function DecorateConstructor(decorators, target) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsConstructor(decorated))
                        throw new TypeError();
                    target = decorated;
                }
            }
            return target;
        }
        function DecorateProperty(decorators, target, propertyKey, descriptor) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target, propertyKey, descriptor);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsObject(decorated))
                        throw new TypeError();
                    descriptor = decorated;
                }
            }
            return descriptor;
        }
        // 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
        function OrdinaryHasMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return true;
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryHasMetadata(MetadataKey, parent, P);
            return false;
        }
        // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
        function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
            var provider = GetMetadataProvider(O, P, /*Create*/ false);
            if (IsUndefined(provider))
                return false;
            return ToBoolean(provider.OrdinaryHasOwnMetadata(MetadataKey, O, P));
        }
        // 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
        function OrdinaryGetMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return OrdinaryGetOwnMetadata(MetadataKey, O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryGetMetadata(MetadataKey, parent, P);
            return undefined;
        }
        // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
        function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
            var provider = GetMetadataProvider(O, P, /*Create*/ false);
            if (IsUndefined(provider))
                return;
            return provider.OrdinaryGetOwnMetadata(MetadataKey, O, P);
        }
        // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
        function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
            var provider = GetMetadataProvider(O, P, /*Create*/ true);
            provider.OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P);
        }
        // 3.1.6.1 OrdinaryMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
        function OrdinaryMetadataKeys(O, P) {
            var ownKeys = OrdinaryOwnMetadataKeys(O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (parent === null)
                return ownKeys;
            var parentKeys = OrdinaryMetadataKeys(parent, P);
            if (parentKeys.length <= 0)
                return ownKeys;
            if (ownKeys.length <= 0)
                return parentKeys;
            var set = new _Set();
            var keys = [];
            for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
                var key = ownKeys_1[_i];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
                var key = parentKeys_1[_a];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            return keys;
        }
        // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
        function OrdinaryOwnMetadataKeys(O, P) {
            var provider = GetMetadataProvider(O, P, /*create*/ false);
            if (!provider) {
                return [];
            }
            return provider.OrdinaryOwnMetadataKeys(O, P);
        }
        // 6 ECMAScript Data Types and Values
        // https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
        function Type(x) {
            if (x === null)
                return 1 /* Null */;
            switch (typeof x) {
                case "undefined": return 0 /* Undefined */;
                case "boolean": return 2 /* Boolean */;
                case "string": return 3 /* String */;
                case "symbol": return 4 /* Symbol */;
                case "number": return 5 /* Number */;
                case "object": return x === null ? 1 /* Null */ : 6 /* Object */;
                default: return 6 /* Object */;
            }
        }
        // 6.1.1 The Undefined Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
        function IsUndefined(x) {
            return x === undefined;
        }
        // 6.1.2 The Null Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
        function IsNull(x) {
            return x === null;
        }
        // 6.1.5 The Symbol Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
        function IsSymbol(x) {
            return typeof x === "symbol";
        }
        // 6.1.7 The Object Type
        // https://tc39.github.io/ecma262/#sec-object-type
        function IsObject(x) {
            return typeof x === "object" ? x !== null : typeof x === "function";
        }
        // 7.1 Type Conversion
        // https://tc39.github.io/ecma262/#sec-type-conversion
        // 7.1.1 ToPrimitive(input [, PreferredType])
        // https://tc39.github.io/ecma262/#sec-toprimitive
        function ToPrimitive(input, PreferredType) {
            switch (Type(input)) {
                case 0 /* Undefined */: return input;
                case 1 /* Null */: return input;
                case 2 /* Boolean */: return input;
                case 3 /* String */: return input;
                case 4 /* Symbol */: return input;
                case 5 /* Number */: return input;
            }
            var hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
            var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
            if (exoticToPrim !== undefined) {
                var result = exoticToPrim.call(input, hint);
                if (IsObject(result))
                    throw new TypeError();
                return result;
            }
            return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
        }
        // 7.1.1.1 OrdinaryToPrimitive(O, hint)
        // https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
        function OrdinaryToPrimitive(O, hint) {
            if (hint === "string") {
                var toString_1 = O.toString;
                if (IsCallable(toString_1)) {
                    var result = toString_1.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            else {
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var toString_2 = O.toString;
                if (IsCallable(toString_2)) {
                    var result = toString_2.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            throw new TypeError();
        }
        // 7.1.2 ToBoolean(argument)
        // https://tc39.github.io/ecma262/2016/#sec-toboolean
        function ToBoolean(argument) {
            return !!argument;
        }
        // 7.1.12 ToString(argument)
        // https://tc39.github.io/ecma262/#sec-tostring
        function ToString(argument) {
            return "" + argument;
        }
        // 7.1.14 ToPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-topropertykey
        function ToPropertyKey(argument) {
            var key = ToPrimitive(argument, 3 /* String */);
            if (IsSymbol(key))
                return key;
            return ToString(key);
        }
        // 7.2 Testing and Comparison Operations
        // https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations
        // 7.2.2 IsArray(argument)
        // https://tc39.github.io/ecma262/#sec-isarray
        function IsArray(argument) {
            return Array.isArray
                ? Array.isArray(argument)
                : argument instanceof Object
                    ? argument instanceof Array
                    : Object.prototype.toString.call(argument) === "[object Array]";
        }
        // 7.2.3 IsCallable(argument)
        // https://tc39.github.io/ecma262/#sec-iscallable
        function IsCallable(argument) {
            // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
            return typeof argument === "function";
        }
        // 7.2.4 IsConstructor(argument)
        // https://tc39.github.io/ecma262/#sec-isconstructor
        function IsConstructor(argument) {
            // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
            return typeof argument === "function";
        }
        // 7.2.7 IsPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-ispropertykey
        function IsPropertyKey(argument) {
            switch (Type(argument)) {
                case 3 /* String */: return true;
                case 4 /* Symbol */: return true;
                default: return false;
            }
        }
        // 7.3 Operations on Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-objects
        // 7.3.9 GetMethod(V, P)
        // https://tc39.github.io/ecma262/#sec-getmethod
        function GetMethod(V, P) {
            var func = V[P];
            if (func === undefined || func === null)
                return undefined;
            if (!IsCallable(func))
                throw new TypeError();
            return func;
        }
        // 7.4 Operations on Iterator Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
        function GetIterator(obj) {
            var method = GetMethod(obj, iteratorSymbol);
            if (!IsCallable(method))
                throw new TypeError(); // from Call
            var iterator = method.call(obj);
            if (!IsObject(iterator))
                throw new TypeError();
            return iterator;
        }
        // 7.4.4 IteratorValue(iterResult)
        // https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
        function IteratorValue(iterResult) {
            return iterResult.value;
        }
        // 7.4.5 IteratorStep(iterator)
        // https://tc39.github.io/ecma262/#sec-iteratorstep
        function IteratorStep(iterator) {
            var result = iterator.next();
            return result.done ? false : result;
        }
        // 7.4.6 IteratorClose(iterator, completion)
        // https://tc39.github.io/ecma262/#sec-iteratorclose
        function IteratorClose(iterator) {
            var f = iterator["return"];
            if (f)
                f.call(iterator);
        }
        // 9.1 Ordinary Object Internal Methods and Internal Slots
        // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
        // 9.1.1.1 OrdinaryGetPrototypeOf(O)
        // https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
        function OrdinaryGetPrototypeOf(O) {
            var proto = Object.getPrototypeOf(O);
            if (typeof O !== "function" || O === functionPrototype)
                return proto;
            // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
            // Try to determine the superclass constructor. Compatible implementations
            // must either set __proto__ on a subclass constructor to the superclass constructor,
            // or ensure each class has a valid `constructor` property on its prototype that
            // points back to the constructor.
            // If this is not the same as Function.[[Prototype]], then this is definately inherited.
            // This is the case when in ES6 or when using __proto__ in a compatible browser.
            if (proto !== functionPrototype)
                return proto;
            // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
            var prototype = O.prototype;
            var prototypeProto = prototype && Object.getPrototypeOf(prototype);
            if (prototypeProto == null || prototypeProto === Object.prototype)
                return proto;
            // If the constructor was not a function, then we cannot determine the heritage.
            var constructor = prototypeProto.constructor;
            if (typeof constructor !== "function")
                return proto;
            // If we have some kind of self-reference, then we cannot determine the heritage.
            if (constructor === O)
                return proto;
            // we have a pretty good guess at the heritage.
            return constructor;
        }
        function fail(e) {
            throw e;
        }
        // Global metadata registry
        // - Allows `import "reflect-metadata"` and `import "reflect-metadata/no-conflict"` to interoperate.
        // - Uses isolated metadata if `Reflect` is frozen before the registry can be installed.
        /**
         * Creates a registry used to allow multiple `reflect-metadata` providers.
         */
        function CreateMetadataRegistry() {
            var fallback;
            if (!IsUndefined(registrySymbol) &&
                typeof root.Reflect !== "undefined" &&
                !(registrySymbol in root.Reflect) &&
                typeof root.Reflect.defineMetadata === "function") {
                // interoperate with older version of `reflect-metadata` that did not support a registry.
                fallback = CreateFallbackProvider(root.Reflect);
            }
            var first;
            var second;
            var rest;
            var targetProviderMap = new _WeakMap();
            var registry = {
                registerProvider: registerProvider,
                getProvider: getProvider,
                setProvider: setProvider,
            };
            return registry;
            function registerProvider(provider) {
                if (!Object.isExtensible(registry)) {
                    throw new Error("Cannot add provider to a frozen registry.");
                }
                switch (true) {
                    case fallback === provider: break;
                    case IsUndefined(first):
                        first = provider;
                        break;
                    case first === provider: break;
                    case IsUndefined(second):
                        second = provider;
                        break;
                    case second === provider: break;
                    default:
                        if (rest === undefined)
                            rest = new _Set();
                        rest.add(provider);
                        break;
                }
            }
            function getProviderNoCache(O, P) {
                if (!IsUndefined(first)) {
                    if (first.isProviderFor(O, P))
                        return first;
                    if (!IsUndefined(second)) {
                        if (second.isProviderFor(O, P))
                            return first;
                        if (!IsUndefined(rest)) {
                            var iterator = GetIterator(rest);
                            while (true) {
                                var next = IteratorStep(iterator);
                                if (!next) {
                                    return undefined;
                                }
                                var provider = IteratorValue(next);
                                if (provider.isProviderFor(O, P)) {
                                    IteratorClose(iterator);
                                    return provider;
                                }
                            }
                        }
                    }
                }
                if (!IsUndefined(fallback) && fallback.isProviderFor(O, P)) {
                    return fallback;
                }
                return undefined;
            }
            function getProvider(O, P) {
                var providerMap = targetProviderMap.get(O);
                var provider;
                if (!IsUndefined(providerMap)) {
                    provider = providerMap.get(P);
                }
                if (!IsUndefined(provider)) {
                    return provider;
                }
                provider = getProviderNoCache(O, P);
                if (!IsUndefined(provider)) {
                    if (IsUndefined(providerMap)) {
                        providerMap = new _Map();
                        targetProviderMap.set(O, providerMap);
                    }
                    providerMap.set(P, provider);
                }
                return provider;
            }
            function hasProvider(provider) {
                if (IsUndefined(provider))
                    throw new TypeError();
                return first === provider || second === provider || !IsUndefined(rest) && rest.has(provider);
            }
            function setProvider(O, P, provider) {
                if (!hasProvider(provider)) {
                    throw new Error("Metadata provider not registered.");
                }
                var existingProvider = getProvider(O, P);
                if (existingProvider !== provider) {
                    if (!IsUndefined(existingProvider)) {
                        return false;
                    }
                    var providerMap = targetProviderMap.get(O);
                    if (IsUndefined(providerMap)) {
                        providerMap = new _Map();
                        targetProviderMap.set(O, providerMap);
                    }
                    providerMap.set(P, provider);
                }
                return true;
            }
        }
        /**
         * Gets or creates the shared registry of metadata providers.
         */
        function GetOrCreateMetadataRegistry() {
            var metadataRegistry;
            if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
                metadataRegistry = root.Reflect[registrySymbol];
            }
            if (IsUndefined(metadataRegistry)) {
                metadataRegistry = CreateMetadataRegistry();
            }
            if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
                Object.defineProperty(root.Reflect, registrySymbol, {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: metadataRegistry
                });
            }
            return metadataRegistry;
        }
        function CreateMetadataProvider(registry) {
            // [[Metadata]] internal slot
            // https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
            var metadata = new _WeakMap();
            var provider = {
                isProviderFor: function (O, P) {
                    var targetMetadata = metadata.get(O);
                    if (IsUndefined(targetMetadata))
                        return false;
                    return targetMetadata.has(P);
                },
                OrdinaryDefineOwnMetadata: OrdinaryDefineOwnMetadata,
                OrdinaryHasOwnMetadata: OrdinaryHasOwnMetadata,
                OrdinaryGetOwnMetadata: OrdinaryGetOwnMetadata,
                OrdinaryOwnMetadataKeys: OrdinaryOwnMetadataKeys,
                OrdinaryDeleteMetadata: OrdinaryDeleteMetadata,
            };
            metadataRegistry.registerProvider(provider);
            return provider;
            function GetOrCreateMetadataMap(O, P, Create) {
                var targetMetadata = metadata.get(O);
                var createdTargetMetadata = false;
                if (IsUndefined(targetMetadata)) {
                    if (!Create)
                        return undefined;
                    targetMetadata = new _Map();
                    metadata.set(O, targetMetadata);
                    createdTargetMetadata = true;
                }
                var metadataMap = targetMetadata.get(P);
                if (IsUndefined(metadataMap)) {
                    if (!Create)
                        return undefined;
                    metadataMap = new _Map();
                    targetMetadata.set(P, metadataMap);
                    if (!registry.setProvider(O, P, provider)) {
                        targetMetadata.delete(P);
                        if (createdTargetMetadata) {
                            metadata.delete(O);
                        }
                        throw new Error("Wrong provider for target.");
                    }
                }
                return metadataMap;
            }
            // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
            function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return false;
                return ToBoolean(metadataMap.has(MetadataKey));
            }
            // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
            function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return undefined;
                return metadataMap.get(MetadataKey);
            }
            // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
            function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
                metadataMap.set(MetadataKey, MetadataValue);
            }
            // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
            // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
            function OrdinaryOwnMetadataKeys(O, P) {
                var keys = [];
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return keys;
                var keysObj = metadataMap.keys();
                var iterator = GetIterator(keysObj);
                var k = 0;
                while (true) {
                    var next = IteratorStep(iterator);
                    if (!next) {
                        keys.length = k;
                        return keys;
                    }
                    var nextValue = IteratorValue(next);
                    try {
                        keys[k] = nextValue;
                    }
                    catch (e) {
                        try {
                            IteratorClose(iterator);
                        }
                        finally {
                            throw e;
                        }
                    }
                    k++;
                }
            }
            function OrdinaryDeleteMetadata(MetadataKey, O, P) {
                var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
                if (IsUndefined(metadataMap))
                    return false;
                if (!metadataMap.delete(MetadataKey))
                    return false;
                if (metadataMap.size === 0) {
                    var targetMetadata = metadata.get(O);
                    if (!IsUndefined(targetMetadata)) {
                        targetMetadata.delete(P);
                        if (targetMetadata.size === 0) {
                            metadata.delete(targetMetadata);
                        }
                    }
                }
                return true;
            }
        }
        function CreateFallbackProvider(reflect) {
            var defineMetadata = reflect.defineMetadata, hasOwnMetadata = reflect.hasOwnMetadata, getOwnMetadata = reflect.getOwnMetadata, getOwnMetadataKeys = reflect.getOwnMetadataKeys, deleteMetadata = reflect.deleteMetadata;
            var metadataOwner = new _WeakMap();
            var provider = {
                isProviderFor: function (O, P) {
                    var metadataPropertySet = metadataOwner.get(O);
                    if (!IsUndefined(metadataPropertySet) && metadataPropertySet.has(P)) {
                        return true;
                    }
                    if (getOwnMetadataKeys(O, P).length) {
                        if (IsUndefined(metadataPropertySet)) {
                            metadataPropertySet = new _Set();
                            metadataOwner.set(O, metadataPropertySet);
                        }
                        metadataPropertySet.add(P);
                        return true;
                    }
                    return false;
                },
                OrdinaryDefineOwnMetadata: defineMetadata,
                OrdinaryHasOwnMetadata: hasOwnMetadata,
                OrdinaryGetOwnMetadata: getOwnMetadata,
                OrdinaryOwnMetadataKeys: getOwnMetadataKeys,
                OrdinaryDeleteMetadata: deleteMetadata,
            };
            return provider;
        }
        /**
         * Gets the metadata provider for an object. If the object has no metadata provider and this is for a create operation,
         * then this module's metadata provider is assigned to the object.
         */
        function GetMetadataProvider(O, P, Create) {
            var registeredProvider = metadataRegistry.getProvider(O, P);
            if (!IsUndefined(registeredProvider)) {
                return registeredProvider;
            }
            if (Create) {
                if (metadataRegistry.setProvider(O, P, metadataProvider)) {
                    return metadataProvider;
                }
                throw new Error("Illegal state.");
            }
            return undefined;
        }
    });
})(Reflect || (Reflect = {}));


},

});
// The module cache
var __webpack_module_cache__ = {};

// The require function
function __webpack_require__(moduleId) {

// Check if module is in cache
var cachedModule = __webpack_module_cache__[moduleId];
if (cachedModule !== undefined) {
return cachedModule.exports;
}
// Create a new module (and put it into the cache)
var module = (__webpack_module_cache__[moduleId] = {
exports: {}
});
// Execute the module function
__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);

// Return the exports of the module
return module.exports;

}

var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";

// EXTERNAL MODULE: ../../node_modules/.pnpm/reflect-metadata@0.2.2/node_modules/reflect-metadata/Reflect.js
var reflect_metadata_Reflect = __webpack_require__(404);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */

var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
  return extendStatics(d, b);
};

function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var tslib_es6_assign = function() {
  tslib_es6_assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
  }
  return tslib_es6_assign.apply(this, arguments);
}

function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
      }
  return t;
}

function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
  return function (target, key) { decorator(target, key, paramIndex); }
}

function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
          if (result === void 0) continue;
          if (result === null || typeof result !== "object") throw new TypeError("Object expected");
          if (_ = accept(result.get)) descriptor.get = _;
          if (_ = accept(result.set)) descriptor.set = _;
          if (_ = accept(result.init)) initializers.unshift(_);
      }
      else if (_ = accept(result)) {
          if (kind === "field") initializers.unshift(_);
          else descriptor[key] = _;
      }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};

function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};

function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
};

function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};

function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
              case 0: case 1: t = op; break;
              case 4: _.label++; return { value: op[1], done: false };
              case 5: _.label++; y = op[1]; op = [0]; continue;
              case 7: op = _.ops.pop(); _.trys.pop(); continue;
              default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                  if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                  if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                  if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                  if (t[2]) _.ops.pop();
                  _.trys.pop(); continue;
          }
          op = body.call(thisArg, _);
      } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
      if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
      next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
      }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  }
  catch (error) { e = { error: error }; }
  finally {
      try {
          if (r && !r.done && (m = i["return"])) m.call(i);
      }
      finally { if (e) throw e.error; }
  }
  return ar;
}

/** @deprecated */
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
      ar = ar.concat(__read(arguments[i]));
  return ar;
}

/** @deprecated */
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
          r[k] = a[j];
  return r;
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
      }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
  function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
  function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
  function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
  function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
  function fulfill(value) { resume("next", value); }
  function reject(value) { resume("throw", value); }
  function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
  function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
  function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
  function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
  return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
  o["default"] = v;
};

var ownKeys = function(o) {
  ownKeys = Object.getOwnPropertyNames || function (o) {
    var ar = [];
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
    return ar;
  };
  return ownKeys(o);
};

function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
  __setModuleDefault(result, mod);
  return result;
}

function __importDefault(mod) {
  return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}

function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
    env.stack.push({ value: value, dispose: dispose, async: async });
  }
  else if (async) {
    env.stack.push({ async: true });
  }
  return value;
}

var _SuppressedError = (/* unused pure expression or super */ null && (typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
}));

function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  var r, s = 0;
  function next() {
    while (r = env.stack.pop()) {
      try {
        if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
        if (r.dispose) {
          var result = r.dispose.call(r.value);
          if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
        }
        else s |= 1;
      }
      catch (e) {
        fail(e);
      }
    }
    if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
    if (env.hasError) throw env.error;
  }
  return next();
}

function __rewriteRelativeImportExtension(path, preserveJsx) {
  if (typeof path === "string" && /^\.\.?\//.test(path)) {
      return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
          return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
      });
  }
  return path;
}

/* export default */ const tslib_es6 = ((/* unused pure expression or super */ null && ({
  __extends,
  __assign: tslib_es6_assign,
  __rest,
  __decorate,
  __param,
  __esDecorate,
  __runInitializers,
  __propKey,
  __setFunctionName,
  __metadata,
  __awaiter,
  __generator,
  __createBinding,
  __exportStar,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __spreadArray,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
  __addDisposableResource,
  __disposeResources,
  __rewriteRelativeImportExtension,
})));

;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+common@2.0.1/node_modules/@inversifyjs/common/lib/common/calculations/isPromise.js
function isPromise(object) {
    const isObjectOrFunction = (typeof object === 'object' && object !== null) ||
        typeof object === 'function';
    return (isObjectOrFunction && typeof object.then === 'function');
}
//# sourceMappingURL=isPromise.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+common@2.0.1/node_modules/@inversifyjs/common/lib/services/calculations/stringifyServiceIdentifier.js
function stringifyServiceIdentifier(serviceIdentifier) {
    switch (typeof serviceIdentifier) {
        case 'string':
        case 'symbol':
            return serviceIdentifier.toString();
        case 'function':
            return serviceIdentifier.name;
        default:
            throw new Error(`Unexpected ${typeof serviceIdentifier} service id type`);
    }
}
//# sourceMappingURL=stringifyServiceIdentifier.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+common@2.0.1/node_modules/@inversifyjs/common/lib/services/models/LazyServiceIdentifier.js
const islazyServiceIdentifierSymbol = Symbol.for('@inversifyjs/common/islazyServiceIdentifier');
class LazyServiceIdentifier {
    [islazyServiceIdentifierSymbol];
    #buildServiceId;
    constructor(buildServiceId) {
        this.#buildServiceId = buildServiceId;
        this[islazyServiceIdentifierSymbol] = true;
    }
    static is(value) {
        return (typeof value === 'object' &&
            value !== null &&
            value[islazyServiceIdentifierSymbol] === true);
    }
    unwrap() {
        return this.#buildServiceId();
    }
}
//# sourceMappingURL=LazyServiceIdentifier.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+common@2.0.1/node_modules/@inversifyjs/common/lib/index.js




//# sourceMappingURL=index.js.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/reflect-metadata@0.2.2/node_modules/reflect-metadata/ReflectLite.js
var ReflectLite = __webpack_require__(784);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/actions/getContainerModuleId.js

const ID_METADATA = '@inversifyjs/container/bindingId';
function getContainerModuleId_getContainerModuleId() {
    const bindingId = getOwnReflectMetadata(Object, ID_METADATA) ?? 0;
    if (bindingId === Number.MAX_SAFE_INTEGER) {
        setReflectMetadata(Object, ID_METADATA, Number.MIN_SAFE_INTEGER);
    }
    else {
        updateOwnReflectMetadata(Object, ID_METADATA, () => bindingId, (id) => id + 1);
    }
    return bindingId;
}
//# sourceMappingURL=getContainerModuleId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/models/ContainerModule.js

class ContainerModule {
    #id;
    #load;
    constructor(load) {
        this.#id = getContainerModuleId();
        this.#load = load;
    }
    get id() {
        return this.#id;
    }
    load(options) {
        return this.#load(options);
    }
}
//# sourceMappingURL=ContainerModule.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+reflect-metadata-utils@1.5.0_reflect-metadata@0.2.2/node_modules/@inversifyjs/reflect-metadata-utils/lib/reflectMetadata/utils/getOwnReflectMetadata.js
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function getOwnReflectMetadata_getOwnReflectMetadata(target, metadataKey, propertyKey) {
    return Reflect.getOwnMetadata(metadataKey, target, propertyKey);
}
//# sourceMappingURL=getOwnReflectMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+reflect-metadata-utils@1.5.0_reflect-metadata@0.2.2/node_modules/@inversifyjs/reflect-metadata-utils/lib/reflectMetadata/utils/setReflectMetadata.js
function setReflectMetadata_setReflectMetadata(target, metadataKey, metadata, propertyKey) {
    Reflect.defineMetadata(metadataKey, metadata, target, propertyKey);
}
//# sourceMappingURL=setReflectMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+reflect-metadata-utils@1.5.0_reflect-metadata@0.2.2/node_modules/@inversifyjs/reflect-metadata-utils/lib/reflectMetadata/utils/updateOwnReflectMetadata.js

function updateOwnReflectMetadata_updateOwnReflectMetadata(target, metadataKey, buildDefaultValue, callback, propertyKey) {
    const metadata = getOwnReflectMetadata_getOwnReflectMetadata(target, metadataKey, propertyKey) ??
        buildDefaultValue();
    const updatedMetadata = callback(metadata);
    Reflect.defineMetadata(metadataKey, updatedMetadata, target, propertyKey);
}
//# sourceMappingURL=updateOwnReflectMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/actions/getBindingId.js

const getBindingId_ID_METADATA = '@inversifyjs/container/bindingId';
function getBindingId() {
    const bindingId = getOwnReflectMetadata_getOwnReflectMetadata(Object, getBindingId_ID_METADATA) ?? 0;
    if (bindingId === Number.MAX_SAFE_INTEGER) {
        setReflectMetadata_setReflectMetadata(Object, getBindingId_ID_METADATA, Number.MIN_SAFE_INTEGER);
    }
    else {
        updateOwnReflectMetadata_updateOwnReflectMetadata(Object, getBindingId_ID_METADATA, () => bindingId, (id) => id + 1);
    }
    return bindingId;
}
//# sourceMappingURL=getBindingId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/models/BindingScope.js
const bindingScopeValues = {
    Request: 'Request',
    Singleton: 'Singleton',
    Transient: 'Transient',
};
//# sourceMappingURL=BindingScope.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/models/BindingType.js
const bindingTypeValues = {
    ConstantValue: 'ConstantValue',
    DynamicValue: 'DynamicValue',
    Factory: 'Factory',
    Instance: 'Instance',
    ResolvedValue: 'ResolvedValue',
    ServiceRedirection: 'ServiceRedirection',
};
//# sourceMappingURL=BindingType.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/common/calculations/chain.js
function* chain_chain(...iterables) {
    for (const iterable of iterables) {
        yield* iterable;
    }
}
//# sourceMappingURL=chain.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/common/models/OneToManyMapStar.js
const NOT_FOUND_INDEX = -1;
/**
 * Data structure able to efficiently manage a set of models related to a set of properties in a one to many relation.
 */
class OneToManyMapStar {
    #modelToRelationMap;
    #relationToModelsMaps;
    #spec;
    constructor(spec) {
        this.#modelToRelationMap = new Map();
        this.#relationToModelsMaps = {};
        for (const specProperty of Reflect.ownKeys(spec)) {
            this.#relationToModelsMaps[specProperty] = new Map();
        }
        this.#spec = spec;
    }
    add(model, relation) {
        this.#buildOrGetModelArray(model).push(relation);
        for (const relationKey of Reflect.ownKeys(relation)) {
            this.#buildOrGetRelationModels(relationKey, relation[relationKey]).push(model);
        }
    }
    clone() {
        const modelToCloneModelMap = this.#buildModelToCloneModelMap();
        const relationToCloneRelationMap = this.#buildRelationToRelationModelMap();
        const properties = Reflect.ownKeys(this.#spec);
        const clone = this._buildNewInstance(this.#spec);
        this.#pushRelationEntriesIntoRelationMap(this.#modelToRelationMap, clone.#modelToRelationMap, modelToCloneModelMap, relationToCloneRelationMap);
        for (const property of properties) {
            this.#pushModelEntriesIntoModelMap(this.#relationToModelsMaps[property], clone.#relationToModelsMaps[property], modelToCloneModelMap);
        }
        return clone;
    }
    get(key, value) {
        return this.#relationToModelsMaps[key].get(value);
    }
    getAllKeys(key) {
        return this.#relationToModelsMaps[key].keys();
    }
    removeByRelation(key, value) {
        const models = this.get(key, value);
        if (models === undefined) {
            return;
        }
        const uniqueModelsSet = new Set(models);
        for (const model of uniqueModelsSet) {
            const relations = this.#modelToRelationMap.get(model);
            if (relations === undefined) {
                throw new Error('Expecting model relation, none found');
            }
            for (const relation of relations) {
                if (relation[key] === value) {
                    this.#removeModelFromRelationMaps(model, relation);
                }
            }
            this.#modelToRelationMap.delete(model);
        }
    }
    _buildNewInstance(spec) {
        return new OneToManyMapStar(spec);
    }
    _cloneModel(model) {
        return model;
    }
    _cloneRelation(relation) {
        return relation;
    }
    #buildModelToCloneModelMap() {
        const modelToCloneModelMap = new Map();
        for (const model of this.#modelToRelationMap.keys()) {
            const clonedModel = this._cloneModel(model);
            modelToCloneModelMap.set(model, clonedModel);
        }
        return modelToCloneModelMap;
    }
    #buildRelationToRelationModelMap() {
        const relationToCloneRelationMap = new Map();
        for (const relations of this.#modelToRelationMap.values()) {
            for (const relation of relations) {
                const clonedRelation = this._cloneRelation(relation);
                relationToCloneRelationMap.set(relation, clonedRelation);
            }
        }
        return relationToCloneRelationMap;
    }
    #buildOrGetModelArray(model) {
        let relations = this.#modelToRelationMap.get(model);
        if (relations === undefined) {
            relations = [];
            this.#modelToRelationMap.set(model, relations);
        }
        return relations;
    }
    #buildOrGetRelationModels(relationKey, relationValue) {
        let models = this.#relationToModelsMaps[relationKey].get(relationValue);
        if (models === undefined) {
            models = [];
            this.#relationToModelsMaps[relationKey].set(relationValue, models);
        }
        return models;
    }
    #getCloneModel(model, modelToCloneModelMap) {
        const clonedModel = modelToCloneModelMap.get(model);
        if (clonedModel === undefined) {
            throw new Error('Expecting model to be cloned, none found');
        }
        return clonedModel;
    }
    #getCloneRelation(relation, relationToCloneRelationMap) {
        const clonedRelation = relationToCloneRelationMap.get(relation);
        if (clonedRelation === undefined) {
            throw new Error('Expecting relation to be cloned, none found');
        }
        return clonedRelation;
    }
    #pushModelEntriesIntoModelMap(source, target, modelToCloneModelMap) {
        for (const [relationValue, models] of source) {
            const modelsClone = new Array();
            for (const model of models) {
                modelsClone.push(this.#getCloneModel(model, modelToCloneModelMap));
            }
            target.set(relationValue, modelsClone);
        }
    }
    #pushRelationEntriesIntoRelationMap(source, target, modelToCloneModelMap, relationToCloneRelationMap) {
        for (const [model, relations] of source) {
            const relationsClone = new Array();
            for (const relation of relations) {
                relationsClone.push(this.#getCloneRelation(relation, relationToCloneRelationMap));
            }
            target.set(this.#getCloneModel(model, modelToCloneModelMap), relationsClone);
        }
    }
    #removeModelFromRelationMaps(model, relation) {
        for (const relationKey of Reflect.ownKeys(relation)) {
            this.#removeModelFromRelationMap(model, relationKey, relation[relationKey]);
        }
    }
    #removeModelFromRelationMap(model, relationKey, relationValue) {
        const relationModels = this.#relationToModelsMaps[relationKey].get(relationValue);
        if (relationModels !== undefined) {
            const index = relationModels.indexOf(model);
            if (index !== NOT_FOUND_INDEX) {
                relationModels.splice(index, 1);
            }
            if (relationModels.length === 0) {
                this.#relationToModelsMaps[relationKey].delete(relationValue);
            }
        }
    }
}
//# sourceMappingURL=OneToManyMapStar.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/common/models/WeakList.js
const DEFAULT_MINIMUM_LENGTH_TO_REALLOCATE = 8;
const DEFAULT_MODULUS_TO_REALLOCATE_ON_PUSH = 1024;
const MIN_DEAD_REFS_FOR_REALLOCATION_PERCENTAGE = 0.5;
/**
 * A list-like collection that holds weak references to objects.
 * Automatically cleans up dead references when a threshold is met.
 *
 * FinalizationRegistry is not used here due to it's lack of determinism.
 * FinalizationRegsitry callbacks are not guaranteed to be called after an object is garbage collected.
 */
class WeakList {
    #list;
    #minimumLengthToReallocate;
    #modulusToReallocateOnPush;
    constructor() {
        this.#list = [];
        this.#minimumLengthToReallocate = DEFAULT_MINIMUM_LENGTH_TO_REALLOCATE;
        this.#modulusToReallocateOnPush = DEFAULT_MODULUS_TO_REALLOCATE_ON_PUSH;
    }
    *[Symbol.iterator]() {
        let deadRefCount = 0;
        for (const weakRef of this.#list) {
            const value = weakRef.deref();
            if (value === undefined) {
                ++deadRefCount;
            }
            else {
                yield value;
            }
        }
        if (this.#list.length >= this.#minimumLengthToReallocate &&
            this.#shouldReallocate(deadRefCount)) {
            this.#reallocate(deadRefCount);
        }
    }
    push(value) {
        const weakRef = new WeakRef(value);
        this.#list.push(weakRef);
        if (this.#list.length >= this.#minimumLengthToReallocate &&
            this.#list.length % this.#modulusToReallocateOnPush === 0) {
            let deadRefCount = 0;
            for (const ref of this.#list) {
                if (ref.deref() === undefined) {
                    ++deadRefCount;
                }
            }
            if (this.#shouldReallocate(deadRefCount)) {
                this.#reallocate(deadRefCount);
            }
        }
    }
    #reallocate(deadRefCount) {
        const newList = new Array(this.#list.length - deadRefCount);
        let i = 0;
        for (const ref of this.#list) {
            if (ref.deref()) {
                newList[i++] = ref;
            }
        }
        this.#list = newList;
    }
    #shouldReallocate(deadRefCount) {
        return (deadRefCount >=
            this.#list.length * MIN_DEAD_REFS_FOR_REALLOCATION_PERCENTAGE);
    }
}
//# sourceMappingURL=WeakList.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/services/ActivationsService.js



var ActivationsService_ActivationRelationKind;
(function (ActivationRelationKind) {
    ActivationRelationKind["moduleId"] = "moduleId";
    ActivationRelationKind["serviceId"] = "serviceId";
})(ActivationsService_ActivationRelationKind || (ActivationsService_ActivationRelationKind = {}));
class ActivationsService {
    #activationMaps;
    #getParent;
    #serviceToActivationSubscribersOnceMap;
    constructor(getParent, activationMaps) {
        this.#activationMaps =
            activationMaps ??
                new OneToManyMapStar({
                    moduleId: {
                        isOptional: true,
                    },
                    serviceId: {
                        isOptional: false,
                    },
                });
        this.#getParent = getParent;
        // We don't want to clone subscribers
        this.#serviceToActivationSubscribersOnceMap = new Map();
    }
    static build(getParent) {
        return new ActivationsService(getParent);
    }
    add(activation, relation) {
        this.#activationMaps.add(activation, relation);
        this.#triggerActivationAdded(relation[ActivationsService_ActivationRelationKind.serviceId], activation);
    }
    subscribeOnce(serviceIdentifier, subscriber) {
        let subscribersOnce = this.#serviceToActivationSubscribersOnceMap.get(serviceIdentifier);
        if (subscribersOnce === undefined) {
            subscribersOnce = new WeakList();
            this.#serviceToActivationSubscribersOnceMap.set(serviceIdentifier, subscribersOnce);
        }
        subscribersOnce.push(subscriber);
    }
    clone() {
        const clone = new ActivationsService(this.#getParent, this.#activationMaps.clone());
        return clone;
    }
    get(serviceIdentifier) {
        const activations = this.#activationMaps.get(ActivationsService_ActivationRelationKind.serviceId, serviceIdentifier);
        const parentActivations = this.#getParent()?.get(serviceIdentifier);
        if (activations === undefined) {
            return parentActivations;
        }
        if (parentActivations === undefined) {
            return activations;
        }
        return chain_chain(activations, parentActivations);
    }
    removeAllByModuleId(moduleId) {
        this.#activationMaps.removeByRelation(ActivationsService_ActivationRelationKind.moduleId, moduleId);
    }
    removeAllByServiceId(serviceId) {
        this.#activationMaps.removeByRelation(ActivationsService_ActivationRelationKind.serviceId, serviceId);
    }
    #triggerActivationAdded(serviceId, activation) {
        const subscribersOnce = this.#serviceToActivationSubscribersOnceMap.get(serviceId);
        if (subscribersOnce !== undefined) {
            for (const subscriber of subscribersOnce) {
                subscriber.onActivationAdded(serviceId, activation);
            }
            this.#serviceToActivationSubscribersOnceMap.delete(serviceId);
        }
    }
}
//# sourceMappingURL=ActivationsService.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/reflectMetadata/data/classMetadataReflectKey.js
const classMetadataReflectKey_classMetadataReflectKey = '@inversifyjs/core/classMetadataReflectKey';
//# sourceMappingURL=classMetadataReflectKey.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/getDefaultClassMetadata.js
function getDefaultClassMetadata_getDefaultClassMetadata() {
    return {
        constructorArguments: [],
        lifecycle: {
            postConstructMethodNames: new Set(),
            preDestroyMethodNames: new Set(),
        },
        properties: new Map(),
        scope: undefined,
    };
}
//# sourceMappingURL=getDefaultClassMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/reflectMetadata/data/pendingClassMetadataCountReflectKey.js
const pendingClassMetadataCountReflectKey = '@inversifyjs/core/pendingClassMetadataCountReflectKey';
//# sourceMappingURL=pendingClassMetadataCountReflectKey.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/isPendingClassMetadata.js


function isPendingClassMetadata(type) {
    const pendingClassMetadataCount = getOwnReflectMetadata_getOwnReflectMetadata(type, pendingClassMetadataCountReflectKey);
    return (pendingClassMetadataCount !== undefined && pendingClassMetadataCount !== 0);
}
//# sourceMappingURL=isPendingClassMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/error/models/InversifyCoreError.js
const isAppErrorSymbol = Symbol.for('@inversifyjs/core/InversifyCoreError');
class InversifyCoreError_InversifyCoreError extends Error {
    [isAppErrorSymbol];
    kind;
    constructor(kind, message, options) {
        super(message, options);
        this[isAppErrorSymbol] = true;
        this.kind = kind;
    }
    static is(value) {
        return (typeof value === 'object' &&
            value !== null &&
            value[isAppErrorSymbol] === true);
    }
    static isErrorOfKind(value, kind) {
        return InversifyCoreError_InversifyCoreError.is(value) && value.kind === kind;
    }
}
//# sourceMappingURL=InversifyCoreError.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/error/models/InversifyCoreErrorKind.js
var InversifyCoreErrorKind_InversifyCoreErrorKind;
(function (InversifyCoreErrorKind) {
    InversifyCoreErrorKind[InversifyCoreErrorKind["injectionDecoratorConflict"] = 0] = "injectionDecoratorConflict";
    InversifyCoreErrorKind[InversifyCoreErrorKind["missingInjectionDecorator"] = 1] = "missingInjectionDecorator";
    InversifyCoreErrorKind[InversifyCoreErrorKind["planning"] = 2] = "planning";
    InversifyCoreErrorKind[InversifyCoreErrorKind["planningMaxDepthExceeded"] = 3] = "planningMaxDepthExceeded";
    InversifyCoreErrorKind[InversifyCoreErrorKind["resolution"] = 4] = "resolution";
    InversifyCoreErrorKind[InversifyCoreErrorKind["unknown"] = 5] = "unknown";
})(InversifyCoreErrorKind_InversifyCoreErrorKind || (InversifyCoreErrorKind_InversifyCoreErrorKind = {}));
//# sourceMappingURL=InversifyCoreErrorKind.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/models/MaybeClassElementMetadataKind.js
var MaybeClassElementMetadataKind_MaybeClassElementMetadataKind;
(function (MaybeClassElementMetadataKind) {
    MaybeClassElementMetadataKind[MaybeClassElementMetadataKind["unknown"] = 32] = "unknown";
})(MaybeClassElementMetadataKind_MaybeClassElementMetadataKind || (MaybeClassElementMetadataKind_MaybeClassElementMetadataKind = {}));
//# sourceMappingURL=MaybeClassElementMetadataKind.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/throwAtInvalidClassMetadata.js



function throwAtInvalidClassMetadata(type, classMetadata) {
    const errors = [];
    for (let i = 0; i < classMetadata.constructorArguments.length; ++i) {
        const constructorArgument = classMetadata.constructorArguments[i];
        if (constructorArgument === undefined ||
            constructorArgument.kind === MaybeClassElementMetadataKind_MaybeClassElementMetadataKind.unknown) {
            errors.push(`  - Missing or incomplete metadata for type "${type.name}" at constructor argument with index ${i.toString()}.
Every constructor parameter must be decorated either with @inject, @multiInject or @unmanaged decorator.`);
        }
    }
    for (const [propertyKey, property] of classMetadata.properties) {
        if (property.kind === MaybeClassElementMetadataKind_MaybeClassElementMetadataKind.unknown) {
            errors.push(`  - Missing or incomplete metadata for type "${type.name}" at property "${propertyKey.toString()}".
This property must be decorated either with @inject or @multiInject decorator.`);
        }
    }
    if (errors.length === 0) {
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.unknown, `Unexpected class metadata for type "${type.name}" with uncompletion traces.
This might be caused by one of the following reasons:

1. A third party library is targeting inversify reflection metadata.
2. A bug is causing the issue. Consider submiting an issue to fix it.`);
    }
    throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.missingInjectionDecorator, `Invalid class metadata at type ${type.name}:

${errors.join('\n\n')}`);
}
//# sourceMappingURL=throwAtInvalidClassMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/validateConstructorMetadataArray.js


function validateConstructorMetadataArray(type, value) {
    const undefinedIndexes = [];
    if (value.length < type.length) {
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.missingInjectionDecorator, `Found unexpected missing metadata on type "${type.name}". "${type.name}" constructor requires at least ${type.length.toString()} arguments, found ${value.length.toString()} instead.
Are you using @inject, @multiInject or @unmanaged decorators in every non optional constructor argument?

If you're using typescript and want to rely on auto injection, set "emitDecoratorMetadata" compiler option to true`);
    }
    // Using a for loop to ensure empty values are traversed as well
    for (let i = 0; i < value.length; ++i) {
        const element = value[i];
        if (element === undefined) {
            undefinedIndexes.push(i);
        }
    }
    if (undefinedIndexes.length > 0) {
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.missingInjectionDecorator, `Found unexpected missing metadata on type "${type.name}" at constructor indexes "${undefinedIndexes.join('", "')}".

Are you using @inject, @multiInject or @unmanaged decorators at those indexes?

If you're using typescript and want to rely on auto injection, set "emitDecoratorMetadata" compiler option to true`);
    }
}
//# sourceMappingURL=validateConstructorMetadataArray.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/getClassMetadata.js






function getClassMetadata_getClassMetadata(type) {
    const classMetadata = getOwnReflectMetadata_getOwnReflectMetadata(type, classMetadataReflectKey_classMetadataReflectKey) ??
        getDefaultClassMetadata_getDefaultClassMetadata();
    if (isPendingClassMetadata(type)) {
        throwAtInvalidClassMetadata(type, classMetadata);
    }
    else {
        validateConstructorMetadataArray(type, classMetadata.constructorArguments);
        return classMetadata;
    }
}
//# sourceMappingURL=getClassMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/buildInstanceBinding.js



function buildInstanceBinding(autobindOptions, serviceIdentifier) {
    const classMetadata = getClassMetadata_getClassMetadata(serviceIdentifier);
    const scope = classMetadata.scope ?? autobindOptions.scope;
    return {
        cache: {
            isRight: false,
            value: undefined,
        },
        id: getBindingId(),
        implementationType: serviceIdentifier,
        isSatisfiedBy: () => true,
        moduleId: undefined,
        onActivation: undefined,
        onDeactivation: undefined,
        scope,
        serviceIdentifier,
        type: bindingTypeValues.Instance,
    };
}
//# sourceMappingURL=buildInstanceBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneBindingCache.js
function cloneBindingCache(cache) {
    if (cache.isRight) {
        return {
            isRight: true,
            value: cache.value,
        };
    }
    // A left cache is not cloned, just returned
    return cache;
}
//# sourceMappingURL=cloneBindingCache.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneConstantValueBinding.js

/**
 * Clones a ConstantValueBinding
 */
function cloneConstantValueBinding(binding) {
    return {
        cache: cloneBindingCache(binding.cache),
        id: binding.id,
        isSatisfiedBy: binding.isSatisfiedBy,
        moduleId: binding.moduleId,
        onActivation: binding.onActivation,
        onDeactivation: binding.onDeactivation,
        scope: binding.scope,
        serviceIdentifier: binding.serviceIdentifier,
        type: binding.type,
        // The value is not cloned as it's a resolved value
        value: binding.value,
    };
}
//# sourceMappingURL=cloneConstantValueBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneDynamicValueBinding.js

/**
 * Clones a DynamicValueBinding
 */
function cloneDynamicValueBinding(binding) {
    return {
        cache: cloneBindingCache(binding.cache),
        id: binding.id,
        isSatisfiedBy: binding.isSatisfiedBy,
        moduleId: binding.moduleId,
        onActivation: binding.onActivation,
        onDeactivation: binding.onDeactivation,
        scope: binding.scope,
        serviceIdentifier: binding.serviceIdentifier,
        type: binding.type,
        // The value is not cloned
        value: binding.value,
    };
}
//# sourceMappingURL=cloneDynamicValueBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneFactoryBinding.js

/**
 * Clones a FactoryBinding
 */
function cloneFactoryBinding(binding) {
    return {
        cache: cloneBindingCache(binding.cache),
        factory: binding.factory,
        id: binding.id,
        isSatisfiedBy: binding.isSatisfiedBy,
        moduleId: binding.moduleId,
        onActivation: binding.onActivation,
        onDeactivation: binding.onDeactivation,
        scope: binding.scope,
        serviceIdentifier: binding.serviceIdentifier,
        type: binding.type,
    };
}
//# sourceMappingURL=cloneFactoryBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneInstanceBinding.js

/**
 * Clones an InstanceBinding
 */
function cloneInstanceBinding(binding) {
    return {
        cache: cloneBindingCache(binding.cache),
        id: binding.id,
        implementationType: binding.implementationType,
        isSatisfiedBy: binding.isSatisfiedBy,
        moduleId: binding.moduleId,
        onActivation: binding.onActivation,
        onDeactivation: binding.onDeactivation,
        scope: binding.scope,
        serviceIdentifier: binding.serviceIdentifier,
        type: binding.type,
    };
}
//# sourceMappingURL=cloneInstanceBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneResolvedValueBinding.js

/**
 * Clones a ResolvedValueBinding
 */
function cloneResolvedValueBinding(binding) {
    return {
        cache: cloneBindingCache(binding.cache),
        factory: binding.factory,
        id: binding.id,
        isSatisfiedBy: binding.isSatisfiedBy,
        metadata: binding.metadata,
        moduleId: binding.moduleId,
        onActivation: binding.onActivation,
        onDeactivation: binding.onDeactivation,
        scope: binding.scope,
        serviceIdentifier: binding.serviceIdentifier,
        type: binding.type,
    };
}
//# sourceMappingURL=cloneResolvedValueBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneServiceRedirectionBinding.js
/**
 * Clones a ServiceRedirectionBinding
 */
function cloneServiceRedirectionBinding(binding) {
    return {
        id: binding.id,
        isSatisfiedBy: binding.isSatisfiedBy,
        moduleId: binding.moduleId,
        serviceIdentifier: binding.serviceIdentifier,
        targetServiceIdentifier: binding.targetServiceIdentifier,
        type: binding.type,
    };
}
//# sourceMappingURL=cloneServiceRedirectionBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/cloneBinding.js







/**
 * Creates a deep clone of a binding.
 *
 * @param binding - The binding to clone
 * @returns A clone of the binding
 */
function cloneBinding(binding) {
    // Switch based on binding type to delegate to specific clone functions
    switch (binding.type) {
        case bindingTypeValues.ConstantValue:
            return cloneConstantValueBinding(binding);
        case bindingTypeValues.DynamicValue:
            return cloneDynamicValueBinding(binding);
        case bindingTypeValues.Factory:
            return cloneFactoryBinding(binding);
        case bindingTypeValues.Instance:
            return cloneInstanceBinding(binding);
        case bindingTypeValues.ResolvedValue:
            return cloneResolvedValueBinding(binding);
        case bindingTypeValues.ServiceRedirection:
            return cloneServiceRedirectionBinding(binding);
    }
}
//# sourceMappingURL=cloneBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/services/BindingService.js



var BindingService_BindingRelationKind;
(function (BindingRelationKind) {
    BindingRelationKind["id"] = "id";
    BindingRelationKind["moduleId"] = "moduleId";
    BindingRelationKind["serviceId"] = "serviceId";
})(BindingService_BindingRelationKind || (BindingService_BindingRelationKind = {}));
class OneToManyBindingMapStar extends OneToManyMapStar {
    _buildNewInstance(spec) {
        return new OneToManyBindingMapStar(spec);
    }
    _cloneModel(model) {
        return cloneBinding(model);
    }
}
class BindingService {
    #autobindOptions;
    #bindingMaps;
    #getParent;
    constructor(getParent, autobindOptions, bindingMaps) {
        this.#bindingMaps =
            bindingMaps ??
                new OneToManyBindingMapStar({
                    id: {
                        isOptional: false,
                    },
                    moduleId: {
                        isOptional: true,
                    },
                    serviceId: {
                        isOptional: false,
                    },
                });
        this.#getParent = getParent;
        this.#autobindOptions = autobindOptions;
    }
    static build(getParent, autobindOptions) {
        return new BindingService(getParent, autobindOptions);
    }
    clone() {
        const clone = new BindingService(this.#getParent, this.#autobindOptions, this.#bindingMaps.clone());
        return clone;
    }
    get(serviceIdentifier) {
        const bindings = this.getNonParentBindings(serviceIdentifier) ??
            this.#getParent()?.get(serviceIdentifier);
        if (bindings !== undefined) {
            return bindings;
        }
        const autoBoundBinding = this.#tryAutobind(serviceIdentifier);
        return autoBoundBinding === undefined
            ? autoBoundBinding
            : [autoBoundBinding];
    }
    *getChained(serviceIdentifier) {
        const currentBindings = this.getNonParentBindings(serviceIdentifier);
        if (currentBindings !== undefined) {
            yield* currentBindings;
        }
        const parent = this.#getParent();
        if (parent === undefined) {
            if (currentBindings === undefined) {
                const autobindBindings = this.#tryAutobind(serviceIdentifier);
                if (autobindBindings !== undefined) {
                    yield autobindBindings;
                }
            }
        }
        else {
            yield* parent.getChained(serviceIdentifier);
        }
    }
    getBoundServices() {
        const serviceIdentifierSet = new Set(this.#bindingMaps.getAllKeys(BindingService_BindingRelationKind.serviceId));
        const parent = this.#getParent();
        if (parent !== undefined) {
            for (const serviceIdentifier of parent.getBoundServices()) {
                serviceIdentifierSet.add(serviceIdentifier);
            }
        }
        return serviceIdentifierSet;
    }
    getById(id) {
        return (this.#bindingMaps.get(BindingService_BindingRelationKind.id, id) ??
            this.#getParent()?.getById(id));
    }
    getByModuleId(moduleId) {
        return (this.#bindingMaps.get(BindingService_BindingRelationKind.moduleId, moduleId) ??
            this.#getParent()?.getByModuleId(moduleId));
    }
    getNonParentBindings(serviceId) {
        return this.#bindingMaps.get(BindingService_BindingRelationKind.serviceId, serviceId);
    }
    getNonParentBoundServices() {
        return this.#bindingMaps.getAllKeys(BindingService_BindingRelationKind.serviceId);
    }
    removeById(id) {
        this.#bindingMaps.removeByRelation(BindingService_BindingRelationKind.id, id);
    }
    removeAllByModuleId(moduleId) {
        this.#bindingMaps.removeByRelation(BindingService_BindingRelationKind.moduleId, moduleId);
    }
    removeAllByServiceId(serviceId) {
        this.#bindingMaps.removeByRelation(BindingService_BindingRelationKind.serviceId, serviceId);
    }
    set(binding) {
        const relation = {
            [BindingService_BindingRelationKind.id]: binding.id,
            [BindingService_BindingRelationKind.serviceId]: binding.serviceIdentifier,
        };
        if (binding.moduleId !== undefined) {
            relation[BindingService_BindingRelationKind.moduleId] = binding.moduleId;
        }
        this.#bindingMaps.add(binding, relation);
    }
    #tryAutobind(serviceIdentifier) {
        if (this.#autobindOptions === undefined ||
            typeof serviceIdentifier !== 'function') {
            return undefined;
        }
        const binding = buildInstanceBinding(this.#autobindOptions, serviceIdentifier);
        this.set(binding);
        return binding;
    }
}
//# sourceMappingURL=BindingService.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/services/DeactivationsService.js


var DeactivationsService_DeactivationRelationKind;
(function (DeactivationRelationKind) {
    DeactivationRelationKind["moduleId"] = "moduleId";
    DeactivationRelationKind["serviceId"] = "serviceId";
})(DeactivationsService_DeactivationRelationKind || (DeactivationsService_DeactivationRelationKind = {}));
class DeactivationsService {
    #deactivationMaps;
    #getParent;
    constructor(getParent, deactivationMaps) {
        this.#deactivationMaps =
            deactivationMaps ??
                new OneToManyMapStar({
                    moduleId: {
                        isOptional: true,
                    },
                    serviceId: {
                        isOptional: false,
                    },
                });
        this.#getParent = getParent;
    }
    static build(getParent) {
        return new DeactivationsService(getParent);
    }
    add(deactivation, relation) {
        this.#deactivationMaps.add(deactivation, relation);
    }
    clone() {
        const clone = new DeactivationsService(this.#getParent, this.#deactivationMaps.clone());
        return clone;
    }
    get(serviceIdentifier) {
        const deactivationIterables = [];
        const deactivations = this.#deactivationMaps.get(DeactivationsService_DeactivationRelationKind.serviceId, serviceIdentifier);
        if (deactivations !== undefined) {
            deactivationIterables.push(deactivations);
        }
        const parentDeactivations = this.#getParent()?.get(serviceIdentifier);
        if (parentDeactivations !== undefined) {
            deactivationIterables.push(parentDeactivations);
        }
        if (deactivationIterables.length === 0) {
            return undefined;
        }
        return chain_chain(...deactivationIterables);
    }
    removeAllByModuleId(moduleId) {
        this.#deactivationMaps.removeByRelation(DeactivationsService_DeactivationRelationKind.moduleId, moduleId);
    }
    removeAllByServiceId(serviceId) {
        this.#deactivationMaps.removeByRelation(DeactivationsService_DeactivationRelationKind.serviceId, serviceId);
    }
}
//# sourceMappingURL=DeactivationsService.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/getDefaultPendingClassMetadataCount.js
function getDefaultPendingClassMetadataCount() {
    return 0;
}
//# sourceMappingURL=getDefaultPendingClassMetadataCount.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/decrementPendingClassMetadataCount.js




function decrementPendingClassMetadataCount_decrementPendingClassMetadataCount(type) {
    return (metadata) => {
        if (metadata !== undefined &&
            metadata.kind === MaybeClassElementMetadataKind_MaybeClassElementMetadataKind.unknown) {
            updateOwnReflectMetadata_updateOwnReflectMetadata(type, pendingClassMetadataCountReflectKey, getDefaultPendingClassMetadataCount, (count) => count - 1);
        }
    };
}
//# sourceMappingURL=decrementPendingClassMetadataCount.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/models/ClassElementMetadataKind.js
var ClassElementMetadataKind_ClassElementMetadataKind;
(function (ClassElementMetadataKind) {
    ClassElementMetadataKind[ClassElementMetadataKind["multipleInjection"] = 0] = "multipleInjection";
    ClassElementMetadataKind[ClassElementMetadataKind["singleInjection"] = 1] = "singleInjection";
    ClassElementMetadataKind[ClassElementMetadataKind["unmanaged"] = 2] = "unmanaged";
})(ClassElementMetadataKind_ClassElementMetadataKind || (ClassElementMetadataKind_ClassElementMetadataKind = {}));
//# sourceMappingURL=ClassElementMetadataKind.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildClassElementMetadataFromMaybeClassElementMetadata.js



function buildClassElementMetadataFromMaybeClassElementMetadata_buildClassElementMetadataFromMaybeClassElementMetadata(buildDefaultMetadata, buildMetadataFromMaybeManagedMetadata) {
    return (...params) => (metadata) => {
        if (metadata === undefined) {
            return buildDefaultMetadata(...params);
        }
        if (metadata.kind === ClassElementMetadataKind_ClassElementMetadataKind.unmanaged) {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict, 'Unexpected injection found. Multiple @inject, @multiInject or @unmanaged decorators found');
        }
        return buildMetadataFromMaybeManagedMetadata(metadata, ...params);
    };
}
//# sourceMappingURL=buildClassElementMetadataFromMaybeClassElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildDefaultManagedMetadata.js

function buildDefaultManagedMetadata(kind, serviceIdentifier, options) {
    if (kind === ClassElementMetadataKind_ClassElementMetadataKind.multipleInjection) {
        return {
            chained: options?.chained ?? false,
            kind,
            name: undefined,
            optional: false,
            tags: new Map(),
            value: serviceIdentifier,
        };
    }
    else {
        return {
            kind,
            name: undefined,
            optional: false,
            tags: new Map(),
            value: serviceIdentifier,
        };
    }
}
//# sourceMappingURL=buildDefaultManagedMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/assertMetadataFromTypescriptIfManaged.js



function assertMetadataFromTypescriptIfManaged_assertMetadataFromTypescriptIfManaged(metadata) {
    if (metadata.kind !== MaybeClassElementMetadataKind_MaybeClassElementMetadataKind.unknown &&
        metadata.isFromTypescriptParamType !== true) {
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict, 'Unexpected injection found. Multiple @inject, @multiInject or @unmanaged decorators found');
    }
}
//# sourceMappingURL=assertMetadataFromTypescriptIfManaged.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildManagedMetadataFromMaybeManagedMetadata.js


function buildManagedMetadataFromMaybeManagedMetadata(metadata, kind, serviceIdentifier, options) {
    assertMetadataFromTypescriptIfManaged_assertMetadataFromTypescriptIfManaged(metadata);
    if (kind === ClassElementMetadataKind_ClassElementMetadataKind.multipleInjection) {
        return {
            ...metadata,
            chained: options?.chained ?? false,
            kind,
            value: serviceIdentifier,
        };
    }
    else {
        return {
            ...metadata,
            kind,
            value: serviceIdentifier,
        };
    }
}
//# sourceMappingURL=buildManagedMetadataFromMaybeManagedMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildManagedMetadataFromMaybeClassElementMetadata.js



const buildManagedMetadataFromMaybeClassElementMetadata_buildManagedMetadataFromMaybeClassElementMetadata = buildClassElementMetadataFromMaybeClassElementMetadata_buildClassElementMetadataFromMaybeClassElementMetadata(buildDefaultManagedMetadata, buildManagedMetadataFromMaybeManagedMetadata);
//# sourceMappingURL=buildManagedMetadataFromMaybeClassElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateMaybeClassMetadataConstructorArgument.js
function updateMaybeClassMetadataConstructorArgument(updateMetadata, index) {
    return (classMetadata) => {
        const propertyMetadata = classMetadata.constructorArguments[index];
        classMetadata.constructorArguments[index] =
            updateMetadata(propertyMetadata);
        return classMetadata;
    };
}
//# sourceMappingURL=updateMaybeClassMetadataConstructorArgument.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateMaybeClassMetadataProperty.js
function updateMaybeClassMetadataProperty(updateMetadata, propertyKey) {
    return (classMetadata) => {
        const propertyMetadata = classMetadata.properties.get(propertyKey);
        classMetadata.properties.set(propertyKey, updateMetadata(propertyMetadata));
        return classMetadata;
    };
}
//# sourceMappingURL=updateMaybeClassMetadataProperty.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/decorator/models/DecoratorInfoKind.js
var DecoratorInfoKind_DecoratorInfoKind;
(function (DecoratorInfoKind) {
    DecoratorInfoKind[DecoratorInfoKind["method"] = 0] = "method";
    DecoratorInfoKind[DecoratorInfoKind["parameter"] = 1] = "parameter";
    DecoratorInfoKind[DecoratorInfoKind["property"] = 2] = "property";
})(DecoratorInfoKind_DecoratorInfoKind || (DecoratorInfoKind_DecoratorInfoKind = {}));
//# sourceMappingURL=DecoratorInfoKind.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/decorator/calculations/getDecoratorInfo.js



function getDecoratorInfo(target, propertyKey, parameterIndexOrDescriptor) {
    if (parameterIndexOrDescriptor === undefined) {
        if (propertyKey === undefined) {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.unknown, 'Unexpected undefined property and index values');
        }
        return {
            kind: DecoratorInfoKind_DecoratorInfoKind.property,
            property: propertyKey,
            targetClass: target.constructor,
        };
    }
    if (typeof parameterIndexOrDescriptor === 'number') {
        return {
            index: parameterIndexOrDescriptor,
            kind: DecoratorInfoKind_DecoratorInfoKind.parameter,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            targetClass: target,
        };
    }
    return {
        kind: DecoratorInfoKind_DecoratorInfoKind.method,
        method: propertyKey,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        targetClass: target,
    };
}
//# sourceMappingURL=getDecoratorInfo.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/decorator/calculations/stringifyDecoratorInfo.js

function stringifyDecoratorInfo(decoratorTargetInfo) {
    switch (decoratorTargetInfo.kind) {
        case DecoratorInfoKind_DecoratorInfoKind.method:
            return `[class: "${decoratorTargetInfo.targetClass.name}", method: "${decoratorTargetInfo.method.toString()}"]`;
        case DecoratorInfoKind_DecoratorInfoKind.parameter:
            return `[class: "${decoratorTargetInfo.targetClass.name}", index: "${decoratorTargetInfo.index.toString()}"]`;
        case DecoratorInfoKind_DecoratorInfoKind.property:
            return `[class: "${decoratorTargetInfo.targetClass.name}", property: "${decoratorTargetInfo.property.toString()}"]`;
    }
}
//# sourceMappingURL=stringifyDecoratorInfo.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/handleInjectionError.js




function handleInjectionError_handleInjectionError(target, propertyKey, parameterIndex, error) {
    if (InversifyCoreError_InversifyCoreError.isErrorOfKind(error, InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict)) {
        const info = getDecoratorInfo(target, propertyKey, parameterIndex);
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict, `Unexpected injection error.

Cause:

${error.message}

Details

${stringifyDecoratorInfo(info)}`, { cause: error });
    }
    throw error;
}
//# sourceMappingURL=handleInjectionError.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/injectBase.js








function injectBase_injectBase(updateMetadata, updatePendingClassMetadataCount) {
    const decorator = (target, propertyKey, parameterIndexOrDescriptor) => {
        try {
            if (parameterIndexOrDescriptor === undefined) {
                injectProperty(updateMetadata, updatePendingClassMetadataCount)(target, propertyKey);
            }
            else {
                if (typeof parameterIndexOrDescriptor === 'number') {
                    injectParameter(updateMetadata, updatePendingClassMetadataCount)(target, propertyKey, parameterIndexOrDescriptor);
                }
                else {
                    injectMethod(updateMetadata, updatePendingClassMetadataCount)(target, propertyKey, parameterIndexOrDescriptor);
                }
            }
        }
        catch (error) {
            handleInjectionError_handleInjectionError(target, propertyKey, parameterIndexOrDescriptor, error);
        }
    };
    return decorator;
}
function buildComposedUpdateMetadata(updateMetadata, updatePendingClassMetadataCount) {
    return (target) => {
        const updateTargetPendingClassMetadataCount = updatePendingClassMetadataCount(target);
        return (metadata) => {
            updateTargetPendingClassMetadataCount(metadata);
            return updateMetadata(metadata);
        };
    };
}
function injectMethod(updateMetadata, updatePendingClassMetadataCount) {
    const buildComposedUpdateMetadataFromTarget = buildComposedUpdateMetadata(updateMetadata, updatePendingClassMetadataCount);
    return (target, propertyKey, descriptor) => {
        if (isPropertySetter(descriptor)) {
            updateOwnReflectMetadata_updateOwnReflectMetadata(target.constructor, classMetadataReflectKey_classMetadataReflectKey, getDefaultClassMetadata_getDefaultClassMetadata, updateMaybeClassMetadataProperty(buildComposedUpdateMetadataFromTarget(target), propertyKey));
        }
        else {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict, `Found an @inject decorator in a non setter property method.
Found @inject decorator at method "${propertyKey.toString()}" at class "${target.constructor.name}"`);
        }
    };
}
function injectParameter(updateMetadata, updatePendingClassMetadataCount) {
    const buildComposedUpdateMetadataFromTarget = buildComposedUpdateMetadata(updateMetadata, updatePendingClassMetadataCount);
    return (target, propertyKey, parameterIndex) => {
        if (isConstructorParameter(target, propertyKey)) {
            updateOwnReflectMetadata_updateOwnReflectMetadata(target, classMetadataReflectKey_classMetadataReflectKey, getDefaultClassMetadata_getDefaultClassMetadata, updateMaybeClassMetadataConstructorArgument(buildComposedUpdateMetadataFromTarget(target), parameterIndex));
        }
        else {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict, `Found an @inject decorator in a non constructor parameter.
Found @inject decorator at method "${propertyKey?.toString() ?? ''}" at class "${target.constructor.name}"`);
        }
    };
}
function injectProperty(updateMetadata, updatePendingClassMetadataCount) {
    const buildComposedUpdateMetadataFromTarget = buildComposedUpdateMetadata(updateMetadata, updatePendingClassMetadataCount);
    return (target, propertyKey) => {
        updateOwnReflectMetadata_updateOwnReflectMetadata(target.constructor, classMetadataReflectKey_classMetadataReflectKey, getDefaultClassMetadata_getDefaultClassMetadata, updateMaybeClassMetadataProperty(buildComposedUpdateMetadataFromTarget(target), propertyKey));
    };
}
function isConstructorParameter(target, propertyKey) {
    return typeof target === 'function' && propertyKey === undefined;
}
function isPropertySetter(descriptor) {
    return descriptor.set !== undefined;
}
//# sourceMappingURL=injectBase.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/inject.js




function inject(serviceIdentifier) {
    const updateMetadata = buildManagedMetadataFromMaybeClassElementMetadata_buildManagedMetadataFromMaybeClassElementMetadata(ClassElementMetadataKind_ClassElementMetadataKind.singleInjection, serviceIdentifier);
    return injectBase_injectBase(updateMetadata, decrementPendingClassMetadataCount_decrementPendingClassMetadataCount);
}
//# sourceMappingURL=inject.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/reflectMetadata/data/classIsInjectableFlagReflectKey.js
const classIsInjectableFlagReflectKey = '@inversifyjs/core/classIsInjectableFlagReflectKey';
//# sourceMappingURL=classIsInjectableFlagReflectKey.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/setIsInjectableFlag.js




// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function setIsInjectableFlag(target) {
    const isInjectableFlag = getOwnReflectMetadata_getOwnReflectMetadata(target, classIsInjectableFlagReflectKey);
    if (isInjectableFlag !== undefined) {
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict, `Cannot apply @injectable decorator multiple times at class "${target.name}"`);
    }
    setReflectMetadata_setReflectMetadata(target, classIsInjectableFlagReflectKey, true);
}
//# sourceMappingURL=setIsInjectableFlag.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/reflectMetadata/data/typescriptDesignParameterTypesReflectKey.js
const typescriptParameterTypesReflectKey = 'design:paramtypes';
//# sourceMappingURL=typescriptDesignParameterTypesReflectKey.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildClassElementMetadataFromTypescriptParameterType.js

function buildClassElementMetadataFromTypescriptParameterType(type) {
    return {
        isFromTypescriptParamType: true,
        kind: ClassElementMetadataKind_ClassElementMetadataKind.singleInjection,
        name: undefined,
        optional: false,
        tags: new Map(),
        value: type,
    };
}
//# sourceMappingURL=buildClassElementMetadataFromTypescriptParameterType.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/isUserlandEmittedType.js
const NON_USERLAND_TYPES = [
    Array,
    BigInt,
    Boolean,
    Function,
    Number,
    Object,
    String,
];
function isUserlandEmittedType(type) {
    return !NON_USERLAND_TYPES.includes(type);
}
//# sourceMappingURL=isUserlandEmittedType.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateClassMetadataWithTypescriptParameterTypes.js






function updateClassMetadataWithTypescriptParameterTypes(target) {
    const typescriptConstructorArguments = getOwnReflectMetadata_getOwnReflectMetadata(target, typescriptParameterTypesReflectKey);
    if (typescriptConstructorArguments !== undefined) {
        updateOwnReflectMetadata_updateOwnReflectMetadata(target, classMetadataReflectKey_classMetadataReflectKey, getDefaultClassMetadata_getDefaultClassMetadata, updateMaybeClassMetadataWithTypescriptClassMetadata(typescriptConstructorArguments));
    }
}
function updateMaybeClassMetadataWithTypescriptClassMetadata(typescriptConstructorArguments) {
    return (classMetadata) => {
        typescriptConstructorArguments.forEach((constructorArgumentType, index) => {
            if (classMetadata.constructorArguments[index] === undefined &&
                isUserlandEmittedType(constructorArgumentType)) {
                classMetadata.constructorArguments[index] =
                    buildClassElementMetadataFromTypescriptParameterType(constructorArgumentType);
            }
        });
        return classMetadata;
    };
}
//# sourceMappingURL=updateClassMetadataWithTypescriptParameterTypes.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/injectable.js





function injectable(scope) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return (target) => {
        setIsInjectableFlag(target);
        updateClassMetadataWithTypescriptParameterTypes(target);
        if (scope !== undefined) {
            updateOwnReflectMetadata_updateOwnReflectMetadata(target, classMetadataReflectKey_classMetadataReflectKey, getDefaultClassMetadata_getDefaultClassMetadata, (metadata) => ({
                ...metadata,
                scope,
            }));
        }
    };
}
//# sourceMappingURL=injectable.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/injectFrom.js







function injectFrom_injectFrom(options) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const decorator = (target) => {
        const baseTypeClassMetadata = getClassMetadata(options.type);
        updateOwnReflectMetadata(target, classMetadataReflectKey, getDefaultClassMetadata, composeUpdateReflectMetadataCallback(options, baseTypeClassMetadata));
    };
    return decorator;
}
function composeUpdateReflectMetadataCallback(options, baseTypeClassMetadata) {
    const callback = (typeMetadata) => ({
        constructorArguments: getExtendedConstructorArguments(options, baseTypeClassMetadata, typeMetadata),
        lifecycle: getExtendedLifecycle(options, baseTypeClassMetadata, typeMetadata),
        properties: getExtendedProperties(options, baseTypeClassMetadata, typeMetadata),
        scope: typeMetadata.scope,
    });
    return callback;
}
//# sourceMappingURL=injectFrom.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/injectFromBase.js




function injectFromBase(options) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return (target) => {
        const baseType = getBaseType(target);
        if (baseType === undefined) {
            throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, `Expected base type for type "${target.name}", none found.`);
        }
        injectFrom({
            ...options,
            type: baseType,
        })(target);
    };
}
//# sourceMappingURL=injectFromBase.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/injectFromHierarchy.js


function injectFromHierarchy(options) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return (target) => {
        const chain = [];
        let current = getBaseType(target);
        while (current !== undefined && current !== Object) {
            const ancestor = current;
            chain.push(ancestor);
            current = getBaseType(ancestor);
        }
        chain.reverse();
        for (const type of chain) {
            injectFrom({ ...options, type })(target);
        }
    };
}
//# sourceMappingURL=injectFromHierarchy.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/multiInject.js




function multiInject(serviceIdentifier, options) {
    const updateMetadata = buildManagedMetadataFromMaybeClassElementMetadata(ClassElementMetadataKind.multipleInjection, serviceIdentifier, options);
    return injectBase(updateMetadata, decrementPendingClassMetadataCount);
}
//# sourceMappingURL=multiInject.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateMetadataName.js


function updateMetadataName_updateMetadataName(name) {
    return (metadata) => {
        if (metadata.name !== undefined) {
            throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, 'Unexpected duplicated named decorator');
        }
        metadata.name = name;
        return metadata;
    };
}
//# sourceMappingURL=updateMetadataName.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildDefaultMaybeClassElementMetadata.js

function buildDefaultMaybeClassElementMetadata_buildDefaultMaybeClassElementMetadata() {
    return {
        kind: MaybeClassElementMetadataKind.unknown,
        name: undefined,
        optional: false,
        tags: new Map(),
    };
}
//# sourceMappingURL=buildDefaultMaybeClassElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildMaybeClassElementMetadataFromMaybeClassElementMetadata.js




function buildMaybeClassElementMetadataFromMaybeClassElementMetadata_buildMaybeClassElementMetadataFromMaybeClassElementMetadata(updateMetadata) {
    return (metadata) => {
        const definedMetadata = metadata ?? buildDefaultMaybeClassElementMetadata();
        switch (definedMetadata.kind) {
            case ClassElementMetadataKind.unmanaged:
                throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, 'Unexpected injection found. Found @unmanaged injection with additional @named, @optional, @tagged or @targetName injections');
            default:
                return updateMetadata(definedMetadata);
        }
    };
}
//# sourceMappingURL=buildMaybeClassElementMetadataFromMaybeClassElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/named.js




function named(name) {
    const updateMetadata = buildMaybeClassElementMetadataFromMaybeClassElementMetadata(updateMetadataName(name));
    return injectBase(updateMetadata, incrementPendingClassMetadataCount);
}
//# sourceMappingURL=named.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateMetadataOptional.js


function updateMetadataOptional_updateMetadataOptional(metadata) {
    if (metadata.optional) {
        throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, 'Unexpected duplicated optional decorator');
    }
    metadata.optional = true;
    return metadata;
}
//# sourceMappingURL=updateMetadataOptional.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/optional.js




function optional_optional() {
    const updateMetadata = buildMaybeClassElementMetadataFromMaybeClassElementMetadata(updateMetadataOptional);
    return injectBase(updateMetadata, incrementPendingClassMetadataCount);
}
//# sourceMappingURL=optional.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateMaybeClassMetadataPostConstructor.js


function updateMaybeClassMetadataPostConstructor(methodName) {
    return (metadata) => {
        if (metadata.lifecycle.postConstructMethodNames.has(methodName)) {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.injectionDecoratorConflict, `Unexpected duplicated postConstruct method ${methodName.toString()}`);
        }
        metadata.lifecycle.postConstructMethodNames.add(methodName);
        return metadata;
    };
}
//# sourceMappingURL=updateMaybeClassMetadataPostConstructor.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/postConstruct.js





function postConstruct() {
    return (target, propertyKey, _descriptor) => {
        try {
            updateOwnReflectMetadata_updateOwnReflectMetadata(target.constructor, classMetadataReflectKey_classMetadataReflectKey, getDefaultClassMetadata_getDefaultClassMetadata, updateMaybeClassMetadataPostConstructor(propertyKey));
        }
        catch (error) {
            handleInjectionError_handleInjectionError(target, propertyKey, undefined, error);
        }
    };
}
//# sourceMappingURL=postConstruct.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateMaybeClassMetadataPreDestroy.js


function updateMaybeClassMetadataPreDestroy_updateMaybeClassMetadataPreDestroy(methodName) {
    return (metadata) => {
        if (metadata.lifecycle.preDestroyMethodNames.has(methodName)) {
            throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, `Unexpected duplicated preDestroy method ${methodName.toString()}`);
        }
        metadata.lifecycle.preDestroyMethodNames.add(methodName);
        return metadata;
    };
}
//# sourceMappingURL=updateMaybeClassMetadataPreDestroy.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/preDestroy.js





function preDestroy() {
    return (target, propertyKey, _descriptor) => {
        try {
            updateOwnReflectMetadata(target.constructor, classMetadataReflectKey, getDefaultClassMetadata, updateMaybeClassMetadataPreDestroy(propertyKey));
        }
        catch (error) {
            handleInjectionError(target, propertyKey, undefined, error);
        }
    };
}
//# sourceMappingURL=preDestroy.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/actions/updateMetadataTag.js


function updateMetadataTag_updateMetadataTag(key, value) {
    return (metadata) => {
        if (metadata.tags.has(key)) {
            throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, 'Unexpected duplicated tag decorator with existing tag');
        }
        metadata.tags.set(key, value);
        return metadata;
    };
}
//# sourceMappingURL=updateMetadataTag.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/tagged.js




function tagged(key, value) {
    const updateMetadata = buildMaybeClassElementMetadataFromMaybeClassElementMetadata(updateMetadataTag(key, value));
    return injectBase(updateMetadata, incrementPendingClassMetadataCount);
}
//# sourceMappingURL=tagged.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildDefaultUnmanagedMetadata.js

function buildDefaultUnmanagedMetadata_buildDefaultUnmanagedMetadata() {
    return {
        kind: ClassElementMetadataKind.unmanaged,
    };
}
//# sourceMappingURL=buildDefaultUnmanagedMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildUnmanagedMetadataFromMaybeManagedMetadata.js




function buildUnmanagedMetadataFromMaybeManagedMetadata_buildUnmanagedMetadataFromMaybeManagedMetadata(metadata) {
    assertMetadataFromTypescriptIfManaged(metadata);
    if (hasManagedMetadata(metadata)) {
        throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, 'Unexpected injection found. Found @unmanaged injection with additional @named, @optional, @tagged or @targetName injections');
    }
    return buildDefaultUnmanagedMetadata();
}
function hasManagedMetadata(metadata) {
    return (metadata.name !== undefined || metadata.optional || metadata.tags.size > 0);
}
//# sourceMappingURL=buildUnmanagedMetadataFromMaybeManagedMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/calculations/buildUnmanagedMetadataFromMaybeClassElementMetadata.js



const buildUnmanagedMetadataFromMaybeClassElementMetadata_buildUnmanagedMetadataFromMaybeClassElementMetadata = (/* unused pure expression or super */ null && (buildClassElementMetadataFromMaybeClassElementMetadata(buildDefaultUnmanagedMetadata, buildUnmanagedMetadataFromMaybeManagedMetadata)));
//# sourceMappingURL=buildUnmanagedMetadataFromMaybeClassElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/decorators/unmanaged.js



function unmanaged() {
    const updateMetadata = buildUnmanagedMetadataFromMaybeClassElementMetadata();
    return injectBase(updateMetadata, decrementPendingClassMetadataCount);
}
//# sourceMappingURL=unmanaged.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/metadata/models/ResolvedValueElementMetadataKind.js
var ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind;
(function (ResolvedValueElementMetadataKind) {
    ResolvedValueElementMetadataKind[ResolvedValueElementMetadataKind["multipleInjection"] = 0] = "multipleInjection";
    ResolvedValueElementMetadataKind[ResolvedValueElementMetadataKind["singleInjection"] = 1] = "singleInjection";
})(ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind || (ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind = {}));
//# sourceMappingURL=ResolvedValueElementMetadataKind.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildGetPlanOptionsFromPlanParams.js
function buildGetPlanOptionsFromPlanParams(params) {
    if (params.rootConstraints.isMultiple) {
        return {
            chained: params.rootConstraints.chained,
            isMultiple: true,
            name: params.rootConstraints.name,
            optional: params.rootConstraints.isOptional ?? false,
            serviceIdentifier: params.rootConstraints.serviceIdentifier,
            tag: params.rootConstraints.tag,
        };
    }
    else {
        return {
            isMultiple: false,
            name: params.rootConstraints.name,
            optional: params.rootConstraints.isOptional ?? false,
            serviceIdentifier: params.rootConstraints.serviceIdentifier,
            tag: params.rootConstraints.tag,
        };
    }
}
//# sourceMappingURL=buildGetPlanOptionsFromPlanParams.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/models/BindingConstraintsImplementation.js
class BindingConstraintsImplementation {
    #node;
    constructor(node) {
        this.#node = node;
    }
    get name() {
        return this.#node.elem.name;
    }
    get serviceIdentifier() {
        return this.#node.elem.serviceIdentifier;
    }
    get tags() {
        return this.#node.elem.tags;
    }
    getAncestor() {
        this.#node.elem.getAncestorsCalled = true;
        if (this.#node.previous === undefined) {
            return undefined;
        }
        return new BindingConstraintsImplementation(this.#node.previous);
    }
}
//# sourceMappingURL=BindingConstraintsImplementation.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/isPlanServiceRedirectionBindingNode.js
const REDIRECTION_KEY = 'redirection';
function isPlanServiceRedirectionBindingNode(node) {
    return REDIRECTION_KEY in node;
}
//# sourceMappingURL=isPlanServiceRedirectionBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveServiceRedirectionBindingNode.js

function resolveBindingNode(params, planBindingNode) {
    if (isPlanServiceRedirectionBindingNode(planBindingNode)) {
        return resolveServiceRedirectionBindingNode(params, planBindingNode);
    }
    return [planBindingNode.resolve(params)];
}
function resolveServiceRedirectionBindingNode(params, node) {
    if (node.redirection.bindings === undefined) {
        return [];
    }
    if (Array.isArray(node.redirection.bindings)) {
        return node.redirection.bindings.flatMap((binding) => resolveBindingNode(params, binding));
    }
    return resolveBindingNode(params, node.redirection.bindings);
}
//# sourceMappingURL=resolveServiceRedirectionBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveMultipleBindingServiceNode.js



function resolveMultipleBindingServiceNode(params, bindings) {
    const resolvedValues = [];
    for (const binding of bindings) {
        if (isPlanServiceRedirectionBindingNode(binding)) {
            resolvedValues.push(...resolveServiceRedirectionBindingNode(params, binding));
        }
        else {
            resolvedValues.push(binding.resolve(params));
        }
    }
    if (resolvedValues.some(isPromise)) {
        return Promise.all(resolvedValues);
    }
    return resolvedValues;
}
//# sourceMappingURL=resolveMultipleBindingServiceNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/PlanMultipleBindingServiceNodeImplementation.js

class PlanMultipleBindingServiceNodeImplementation {
    bindings;
    serviceIdentifier;
    isContextFree;
    constructor(bindings, serviceIdentifier) {
        this.bindings = bindings;
        this.serviceIdentifier = serviceIdentifier;
        this.isContextFree = true;
    }
    resolve(params) {
        return resolveMultipleBindingServiceNode(params, this.bindings);
    }
}
//# sourceMappingURL=PlanMultipleBindingServiceNodeImplementation.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/DynamicallyResolvableBindingNode.js
const isDynamicallyResolvableBindingNodeSymbol = Symbol.for('@inversifyjs/core/DynamicallyResolvableBindingNode');
//# sourceMappingURL=DynamicallyResolvableBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/isDynamicallyResolvableBindingNode.js

function isDynamicallyResolvableBindingNode(node) {
    return (node[isDynamicallyResolvableBindingNodeSymbol] === true);
}
//# sourceMappingURL=isDynamicallyResolvableBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/PlanSingleBindingServiceNode.js

const UNDEFINED_RESOLVE = () => undefined;
const RESOLVE_KEY = 'resolve';
class PlanSingleBindingServiceNodeImplementation {
    serviceIdentifier;
    isContextFree;
    resolve;
    #binding;
    constructor(serviceIdentifier) {
        this.serviceIdentifier = serviceIdentifier;
        this.isContextFree = true;
        this.resolve = UNDEFINED_RESOLVE;
    }
    get bindings() {
        return this.#binding;
    }
    set bindings(value) {
        this.#binding = value;
        if (value === undefined) {
            this.resolve = UNDEFINED_RESOLVE;
        }
        else {
            /*
             * Binding nodes exposing an own `resolve` property provide `this`
             * independent closures. Reusing them avoids a bound function trampoline
             * in the resolution hot path. Prototype `resolve` methods rely on
             * `this`, so they are bound to the binding node instead.
             */
            this.resolve = Object.hasOwn(value, RESOLVE_KEY)
                ? value.resolve
                : value.resolve.bind(value);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (isDynamicallyResolvableBindingNode(value)) {
                // Weak reference to avoid memory leaks. A strong reference would prevent the service node from being garbage collected.
                const serviceNodeWeakReference = new WeakRef(this);
                value.addOnResolverChangedHandler((newResolver) => {
                    const serviceNode = serviceNodeWeakReference.deref();
                    if (serviceNode !== undefined) {
                        serviceNode.resolve = newResolver;
                    }
                });
            }
        }
    }
}
//# sourceMappingURL=PlanSingleBindingServiceNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildFilteredServiceBindings.js

function buildFilteredServiceBindings(params, bindingConstraints, options) {
    const serviceIdentifier = options?.customServiceIdentifier ?? bindingConstraints.serviceIdentifier;
    const serviceBindings = options?.chained === true
        ? [...params.operations.getBindingsChained(serviceIdentifier)]
        : [...(params.operations.getBindings(serviceIdentifier) ?? [])];
    const filteredBindings = serviceBindings.filter((binding) => binding.isSatisfiedBy(bindingConstraints));
    if (filteredBindings.length === 0 &&
        params.autobindOptions !== undefined &&
        typeof serviceIdentifier === 'function') {
        const binding = buildInstanceBinding(params.autobindOptions, serviceIdentifier);
        params.operations.setBinding(binding);
        if (binding.isSatisfiedBy(bindingConstraints)) {
            filteredBindings.push(binding);
        }
    }
    return filteredBindings;
}
//# sourceMappingURL=buildFilteredServiceBindings.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/stringifyBinding.js


function stringifyBinding(binding) {
    switch (binding.type) {
        case bindingTypeValues.Instance:
            return `[ type: "${binding.type}", serviceIdentifier: "${stringifyServiceIdentifier(binding.serviceIdentifier)}", scope: "${binding.scope}", implementationType: "${binding.implementationType.name}" ]`;
        case bindingTypeValues.ServiceRedirection:
            return `[ type: "${binding.type}", serviceIdentifier: "${stringifyServiceIdentifier(binding.serviceIdentifier)}", redirection: "${stringifyServiceIdentifier(binding.targetServiceIdentifier)}" ]`;
        default:
            return `[ type: "${binding.type}", serviceIdentifier: "${stringifyServiceIdentifier(binding.serviceIdentifier)}", scope: "${binding.scope}" ]`;
    }
}
//# sourceMappingURL=stringifyBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/throwErrorWhenUnexpectedBindingsAmountFound.js




const SINGLE_SERVICE_NODE_BINDINGS = 1;
function throwErrorWhenUnexpectedBindingsAmountFound(bindingNodes, isOptional, bindingConstraintNode) {
    const serviceIdentifier = bindingConstraintNode.elem.serviceIdentifier;
    const parentServiceIdentifier = bindingConstraintNode.previous?.elem.serviceIdentifier;
    if (Array.isArray(bindingNodes)) {
        throwErrorWhenMultipleUnexpectedBindingsAmountFound(bindingNodes, isOptional, serviceIdentifier, parentServiceIdentifier, bindingConstraintNode.elem);
    }
    else {
        throwErrorWhenSingleUnexpectedBindingFound(bindingNodes, isOptional, serviceIdentifier, parentServiceIdentifier, bindingConstraintNode.elem);
    }
}
function throwBindingNotFoundError(serviceIdentifier, parentServiceIdentifier, bindingConstraints) {
    const errorMessage = `No bindings found for service: "${stringifyServiceIdentifier(serviceIdentifier)}".

Trying to resolve bindings for "${stringifyParentServiceIdentifier(serviceIdentifier, parentServiceIdentifier)}".${stringifyBindingConstraints(bindingConstraints)}`;
    throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planning, errorMessage);
}
function throwErrorWhenMultipleUnexpectedBindingsAmountFound(bindingNodes, isOptional, serviceIdentifier, parentServiceIdentifier, bindingConstraints) {
    if (bindingNodes.length === SINGLE_SERVICE_NODE_BINDINGS) {
        return;
    }
    if (bindingNodes.length === 0) {
        if (!isOptional) {
            throwBindingNotFoundError(serviceIdentifier, parentServiceIdentifier, bindingConstraints);
        }
    }
    else {
        const errorMessage = `Ambiguous bindings found for service: "${stringifyServiceIdentifier(serviceIdentifier)}".

Registered bindings:

${bindingNodes.map((bindingNode) => stringifyBinding(bindingNode.binding)).join('\n')}

Trying to resolve bindings for "${stringifyParentServiceIdentifier(serviceIdentifier, parentServiceIdentifier)}".${stringifyBindingConstraints(bindingConstraints)}`;
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planning, errorMessage);
    }
}
function throwErrorWhenSingleUnexpectedBindingFound(bindingNode, isOptional, serviceIdentifier, parentServiceIdentifier, bindingConstraints) {
    if (bindingNode === undefined && !isOptional) {
        throwBindingNotFoundError(serviceIdentifier, parentServiceIdentifier, bindingConstraints);
    }
}
function stringifyParentServiceIdentifier(serviceIdentifier, parentServiceIdentifier) {
    return parentServiceIdentifier === undefined
        ? `${stringifyServiceIdentifier(serviceIdentifier)} (Root service)`
        : stringifyServiceIdentifier(parentServiceIdentifier);
}
function stringifyBindingConstraints(bindingConstraints) {
    const stringifiedTags = bindingConstraints.tags.size === 0
        ? ''
        : `
- tags:
  - ${[...bindingConstraints.tags.keys()].map((key) => key.toString()).join('\n  - ')}`;
    return `

Binding constraints:
- service identifier: ${stringifyServiceIdentifier(bindingConstraints.serviceIdentifier)}
- name: ${bindingConstraints.name?.toString() ?? '-'}${stringifiedTags}`;
}
//# sourceMappingURL=throwErrorWhenUnexpectedBindingsAmountFound.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/curryBuildPlanServiceNodeFromOptions.js





function curryBuildPlanServiceNodeFromOptions(buildServiceNodeBindings) {
    return (params, bindingConstraintsList, options) => {
        const serviceIdentifier = options.serviceIdentifier;
        const updatedBindingConstraintsList = bindingConstraintsList.concat({
            getAncestorsCalled: false,
            name: options.name,
            serviceIdentifier,
            tags: options.tags,
        });
        const bindingConstraints = new BindingConstraintsImplementation(updatedBindingConstraintsList.last);
        const chained = options.isMultiple && options.chained;
        const filteredServiceBindings = buildFilteredServiceBindings(params, bindingConstraints, {
            chained,
        });
        const serviceNodeBindings = [];
        if (options.isMultiple) {
            const serviceNode = new PlanMultipleBindingServiceNodeImplementation(serviceNodeBindings, serviceIdentifier);
            serviceNodeBindings.push(...buildServiceNodeBindings(params, updatedBindingConstraintsList, filteredServiceBindings, serviceNode, options));
            serviceNode.isContextFree =
                !updatedBindingConstraintsList.last.elem.getAncestorsCalled;
            return serviceNode;
        }
        const serviceNode = new PlanSingleBindingServiceNodeImplementation(serviceIdentifier);
        serviceNodeBindings.push(...buildServiceNodeBindings(params, updatedBindingConstraintsList, filteredServiceBindings, serviceNode, options));
        serviceNode.isContextFree =
            !updatedBindingConstraintsList.last.elem.getAncestorsCalled;
        throwErrorWhenUnexpectedBindingsAmountFound(serviceNodeBindings, options.optional, updatedBindingConstraintsList.last);
        const [planBindingNode] = serviceNodeBindings;
        serviceNode.bindings = planBindingNode;
        return serviceNode;
    };
}
//# sourceMappingURL=curryBuildPlanServiceNodeFromOptions.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/error/calculations/isStackOverflowError.js
/*
 * V8 (Chrome, Node.js, Edge, Deno): "Maximum call stack size exceeded"
 * SpiderMonkey (Firefox): "too much recursion"
 * JavaScriptCore (Safari): "call stack size exceeded"
 * Chakra (IE/legacy Edge): "Out of stack space"
 */
const STACK_OVERFLOW_PATTERNS = /stack space|call stack|too much recursion/i;
// SpiderMonkey throws InternalError with "too much recursion"
const SPIDER_MONKEY_REGEXP = /too much recursion/;
function isStackOverflowError(error) {
    try {
        if (!(error instanceof Error)) {
            return false;
        }
        return (
        // V8 and JavaScriptCore typically throw RangeError
        (error instanceof RangeError &&
            STACK_OVERFLOW_PATTERNS.test(error.message)) ||
            (error.name === 'InternalError' &&
                SPIDER_MONKEY_REGEXP.test(error.message)));
    }
    catch (innerError) {
        /*
         * The following code flow can lead to a secondary stack overflow:
         * 1. Code flow triggers infinite recursion
         * 3. On V8, `RangeError: Maximum call stack size exceeded` is thrown
         * 4. `isStackOverflowError(error)` is called in a catch block
         * 5. regex.test()` is called when the call stack is nearly exhausted
         * 6. Regex execution requires stack space, causing a secondary stack overflow
         * 7. V8 reports this as: `SyntaxError: Invalid regular expression: ... Stack overflow`
         */
        return (innerError instanceof SyntaxError &&
            innerError.message.includes('Stack overflow'));
    }
}
//# sourceMappingURL=isStackOverflowError.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/handlePlanError.js




/**
 * Extracts a likely circular dependency asuming a service asociated to a
 * service identifier should not be asociated to services asociated to the same
 * service identifier.
 *
 * Important note: given the current binding constraints, there's no way to know
 * which is exactly the circular dependency. Custom ancestor based constraints might
 * allow circular dependencies breaking the loop when a certain condition is met.
 *
 * @param params plan params
 */
function extractLikelyCircularDependency(params) {
    const serviceIdentifiers = new Set();
    for (const serviceIdentifier of params.servicesBranch) {
        if (serviceIdentifiers.has(serviceIdentifier)) {
            return [...serviceIdentifiers, serviceIdentifier];
        }
        serviceIdentifiers.add(serviceIdentifier);
    }
    return [...serviceIdentifiers];
}
function handlePlanError(params, error) {
    if (isStackOverflowError(error) ||
        InversifyCoreError_InversifyCoreError.isErrorOfKind(error, InversifyCoreErrorKind_InversifyCoreErrorKind.planningMaxDepthExceeded)) {
        const stringifiedCircularDependencies = stringifyServiceIdentifierTrace(extractLikelyCircularDependency(params));
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planning, `Circular dependency found: ${stringifiedCircularDependencies}`, { cause: error });
    }
    throw error;
}
function stringifyServiceIdentifierTrace(serviceIdentifiers) {
    const serviceIdentifiersArray = [...serviceIdentifiers];
    if (serviceIdentifiersArray.length === 0) {
        return '(No dependency trace)';
    }
    return serviceIdentifiersArray.map(stringifyServiceIdentifier).join(' -> ');
}
//# sourceMappingURL=handlePlanError.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/LazyPlanServiceNode.js
const isLazyPlanServiceNodeSymbol = Symbol.for('@inversifyjs/core/LazyPlanServiceNode');
class LazyPlanServiceNode {
    [isLazyPlanServiceNodeSymbol];
    _serviceIdentifier;
    _serviceNode;
    constructor(serviceNode, serviceIdentifier) {
        this[isLazyPlanServiceNodeSymbol] = true;
        this._serviceNode = serviceNode;
        this._serviceIdentifier = serviceIdentifier;
    }
    get bindings() {
        return this._getNode().bindings;
    }
    get isContextFree() {
        return this._getNode().isContextFree;
    }
    get serviceIdentifier() {
        return this._serviceIdentifier;
    }
    set bindings(bindings) {
        this._getNode().bindings = bindings;
    }
    set isContextFree(isContextFree) {
        this._getNode().isContextFree = isContextFree;
    }
    static is(value) {
        return (typeof value === 'object' &&
            value !== null &&
            value[isLazyPlanServiceNodeSymbol] ===
                true);
    }
    invalidate() {
        this._serviceNode = undefined;
    }
    isExpanded() {
        return this._serviceNode !== undefined;
    }
    resolve(params) {
        return this._getNode().resolve(params);
    }
    _getNode() {
        if (this._serviceNode === undefined) {
            this._serviceNode = this._buildPlanServiceNode();
        }
        return this._serviceNode;
    }
}
//# sourceMappingURL=LazyPlanServiceNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/common/calculations/buildBuildServiceNodeOptionsFromPlanParamsConstraints.js
function buildBuildServiceNodeOptionsFromPlanParamsConstraints(constraints) {
    const tags = new Map();
    if (constraints.tag !== undefined) {
        tags.set(constraints.tag.key, constraints.tag.value);
    }
    if (constraints.isMultiple) {
        return {
            chained: constraints.chained,
            isMultiple: constraints.isMultiple,
            name: constraints.name,
            optional: constraints.isOptional ?? false,
            serviceIdentifier: constraints.serviceIdentifier,
            tags,
        };
    }
    return {
        isMultiple: constraints.isMultiple,
        name: constraints.name,
        optional: constraints.isOptional ?? false,
        serviceIdentifier: constraints.serviceIdentifier,
        tags,
    };
}
//# sourceMappingURL=buildBuildServiceNodeOptionsFromPlanParamsConstraints.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/common/models/SingleImmutableLinkedList.js
class SingleImmutableLinkedList {
    last;
    length;
    constructor(last, length) {
        this.last = last;
        this.length = length;
    }
    concat(elem) {
        return new SingleImmutableLinkedList({
            elem,
            previous: this.last,
        }, this.length + 1);
    }
    [Symbol.iterator]() {
        let node = this.last;
        return {
            next: () => {
                if (node === undefined) {
                    return {
                        done: true,
                        value: undefined,
                    };
                }
                const elem = node.elem;
                node = node.previous;
                return {
                    done: false,
                    value: elem,
                };
            },
        };
    }
}
//# sourceMappingURL=SingleImmutableLinkedList.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildPlanBindingConstraintsList.js

function buildPlanBindingConstraintsList(params) {
    const tags = new Map();
    if (params.rootConstraints.tag !== undefined) {
        tags.set(params.rootConstraints.tag.key, params.rootConstraints.tag.value);
    }
    return new SingleImmutableLinkedList({
        elem: {
            getAncestorsCalled: false,
            name: params.rootConstraints.name,
            serviceIdentifier: params.rootConstraints.serviceIdentifier,
            tags,
        },
        previous: undefined,
    }, 1);
}
//# sourceMappingURL=buildPlanBindingConstraintsList.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/curryBuildPlanServiceNode.js







function curryBuildPlanServiceNode(buildServiceNodeBindings) {
    return (params) => {
        const bindingConstraintsList = buildPlanBindingConstraintsList(params);
        const bindingConstraints = new BindingConstraintsImplementation(bindingConstraintsList.last);
        const chained = params.rootConstraints.isMultiple && params.rootConstraints.chained;
        const filteredServiceBindings = buildFilteredServiceBindings(params, bindingConstraints, {
            chained,
        });
        const serviceNodeBindings = [];
        if (params.rootConstraints.isMultiple) {
            const serviceNode = new PlanMultipleBindingServiceNodeImplementation(serviceNodeBindings, params.rootConstraints.serviceIdentifier);
            serviceNodeBindings.push(...buildServiceNodeBindings(params, bindingConstraintsList, filteredServiceBindings, serviceNode, buildBuildServiceNodeOptionsFromPlanParamsConstraints(params.rootConstraints)));
            serviceNode.isContextFree =
                !bindingConstraintsList.last.elem.getAncestorsCalled;
            return serviceNode;
        }
        const serviceNode = new PlanSingleBindingServiceNodeImplementation(params.rootConstraints.serviceIdentifier);
        serviceNodeBindings.push(...buildServiceNodeBindings(params, bindingConstraintsList, filteredServiceBindings, serviceNode, buildBuildServiceNodeOptionsFromPlanParamsConstraints(params.rootConstraints)));
        serviceNode.isContextFree =
            !bindingConstraintsList.last.elem.getAncestorsCalled;
        throwErrorWhenUnexpectedBindingsAmountFound(serviceNodeBindings, params.rootConstraints.isOptional ?? false, bindingConstraintsList.last);
        const [planBindingNode] = serviceNodeBindings;
        serviceNode.bindings = planBindingNode;
        return serviceNode;
    };
}
//# sourceMappingURL=curryBuildPlanServiceNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/cacheResolvedValue.js

function cacheResolvedValue(binding, resolvedValue) {
    if (isPromise(resolvedValue)) {
        binding.cache = {
            isRight: true,
            value: resolvedValue,
        };
        return resolvedValue.then((syncResolvedValue) => cacheSyncResolvedValue(binding, syncResolvedValue));
    }
    return cacheSyncResolvedValue(binding, resolvedValue);
}
function cacheSyncResolvedValue(binding, resolvedValue) {
    binding.cache = {
        isRight: true,
        value: resolvedValue,
    };
    return resolvedValue;
}
//# sourceMappingURL=cacheResolvedValue.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingActivationsFromIteratorAsync.js
async function resolveBindingActivationsFromIteratorAsync(params, value, activationsIterator) {
    let activatedValue = await value;
    let activationIteratorResult = activationsIterator.next();
    while (activationIteratorResult.done !== true) {
        activatedValue = await activationIteratorResult.value(params.context, activatedValue);
        activationIteratorResult = activationsIterator.next();
    }
    return activatedValue;
}
//# sourceMappingURL=resolveBindingActivationsFromIteratorAsync.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingActivationsFromIterator.js


function resolveBindingActivationsFromIterator(params, value, activationsIterator) {
    let activatedValue = value;
    let activationIteratorResult = activationsIterator.next();
    while (activationIteratorResult.done !== true) {
        const nextActivatedValue = activationIteratorResult.value(params.context, activatedValue);
        if (isPromise(nextActivatedValue)) {
            return resolveBindingActivationsFromIteratorAsync(params, nextActivatedValue, activationsIterator);
        }
        else {
            activatedValue = nextActivatedValue;
        }
        activationIteratorResult = activationsIterator.next();
    }
    return activatedValue;
}
//# sourceMappingURL=resolveBindingActivationsFromIterator.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingServiceActivations.js



function resolveBindingServiceActivations(params, serviceIdentifier, value) {
    const activations = params.context.getActivations(serviceIdentifier);
    if (activations === undefined) {
        return value;
    }
    if (isPromise(value)) {
        return resolveBindingActivationsFromIteratorAsync(params, value, activations[Symbol.iterator]());
    }
    return resolveBindingActivationsFromIterator(params, value, activations[Symbol.iterator]());
}
//# sourceMappingURL=resolveBindingServiceActivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingActivations.js


function resolveBindingActivations(params, binding, value) {
    let activationResult = value;
    if (binding.onActivation !== undefined) {
        const onActivation = binding.onActivation;
        if (isPromise(activationResult)) {
            activationResult = activationResult.then((resolved) => onActivation(params.context, resolved));
        }
        else {
            activationResult = onActivation(params.context, activationResult);
        }
    }
    return resolveBindingServiceActivations(params, binding.serviceIdentifier, activationResult);
}
//# sourceMappingURL=resolveBindingActivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveScoped.js



function resolveScoped(node, resolve) {
    const binding = node.binding;
    switch (binding.scope) {
        case bindingScopeValues.Singleton: {
            return (params) => {
                if (binding.cache.isRight) {
                    return binding.cache.value;
                }
                const resolvedValue = resolveBindingActivations(params, binding, resolve(params, node));
                return cacheResolvedValue(binding, resolvedValue);
            };
        }
        case bindingScopeValues.Request: {
            return (params) => {
                if (params.requestScopeCache?.has(binding.id) === true) {
                    return params.requestScopeCache.get(binding.id);
                }
                const resolvedValue = resolveBindingActivations(params, binding, resolve(params, node));
                (params.requestScopeCache ??= new Map()).set(binding.id, resolvedValue);
                return resolvedValue;
            };
        }
        case bindingScopeValues.Transient:
            return (params) => resolveBindingActivations(params, binding, resolve(params, node));
    }
}
//# sourceMappingURL=resolveScoped.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/ConstantValueBindingNode.js

class ConstantValueBindingNode {
    binding;
    resolve;
    constructor(binding) {
        this.binding = binding;
        this.resolve = resolveScoped(this, (_params, node) => node.binding.value);
    }
}
//# sourceMappingURL=ConstantValueBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveScopedWithNoActivations.js


function resolveScopedWithNoActivations(binding, resolve) {
    switch (binding.scope) {
        case bindingScopeValues.Singleton: {
            return (params) => {
                if (binding.cache.isRight) {
                    return binding.cache.value;
                }
                const resolvedValue = resolve(params);
                return cacheResolvedValue(binding, resolvedValue);
            };
        }
        case bindingScopeValues.Request: {
            return (params) => {
                if (params.requestScopeCache?.has(binding.id) === true) {
                    return params.requestScopeCache.get(binding.id);
                }
                const resolvedValue = resolve(params);
                (params.requestScopeCache ??= new Map()).set(binding.id, resolvedValue);
                return resolvedValue;
            };
        }
        case bindingScopeValues.Transient:
            return resolve;
    }
}
//# sourceMappingURL=resolveScopedWithNoActivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveServiceActivations.js



function resolveServiceActivations(serviceIdentifier) {
    return (params, value) => {
        const activations = params.context.getActivations(serviceIdentifier);
        if (activations === undefined) {
            return value;
        }
        if (isPromise(value)) {
            return resolveBindingActivationsFromIteratorAsync(params, value, activations[Symbol.iterator]());
        }
        return resolveBindingActivationsFromIterator(params, value, activations[Symbol.iterator]());
    };
}
//# sourceMappingURL=resolveServiceActivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildNoActivationsDynamicValueBindingNodeResolver.js


/**
 * Builds a resolver for dynamic value binding nodes with no binding
 * activation.
 *
 * `node.binding.value(params.context)` is inlined so the resolution hot path
 * avoids an extra callback hop when activations can be skipped.
 */
function buildNoActivationsDynamicValueBindingNodeResolver(node, areServiceActivations) {
    const serviceIdentifier = node.binding.serviceIdentifier;
    const resolveActivations = areServiceActivations
        ? resolveServiceActivations(serviceIdentifier)
        : undefined;
    const resolveNode = resolveActivations === undefined
        ? (params) => node.binding.value(params.context)
        : (params) => resolveActivations(params, node.binding.value(params.context));
    return resolveScopedWithNoActivations(node.binding, resolveNode);
}
//# sourceMappingURL=buildNoActivationsDynamicValueBindingNodeResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/DynamicValueBindingNode.js



const resolveScopedDynamicValueBindingNode = (node) => resolveScoped(node, (params, node) => node.binding.value(params.context));
class DynamicValueBindingNode {
    binding;
    [isDynamicallyResolvableBindingNodeSymbol];
    resolve;
    #onResolverChangedHandlers;
    constructor(binding, params) {
        this.binding = binding;
        this[isDynamicallyResolvableBindingNodeSymbol] = true;
        const areServiceActivations = params.operations.getActivations(binding.serviceIdentifier) !== undefined;
        this.#onResolverChangedHandlers = undefined;
        this.resolve = this.#buildDynamicValueBindingNodeResolver(areServiceActivations);
        if (!areServiceActivations && this.#areNoBindingActivationsDefined()) {
            params.operations.subscribeActivationAddedOnce(binding.serviceIdentifier, this);
        }
    }
    onActivationAdded() {
        this.resolve = this.#buildDynamicValueBindingNodeResolver(true);
        if (this.#onResolverChangedHandlers !== undefined) {
            for (const handler of this.#onResolverChangedHandlers) {
                handler(this.resolve);
            }
        }
    }
    addOnResolverChangedHandler(callback) {
        if (this.#onResolverChangedHandlers === undefined) {
            this.#onResolverChangedHandlers = [];
        }
        this.#onResolverChangedHandlers.push(callback);
    }
    #buildDynamicValueBindingNodeResolver(areServiceActivations) {
        if (this.#areNoBindingActivationsDefined()) {
            return buildNoActivationsDynamicValueBindingNodeResolver(this, areServiceActivations);
        }
        return resolveScopedDynamicValueBindingNode(this);
    }
    #areNoBindingActivationsDefined() {
        return this.binding.onActivation === undefined;
    }
}
//# sourceMappingURL=DynamicValueBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/FactoryBindingNodeImplementation.js

class FactoryBindingNodeImplementation {
    binding;
    resolve;
    constructor(binding) {
        this.binding = binding;
        this.resolve = resolveScoped(this, (params, node) => node.binding.factory(params.context));
    }
}
//# sourceMappingURL=FactoryBindingNodeImplementation.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveInstanceBindingConstructorParams.js

function resolveInstanceBindingConstructorParams_resolveInstanceBindingConstructorParams(params, node) {
    const constructorResolvedValues = [];
    let promiseValueFound = false;
    for (const constructorParam of node.constructorParams) {
        const resolvedValue = constructorParam.resolve(params);
        if (!promiseValueFound && isPromise(resolvedValue)) {
            promiseValueFound = true;
        }
        constructorResolvedValues.push(resolvedValue);
    }
    return promiseValueFound
        ? Promise.all(constructorResolvedValues)
        : constructorResolvedValues;
}
//# sourceMappingURL=resolveInstanceBindingConstructorParams.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveInstanceBindingNode.js

function resolveInstanceBindingNode(resolveInstanceBindingConstructorParams, resolveInstanceBindingNodeAsyncFromConstructorParams, resolveInstanceBindingNodeFromConstructorParams) {
    return (params, node) => {
        const constructorValues = resolveInstanceBindingConstructorParams(params, node);
        if (isPromise(constructorValues)) {
            return resolveInstanceBindingNodeAsyncFromConstructorParams(constructorValues, params, node);
        }
        return resolveInstanceBindingNodeFromConstructorParams(constructorValues, params, node);
    };
}
//# sourceMappingURL=resolveInstanceBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolvePostConstruct.js



function resolvePostConstruct(instance, binding, postConstructMethodName) {
    const postConstructResult = invokePostConstruct(instance, binding, postConstructMethodName);
    if (isPromise(postConstructResult)) {
        return postConstructResult.then(() => instance);
    }
    return instance;
}
function invokePostConstruct(instance, binding, postConstructMethodName) {
    if (postConstructMethodName in instance) {
        if (typeof instance[postConstructMethodName] === 'function') {
            let postConstructResult;
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                postConstructResult = instance[postConstructMethodName]();
            }
            catch (error) {
                throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.resolution, `Unexpected error found when calling "${postConstructMethodName.toString()}" @postConstruct decorated method on class "${binding.implementationType.name}"`, {
                    cause: error,
                });
            }
            if (isPromise(postConstructResult)) {
                return invokePostConstructAsync(binding, postConstructMethodName, postConstructResult);
            }
        }
        else {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.resolution, `Expecting a "${postConstructMethodName.toString()}" method when resolving "${binding.implementationType.name}" class @postConstruct decorated method, a non function property was found instead.`);
        }
    }
    else {
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.resolution, `Expecting a "${postConstructMethodName.toString()}" property when resolving "${binding.implementationType.name}" class @postConstruct decorated method, none found.`);
    }
}
async function invokePostConstructAsync(binding, postConstructMethodName, postConstructResult) {
    try {
        await postConstructResult;
    }
    catch (error) {
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.resolution, `Unexpected error found when calling "${postConstructMethodName.toString()}" @postConstruct decorated method on class "${binding.implementationType.name}"`, {
            cause: error,
        });
    }
}
//# sourceMappingURL=resolvePostConstruct.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/setInstanceProperties.js




function setInstanceProperties(params, instance, node) {
    const propertyAssignmentPromises = [];
    for (const [propertyKey, propertyNode] of node.propertyParams) {
        const metadata = node.classMetadata.properties.get(propertyKey);
        if (metadata === undefined) {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.resolution, `Expecting metadata at property "${propertyKey.toString()}", none found`);
        }
        if (metadata.kind !== ClassElementMetadataKind_ClassElementMetadataKind.unmanaged &&
            propertyNode.bindings !== undefined) {
            instance[propertyKey] = propertyNode.resolve(params);
            if (isPromise(instance[propertyKey])) {
                propertyAssignmentPromises.push((async () => {
                    instance[propertyKey] = await instance[propertyKey];
                })());
            }
        }
    }
    if (propertyAssignmentPromises.length > 0) {
        return Promise.all(propertyAssignmentPromises).then(() => undefined);
    }
}
//# sourceMappingURL=setInstanceProperties.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveInstanceBindingNodeFromConstructorParams.js



function resolveAllPostConstructMethods(instance, binding, postConstructMethodNames) {
    if (postConstructMethodNames.size === 0) {
        return instance;
    }
    let result = instance;
    for (const methodName of postConstructMethodNames) {
        if (isPromise(result)) {
            result = result.then((resolvedInstance) => resolvePostConstruct(resolvedInstance, binding, methodName));
        }
        else {
            result = resolvePostConstruct(result, binding, methodName);
        }
    }
    return result;
}
function resolveInstanceBindingNodeFromConstructorParams_resolveInstanceBindingNodeFromConstructorParams(constructorValues, params, node) {
    const instance = new node.binding.implementationType(...constructorValues);
    const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
    if (isPromise(propertiesAssignmentResult)) {
        return propertiesAssignmentResult.then(() => resolveAllPostConstructMethods(instance, node.binding, node.classMetadata.lifecycle.postConstructMethodNames));
    }
    return resolveAllPostConstructMethods(instance, node.binding, node.classMetadata.lifecycle.postConstructMethodNames);
}
//# sourceMappingURL=resolveInstanceBindingNodeFromConstructorParams.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveInstanceBindingNodeAsyncFromConstructorParams.js

async function resolveInstanceBindingNodeAsyncFromConstructorParams_resolveInstanceBindingNodeAsyncFromConstructorParams(constructorValues, params, node) {
    const constructorResolvedValues = await constructorValues;
    return resolveInstanceBindingNodeFromConstructorParams_resolveInstanceBindingNodeFromConstructorParams(constructorResolvedValues, params, node);
}
//# sourceMappingURL=resolveInstanceBindingNodeAsyncFromConstructorParams.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildConstructorArgumentsResolver.js


/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * instance bindings with two or more constructor arguments. Equivalent to
 * `buildConstructorArgumentsResolverJit`, but implemented with a plain closure
 * instead of the `Function` constructor, so it works in environments
 * enforcing a strict Content Security Policy (no `unsafe-eval`).
 *
 * When the bound class has no properties to inject,
 * `node.classMetadata.properties` is empty and the returned `resolveNode`
 * never performs any property related check, matching the zero-property
 * fast path performance of `buildConstructorArgumentsResolverJit`.
 */
function buildConstructorArgumentsResolver(node, 
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
resolveAsyncValues, resolveActivations) {
    const constructorArgumentsCount = node.classMetadata.constructorArguments.length;
    function resolveConstructorValues(params) {
        const values = new Array(constructorArgumentsCount);
        for (let index = 0; index < constructorArgumentsCount; index++) {
            values[index] = node.constructorParams[index].resolve(params);
        }
        return values;
    }
    if (node.classMetadata.properties.size === 0) {
        if (resolveActivations === undefined) {
            return function resolveNode(params) {
                const values = resolveConstructorValues(params);
                function build(...resolvedValues) {
                    return new node.binding.implementationType(...resolvedValues);
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
                return resolveAsyncValues(...values, build);
            };
        }
        return function resolveNode(params) {
            const values = resolveConstructorValues(params);
            const build = (...resolvedValues) => resolveActivations(params, new node.binding.implementationType(...resolvedValues));
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
            return resolveAsyncValues(...values, build);
        };
    }
    if (resolveActivations === undefined) {
        return function resolveNode(params) {
            const values = resolveConstructorValues(params);
            function build(...resolvedValues) {
                const instance = new node.binding.implementationType(...resolvedValues);
                const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
                if (isPromise(propertiesAssignmentResult)) {
                    return propertiesAssignmentResult.then(() => instance);
                }
                return instance;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
            return resolveAsyncValues(...values, build);
        };
    }
    return function resolveNode(params) {
        const values = resolveConstructorValues(params);
        const build = (...resolvedValues) => {
            const instance = new node.binding.implementationType(...resolvedValues);
            const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
            if (isPromise(propertiesAssignmentResult)) {
                return propertiesAssignmentResult.then(() => resolveActivations(params, instance));
            }
            return resolveActivations(params, instance);
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        return resolveAsyncValues(...values, build);
    };
}
//# sourceMappingURL=buildConstructorArgumentsResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/resolveFour.js

const TWO_PARAMS = 2;
const THREE_PARAMS = 3;
const FOUR_PARAMS = 4;
function resolveFour(value1, value2, value3, value4, build) {
    if (isPromise(value1)) {
        if (isPromise(value2)) {
            if (isPromise(value3)) {
                if (isPromise(value4)) {
                    return new Promise((resolve, reject) => {
                        let resolvedValues = 0;
                        let resolvedValue1;
                        let resolvedValue2;
                        let resolvedValue3;
                        let resolvedValue4;
                        void value1
                            .then((resolvedValue) => {
                            if (++resolvedValues === FOUR_PARAMS) {
                                resolve(build(resolvedValue, resolvedValue2, resolvedValue3, resolvedValue4));
                            }
                            else {
                                resolvedValue1 = resolvedValue;
                            }
                        })
                            .catch(reject);
                        void value2
                            .then((resolvedValue) => {
                            if (++resolvedValues === FOUR_PARAMS) {
                                resolve(build(resolvedValue1, resolvedValue, resolvedValue3, resolvedValue4));
                            }
                            else {
                                resolvedValue2 = resolvedValue;
                            }
                        })
                            .catch(reject);
                        void value3
                            .then((resolvedValue) => {
                            if (++resolvedValues === FOUR_PARAMS) {
                                resolve(build(resolvedValue1, resolvedValue2, resolvedValue, resolvedValue4));
                            }
                            else {
                                resolvedValue3 = resolvedValue;
                            }
                        })
                            .catch(reject);
                        void value4
                            .then((resolvedValue) => {
                            if (++resolvedValues === FOUR_PARAMS) {
                                resolve(build(resolvedValue1, resolvedValue2, resolvedValue3, resolvedValue));
                            }
                            else {
                                resolvedValue4 = resolvedValue;
                            }
                        })
                            .catch(reject);
                    });
                }
                return new Promise((resolve, reject) => {
                    let resolvedValues = 0;
                    let resolvedValue1;
                    let resolvedValue2;
                    let resolvedValue3;
                    void value1
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue, resolvedValue2, resolvedValue3, value4));
                        }
                        else {
                            resolvedValue1 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value2
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue1, resolvedValue, resolvedValue3, value4));
                        }
                        else {
                            resolvedValue2 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value3
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue1, resolvedValue2, resolvedValue, value4));
                        }
                        else {
                            resolvedValue3 = resolvedValue;
                        }
                    })
                        .catch(reject);
                });
            }
            if (isPromise(value4)) {
                return new Promise((resolve, reject) => {
                    let resolvedValues = 0;
                    let resolvedValue1;
                    let resolvedValue2;
                    let resolvedValue4;
                    void value1
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue, resolvedValue2, value3, resolvedValue4));
                        }
                        else {
                            resolvedValue1 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value2
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue1, resolvedValue, value3, resolvedValue4));
                        }
                        else {
                            resolvedValue2 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value4
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue1, resolvedValue2, value3, resolvedValue));
                        }
                        else {
                            resolvedValue4 = resolvedValue;
                        }
                    })
                        .catch(reject);
                });
            }
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue1;
                let resolvedValue2;
                void value1
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(resolvedValue, resolvedValue2, value3, value4));
                    }
                    else {
                        resolvedValue1 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value2
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(resolvedValue1, resolvedValue, value3, value4));
                    }
                    else {
                        resolvedValue2 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        if (isPromise(value3)) {
            if (isPromise(value4)) {
                return new Promise((resolve, reject) => {
                    let resolvedValues = 0;
                    let resolvedValue1;
                    let resolvedValue3;
                    let resolvedValue4;
                    void value1
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue, value2, resolvedValue3, resolvedValue4));
                        }
                        else {
                            resolvedValue1 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value3
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue1, value2, resolvedValue, resolvedValue4));
                        }
                        else {
                            resolvedValue3 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value4
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(resolvedValue1, value2, resolvedValue3, resolvedValue));
                        }
                        else {
                            resolvedValue4 = resolvedValue;
                        }
                    })
                        .catch(reject);
                });
            }
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue1;
                let resolvedValue3;
                void value1
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(resolvedValue, value2, resolvedValue3, value4));
                    }
                    else {
                        resolvedValue1 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value3
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(resolvedValue1, value2, resolvedValue, value4));
                    }
                    else {
                        resolvedValue3 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        if (isPromise(value4)) {
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue1;
                let resolvedValue4;
                void value1
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(resolvedValue, value2, value3, resolvedValue4));
                    }
                    else {
                        resolvedValue1 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value4
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(resolvedValue1, value2, value3, resolvedValue));
                    }
                    else {
                        resolvedValue4 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        return value1.then(async (resolvedValue1) => build(resolvedValue1, value2, value3, value4));
    }
    if (isPromise(value2)) {
        if (isPromise(value3)) {
            if (isPromise(value4)) {
                return new Promise((resolve, reject) => {
                    let resolvedValues = 0;
                    let resolvedValue2;
                    let resolvedValue3;
                    let resolvedValue4;
                    void value2
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(value1, resolvedValue, resolvedValue3, resolvedValue4));
                        }
                        else {
                            resolvedValue2 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value3
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(value1, resolvedValue2, resolvedValue, resolvedValue4));
                        }
                        else {
                            resolvedValue3 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value4
                        .then((resolvedValue) => {
                        if (++resolvedValues === THREE_PARAMS) {
                            resolve(build(value1, resolvedValue2, resolvedValue3, resolvedValue));
                        }
                        else {
                            resolvedValue4 = resolvedValue;
                        }
                    })
                        .catch(reject);
                });
            }
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue2;
                let resolvedValue3;
                void value2
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(value1, resolvedValue, resolvedValue3, value4));
                    }
                    else {
                        resolvedValue2 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value3
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(value1, resolvedValue2, resolvedValue, value4));
                    }
                    else {
                        resolvedValue3 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        if (isPromise(value4)) {
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue2;
                let resolvedValue4;
                void value2
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(value1, resolvedValue, value3, resolvedValue4));
                    }
                    else {
                        resolvedValue2 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value4
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(value1, resolvedValue2, value3, resolvedValue));
                    }
                    else {
                        resolvedValue4 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        return value2.then(async (resolvedValue2) => build(value1, resolvedValue2, value3, value4));
    }
    if (isPromise(value3)) {
        if (isPromise(value4)) {
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue3;
                let resolvedValue4;
                void value3
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(value1, value2, resolvedValue, resolvedValue4));
                    }
                    else {
                        resolvedValue3 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value4
                    .then((resolvedValue) => {
                    if (++resolvedValues === TWO_PARAMS) {
                        resolve(build(value1, value2, resolvedValue3, resolvedValue));
                    }
                    else {
                        resolvedValue4 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        return value3.then(async (resolvedValue3) => build(value1, value2, resolvedValue3, value4));
    }
    if (isPromise(value4)) {
        return value4.then(async (resolvedValue4) => build(value1, value2, value3, resolvedValue4));
    }
    return build(value1, value2, value3, value4);
}
//# sourceMappingURL=resolveFour.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildFourConstructorArgumentResolver.js



/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * four-argument instance bindings. Equivalent to
 * `buildConstructorArgumentsResolverJit` with `resolveFour`, but implemented
 * with a plain closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 *
 * When the bound class has no properties to inject,
 * `node.classMetadata.properties` is empty and the returned `resolveNode`
 * never performs any property related check, matching the zero-property
 * fast path performance of `buildConstructorArgumentsResolverJit` with
 * `resolveFour`.
 */
function buildFourConstructorArgumentResolver(node, resolveActivations) {
    if (node.classMetadata.properties.size === 0) {
        if (resolveActivations === undefined) {
            return function resolveNode(params) {
                const resolvedValue0 = node.constructorParams[0].resolve(params);
                const resolvedValue1 = node.constructorParams[1].resolve(params);
                const resolvedValue2 = node.constructorParams[2].resolve(params);
                const resolvedValue3 = node.constructorParams[3].resolve(params);
                return resolveFour(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3, (resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3) => new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3));
            };
        }
        return function resolveNode(params) {
            const resolvedValue0 = node.constructorParams[0].resolve(params);
            const resolvedValue1 = node.constructorParams[1].resolve(params);
            const resolvedValue2 = node.constructorParams[2].resolve(params);
            const resolvedValue3 = node.constructorParams[3].resolve(params);
            return resolveFour(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3, (resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3) => resolveActivations(params, new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3)));
        };
    }
    if (resolveActivations === undefined) {
        const finalizeInstance = (params, instance) => {
            const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
            if (isPromise(propertiesAssignmentResult)) {
                return propertiesAssignmentResult.then(() => instance);
            }
            return instance;
        };
        return function resolveNode(params) {
            const resolvedValue0 = node.constructorParams[0].resolve(params);
            const resolvedValue1 = node.constructorParams[1].resolve(params);
            const resolvedValue2 = node.constructorParams[2].resolve(params);
            const resolvedValue3 = node.constructorParams[3].resolve(params);
            return resolveFour(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3, (resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3) => finalizeInstance(params, new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3)));
        };
    }
    const finalizeInstance = (params, instance) => {
        const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
        if (isPromise(propertiesAssignmentResult)) {
            return propertiesAssignmentResult.then(() => resolveActivations(params, instance));
        }
        return resolveActivations(params, instance);
    };
    return function resolveNode(params) {
        const resolvedValue0 = node.constructorParams[0].resolve(params);
        const resolvedValue1 = node.constructorParams[1].resolve(params);
        const resolvedValue2 = node.constructorParams[2].resolve(params);
        const resolvedValue3 = node.constructorParams[3].resolve(params);
        return resolveFour(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3, (resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3) => finalizeInstance(params, new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3)));
    };
}
//# sourceMappingURL=buildFourConstructorArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildOneConstructorArgumentResolver.js


/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * one-argument instance bindings. Equivalent to
 * `buildOneConstructorArgumentResolverJit`, but implemented with a plain
 * closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 *
 * When the bound class has no properties to inject,
 * `node.classMetadata.properties` is empty and the returned `resolveNode`
 * never performs any property related check, matching the zero-property
 * fast path performance of `buildOneConstructorArgumentResolverJit`.
 */
function buildOneConstructorArgumentResolver(node, resolveActivations) {
    if (node.classMetadata.properties.size === 0) {
        if (resolveActivations === undefined) {
            return function resolveNode(params) {
                const resolvedValue = node.constructorParams[0].resolve(params);
                if (isPromise(resolvedValue)) {
                    return resolvedValue.then((resolvedValue) => new node.binding.implementationType(resolvedValue));
                }
                return new node.binding.implementationType(resolvedValue);
            };
        }
        return function resolveNode(params) {
            const resolvedValue = node.constructorParams[0].resolve(params);
            if (isPromise(resolvedValue)) {
                return resolvedValue.then((resolvedValue) => resolveActivations(params, new node.binding.implementationType(resolvedValue)));
            }
            return resolveActivations(params, new node.binding.implementationType(resolvedValue));
        };
    }
    if (resolveActivations === undefined) {
        const finalizeInstance = (params, instance) => {
            const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
            if (isPromise(propertiesAssignmentResult)) {
                return propertiesAssignmentResult.then(() => instance);
            }
            return instance;
        };
        return function resolveNode(params) {
            const resolvedValue = node.constructorParams[0].resolve(params);
            if (isPromise(resolvedValue)) {
                return resolvedValue.then((resolvedValue) => finalizeInstance(params, new node.binding.implementationType(resolvedValue)));
            }
            return finalizeInstance(params, new node.binding.implementationType(resolvedValue));
        };
    }
    const finalizeInstance = (params, instance) => {
        const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
        if (isPromise(propertiesAssignmentResult)) {
            return propertiesAssignmentResult.then(() => resolveActivations(params, instance));
        }
        return resolveActivations(params, instance);
    };
    return function resolveNode(params) {
        const resolvedValue = node.constructorParams[0].resolve(params);
        if (isPromise(resolvedValue)) {
            return resolvedValue.then((resolvedValue) => finalizeInstance(params, new node.binding.implementationType(resolvedValue)));
        }
        return finalizeInstance(params, new node.binding.implementationType(resolvedValue));
    };
}
//# sourceMappingURL=buildOneConstructorArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/resolveThree.js

const resolveThree_TWO_PARAMS = 2;
const resolveThree_THREE_PARAMS = 3;
function resolveThree(value1, value2, value3, build) {
    if (isPromise(value1)) {
        if (isPromise(value2)) {
            if (isPromise(value3)) {
                return new Promise((resolve, reject) => {
                    let resolvedValues = 0;
                    let resolvedValue1;
                    let resolvedValue2;
                    let resolvedValue3;
                    void value1
                        .then((resolvedValue) => {
                        if (++resolvedValues === resolveThree_THREE_PARAMS) {
                            resolve(build(resolvedValue, resolvedValue2, resolvedValue3));
                        }
                        else {
                            resolvedValue1 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value2
                        .then((resolvedValue) => {
                        if (++resolvedValues === resolveThree_THREE_PARAMS) {
                            resolve(build(resolvedValue1, resolvedValue, resolvedValue3));
                        }
                        else {
                            resolvedValue2 = resolvedValue;
                        }
                    })
                        .catch(reject);
                    void value3
                        .then((resolvedValue) => {
                        if (++resolvedValues === resolveThree_THREE_PARAMS) {
                            resolve(build(resolvedValue1, resolvedValue2, resolvedValue));
                        }
                        else {
                            resolvedValue3 = resolvedValue;
                        }
                    })
                        .catch(reject);
                });
            }
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue1;
                let resolvedValue2;
                void value1
                    .then((resolvedValue) => {
                    if (++resolvedValues === resolveThree_TWO_PARAMS) {
                        resolve(build(resolvedValue, resolvedValue2, value3));
                    }
                    else {
                        resolvedValue1 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value2
                    .then((resolvedValue) => {
                    if (++resolvedValues === resolveThree_TWO_PARAMS) {
                        resolve(build(resolvedValue1, resolvedValue, value3));
                    }
                    else {
                        resolvedValue2 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        if (isPromise(value3)) {
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue1;
                let resolvedValue3;
                void value1
                    .then((resolvedValue) => {
                    if (++resolvedValues === resolveThree_TWO_PARAMS) {
                        resolve(build(resolvedValue, value2, resolvedValue3));
                    }
                    else {
                        resolvedValue1 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value3
                    .then((resolvedValue) => {
                    if (++resolvedValues === resolveThree_TWO_PARAMS) {
                        resolve(build(resolvedValue1, value2, resolvedValue));
                    }
                    else {
                        resolvedValue3 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        return value1.then(async (resolvedValue1) => build(resolvedValue1, value2, value3));
    }
    if (isPromise(value2)) {
        if (isPromise(value3)) {
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue2;
                let resolvedValue3;
                void value2
                    .then((resolvedValue) => {
                    if (++resolvedValues === resolveThree_TWO_PARAMS) {
                        resolve(build(value1, resolvedValue, resolvedValue3));
                    }
                    else {
                        resolvedValue2 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value3
                    .then((resolvedValue) => {
                    if (++resolvedValues === resolveThree_TWO_PARAMS) {
                        resolve(build(value1, resolvedValue2, resolvedValue));
                    }
                    else {
                        resolvedValue3 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        return value2.then(async (resolvedValue2) => build(value1, resolvedValue2, value3));
    }
    if (isPromise(value3)) {
        return value3.then(async (resolvedValue3) => build(value1, value2, resolvedValue3));
    }
    return build(value1, value2, value3);
}
//# sourceMappingURL=resolveThree.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildThreeConstructorArgumentResolver.js



/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * three-argument instance bindings. Equivalent to
 * `buildConstructorArgumentsResolverJit` with `resolveThree`, but implemented
 * with a plain closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 *
 * When the bound class has no properties to inject,
 * `node.classMetadata.properties` is empty and the returned `resolveNode`
 * never performs any property related check, matching the zero-property
 * fast path performance of `buildConstructorArgumentsResolverJit` with
 * `resolveThree`.
 */
function buildThreeConstructorArgumentResolver(node, resolveActivations) {
    if (node.classMetadata.properties.size === 0) {
        if (resolveActivations === undefined) {
            return function resolveNode(params) {
                const resolvedValue0 = node.constructorParams[0].resolve(params);
                const resolvedValue1 = node.constructorParams[1].resolve(params);
                const resolvedValue2 = node.constructorParams[2].resolve(params);
                return resolveThree(resolvedValue0, resolvedValue1, resolvedValue2, (resolvedValue0, resolvedValue1, resolvedValue2) => new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2));
            };
        }
        return function resolveNode(params) {
            const resolvedValue0 = node.constructorParams[0].resolve(params);
            const resolvedValue1 = node.constructorParams[1].resolve(params);
            const resolvedValue2 = node.constructorParams[2].resolve(params);
            return resolveThree(resolvedValue0, resolvedValue1, resolvedValue2, (resolvedValue0, resolvedValue1, resolvedValue2) => resolveActivations(params, new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2)));
        };
    }
    if (resolveActivations === undefined) {
        const finalizeInstance = (params, instance) => {
            const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
            if (isPromise(propertiesAssignmentResult)) {
                return propertiesAssignmentResult.then(() => instance);
            }
            return instance;
        };
        return function resolveNode(params) {
            const resolvedValue0 = node.constructorParams[0].resolve(params);
            const resolvedValue1 = node.constructorParams[1].resolve(params);
            const resolvedValue2 = node.constructorParams[2].resolve(params);
            return resolveThree(resolvedValue0, resolvedValue1, resolvedValue2, (resolvedValue0, resolvedValue1, resolvedValue2) => finalizeInstance(params, new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2)));
        };
    }
    const finalizeInstance = (params, instance) => {
        const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
        if (isPromise(propertiesAssignmentResult)) {
            return propertiesAssignmentResult.then(() => resolveActivations(params, instance));
        }
        return resolveActivations(params, instance);
    };
    return function resolveNode(params) {
        const resolvedValue0 = node.constructorParams[0].resolve(params);
        const resolvedValue1 = node.constructorParams[1].resolve(params);
        const resolvedValue2 = node.constructorParams[2].resolve(params);
        return resolveThree(resolvedValue0, resolvedValue1, resolvedValue2, (resolvedValue0, resolvedValue1, resolvedValue2) => finalizeInstance(params, new node.binding.implementationType(resolvedValue0, resolvedValue1, resolvedValue2)));
    };
}
//# sourceMappingURL=buildThreeConstructorArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/resolveTwo.js

const PARAMS = 2;
function resolveTwo(value1, value2, build) {
    if (isPromise(value1)) {
        if (isPromise(value2)) {
            return new Promise((resolve, reject) => {
                let resolvedValues = 0;
                let resolvedValue1;
                let resolvedValue2;
                void value1
                    .then((resolvedValue) => {
                    if (++resolvedValues === PARAMS) {
                        resolve(build(resolvedValue, resolvedValue2));
                    }
                    else {
                        resolvedValue1 = resolvedValue;
                    }
                })
                    .catch(reject);
                void value2
                    .then((resolvedValue) => {
                    if (++resolvedValues === PARAMS) {
                        resolve(build(resolvedValue1, resolvedValue));
                    }
                    else {
                        resolvedValue2 = resolvedValue;
                    }
                })
                    .catch(reject);
            });
        }
        return value1.then(async (resolvedValue1) => build(resolvedValue1, value2));
    }
    if (isPromise(value2)) {
        return value2.then(async (resolvedValue2) => build(value1, resolvedValue2));
    }
    return build(value1, value2);
}
//# sourceMappingURL=resolveTwo.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildTwoConstructorArgumentResolver.js



/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * two-argument instance bindings. Equivalent to
 * `buildConstructorArgumentsResolverJit` with `resolveTwo`, but implemented with a
 * plain closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 *
 * When the bound class has no properties to inject,
 * `node.classMetadata.properties` is empty and the returned `resolveNode`
 * never performs any property related check, matching the zero-property
 * fast path performance of `buildConstructorArgumentsResolverJit` with
 * `resolveTwo`.
 */
function buildTwoConstructorArgumentResolver(node, resolveActivations) {
    if (node.classMetadata.properties.size === 0) {
        if (resolveActivations === undefined) {
            return function resolveNode(params) {
                const resolvedValue0 = node.constructorParams[0].resolve(params);
                const resolvedValue1 = node.constructorParams[1].resolve(params);
                return resolveTwo(resolvedValue0, resolvedValue1, (resolvedValue0, resolvedValue1) => new node.binding.implementationType(resolvedValue0, resolvedValue1));
            };
        }
        return function resolveNode(params) {
            const resolvedValue0 = node.constructorParams[0].resolve(params);
            const resolvedValue1 = node.constructorParams[1].resolve(params);
            return resolveTwo(resolvedValue0, resolvedValue1, (resolvedValue0, resolvedValue1) => resolveActivations(params, new node.binding.implementationType(resolvedValue0, resolvedValue1)));
        };
    }
    if (resolveActivations === undefined) {
        const finalizeInstance = (params, instance) => {
            const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
            if (isPromise(propertiesAssignmentResult)) {
                return propertiesAssignmentResult.then(() => instance);
            }
            return instance;
        };
        return function resolveNode(params) {
            const resolvedValue0 = node.constructorParams[0].resolve(params);
            const resolvedValue1 = node.constructorParams[1].resolve(params);
            return resolveTwo(resolvedValue0, resolvedValue1, (resolvedValue0, resolvedValue1) => finalizeInstance(params, new node.binding.implementationType(resolvedValue0, resolvedValue1)));
        };
    }
    const finalizeInstance = (params, instance) => {
        const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
        if (isPromise(propertiesAssignmentResult)) {
            return propertiesAssignmentResult.then(() => resolveActivations(params, instance));
        }
        return resolveActivations(params, instance);
    };
    return function resolveNode(params) {
        const resolvedValue0 = node.constructorParams[0].resolve(params);
        const resolvedValue1 = node.constructorParams[1].resolve(params);
        return resolveTwo(resolvedValue0, resolvedValue1, (resolvedValue0, resolvedValue1) => finalizeInstance(params, new node.binding.implementationType(resolvedValue0, resolvedValue1)));
    };
}
//# sourceMappingURL=buildTwoConstructorArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildZeroConstructorArgumentsResolver.js


/**
 * Builds a `resolveNode` for a zero-argument instance binding without
 * relying on the `Function` constructor.
 *
 * `buildZeroConstructorArgumentsResolverJit` generates a brand new function
 * from source text for every binding to keep the `new ctor()` call site
 * monomorphic in V8's eyes. That approach requires `unsafe-eval` (or an
 * equivalent CSP trusted types allowance), so it cannot be used in
 * environments enforcing a strict Content Security Policy.
 *
 * This function provides the same behavior using a plain closure instead,
 * so it works under CSP restrictions at the cost of the per-binding
 * monomorphic optimization described above.
 *
 * When the bound class has no properties to inject,
 * `node.classMetadata.properties` is empty and the returned `resolveNode`
 * never performs any property related check, matching the zero-property
 * fast path performance of `buildZeroConstructorArgumentsResolverJit`.
 */
function buildZeroConstructorArgumentsResolver(node, resolveActivations) {
    if (node.classMetadata.properties.size === 0) {
        if (resolveActivations === undefined) {
            return function resolveNode(_params) {
                return new node.binding.implementationType();
            };
        }
        return function resolveNode(params) {
            return resolveActivations(params, new node.binding.implementationType());
        };
    }
    if (resolveActivations === undefined) {
        return function resolveNode(params) {
            const instance = new node.binding.implementationType();
            const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
            if (isPromise(propertiesAssignmentResult)) {
                return propertiesAssignmentResult.then(() => instance);
            }
            return instance;
        };
    }
    return function resolveNode(params) {
        const instance = new node.binding.implementationType();
        const propertiesAssignmentResult = setInstanceProperties(params, instance, node);
        if (isPromise(propertiesAssignmentResult)) {
            return propertiesAssignmentResult.then(() => resolveActivations(params, instance));
        }
        return resolveActivations(params, instance);
    };
}
//# sourceMappingURL=buildZeroConstructorArgumentsResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/resolveMany.js

/**
 * CSP-safe counterpart to `buildResolveMany`.
 *
 * `buildResolveMany` emits a fixed-arity helper with the `Function`
 * constructor so it cannot run under a strict Content Security Policy.
 * This helper accepts a variable number of resolved values followed by a
 * `build` callback and uses `Promise.all` when any value is async.
 */
function resolveMany(
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
...args) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const build = args[args.length - 1];
    const values = args.slice(0, -1);
    for (const value of values) {
        if (isPromise(value)) {
            return Promise.all(values).then(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
            (resolvedValues) => build(...resolvedValues));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return build(...values);
}
//# sourceMappingURL=resolveMany.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildNoActivationsInstanceBindingNodeResolver.js









const ZERO_CONSTRUCTOR_ARGUMENTS = 0;
const ONE_CONSTRUCTOR_ARGUMENT = 1;
const TWO_CONSTRUCTOR_ARGUMENTS = 2;
const THREE_CONSTRUCTOR_ARGUMENTS = 3;
const FOUR_CONSTRUCTOR_ARGUMENTS = 4;
/**
 * Builds a resolver for instance binding nodes with
 * no post construct methods and no binding activation.
 *
 * Unlike the JIT path, specialized CSP resolvers key only on constructor
 * arity: property injection is handled inside those resolvers via
 * `setInstanceProperties`, so mixed ctor/property graphs must not be
 * dispatched as if properties were extra constructor arguments.
 */
function buildNoActivationsInstanceBindingNodeResolver(node, areServiceActivations) {
    const serviceIdentifier = node.binding.serviceIdentifier;
    const resolveActivations = areServiceActivations
        ? resolveServiceActivations(serviceIdentifier)
        : undefined;
    let resolveNode;
    switch (node.classMetadata.constructorArguments.length) {
        case ZERO_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildZeroConstructorArgumentsResolver(node, resolveActivations);
            break;
        case ONE_CONSTRUCTOR_ARGUMENT:
            resolveNode = buildOneConstructorArgumentResolver(node, resolveActivations);
            break;
        case TWO_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildTwoConstructorArgumentResolver(node, resolveActivations);
            break;
        case THREE_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildThreeConstructorArgumentResolver(node, resolveActivations);
            break;
        case FOUR_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildFourConstructorArgumentResolver(node, resolveActivations);
            break;
        default:
            resolveNode = buildConstructorArgumentsResolver(node, resolveMany, resolveActivations);
    }
    return resolveScopedWithNoActivations(node.binding, resolveNode);
}
//# sourceMappingURL=buildNoActivationsInstanceBindingNodeResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/getGeneratedResolverId.js
/*
 * Monotonically increasing id used to make every generated function's
 * source text unique (see buildZeroConstructorArgumentsResolveNode below).
 */
let nextGeneratedResolverId = 0;
function getGeneratedResolverId() {
    return nextGeneratedResolverId++;
}
//# sourceMappingURL=getGeneratedResolverId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildConstructorArgumentsResolverJit.js

function buildConstructorArgumentsResolverJit(node, implementationType, 
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
resolveAsyncValues, resolveActivations) {
    const id = getGeneratedResolverId().toString();
    const constructorArgumentsCount = node.classMetadata.constructorArguments.length;
    const constructorArgumentIndexes = Array.from({ length: constructorArgumentsCount }, (_, index) => index);
    const constructorValuesConcatenation = constructorArgumentIndexes
        .map((index) => `value$${index.toString()}`)
        .join(', ');
    let constructorValuesDeclarations = '';
    for (const index of constructorArgumentIndexes) {
        constructorValuesDeclarations += `const value$${index.toString()} = node$${id}.constructorParams[${index.toString()}].resolve(params$${id});\n`;
    }
    const propertiesArgumentsCount = node.classMetadata.properties.size;
    const propertiesArgumentIndexes = Array.from({ length: propertiesArgumentsCount }, (_, index) => index);
    const propertiesValuesConcatenation = propertiesArgumentIndexes
        .map((index) => `property$${index.toString()}`)
        .join(', ');
    let propertyValuesDeclarations = `let propertyIterator = node$${id}.propertyParams.entries();\n`;
    for (const index of propertiesArgumentIndexes) {
        propertyValuesDeclarations += `const propertyNode$${index.toString()} = propertyIterator.next().value;
  const propertyKey$${index.toString()} = propertyNode$${index.toString()}[0];
  const propertyBound$${index.toString()} = propertyNode$${index.toString()}[1].bindings !== undefined;
  const property$${index.toString()} = propertyBound$${index.toString()} ? propertyNode$${index.toString()}[1].resolve(params$${id}) : undefined;\n`;
    }
    const propertyAssignments = propertiesArgumentIndexes
        .map((index) => `if (propertyBound$${index.toString()}) { instance[propertyKey$${index.toString()}] = property$${index.toString()}; }`)
        .join('      \n');
    const resolveAsyncValuesArguments = [
        constructorValuesConcatenation,
        propertiesValuesConcatenation,
    ]
        .filter((value) => value.length > 0)
        .join(', ');
    const resolveAsyncValuesBuildArguments = resolveAsyncValuesArguments;
    if (resolveActivations === undefined) {
        const buildResolveNodeBody = propertiesArgumentsCount === 0
            ? `return function resolveNode$${id}(params$${id}) {
  ${constructorValuesDeclarations}

  return resolveAsyncValues$${id}(
    ${constructorValuesConcatenation},
    function (${constructorValuesConcatenation}) {
      return new ctor$${id}(${constructorValuesConcatenation});
    },
  );
}`
            : `return function resolveNode$${id}(params$${id}) {
  ${constructorValuesDeclarations}

  ${propertyValuesDeclarations}

  return resolveAsyncValues$${id}(
    ${resolveAsyncValuesArguments},
    function (${resolveAsyncValuesBuildArguments}) {
      const instance = new ctor$${id}(${constructorValuesConcatenation});

      ${propertyAssignments}

      return instance;
    },
  );
}`;
        const buildResolveNode = new Function(`node$${id}`, `ctor$${id}`, `resolveAsyncValues$${id}`, buildResolveNodeBody);
        return buildResolveNode(node, implementationType, resolveAsyncValues);
    }
    const buildResolveNodeBody = propertiesArgumentsCount === 0
        ? `return function resolveNode$${id}(params$${id}) {
  ${constructorValuesDeclarations}

  return resolveAsyncValues$${id}(
    ${constructorValuesConcatenation},
    function (${constructorValuesConcatenation}) {
      return activate$${id}(
        params$${id},
        new ctor$${id}(${constructorValuesConcatenation}),
      );
    },
  );
}`
        : `return function resolveNode$${id}(params$${id}) {
  ${constructorValuesDeclarations}

  ${propertyValuesDeclarations}

  return resolveAsyncValues$${id}(
    ${resolveAsyncValuesArguments},
    function (${resolveAsyncValuesBuildArguments}) {
      const instance = new ctor$${id}(${constructorValuesConcatenation});

      ${propertyAssignments}

      return activate$${id}(
        params$${id},
        instance,
      );
    },
  );
}`;
    const buildResolveNode = new Function(`node$${id}`, `ctor$${id}`, `activate$${id}`, `resolveAsyncValues$${id}`, buildResolveNodeBody);
    return buildResolveNode(node, implementationType, resolveActivations, resolveAsyncValues);
}
//# sourceMappingURL=buildConstructorArgumentsResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildOneConstructorArgumentResolverJit.js


/**
 * Same rationale as buildZeroConstructorArgumentsResolveNode, but
 * for one-argument instance bindings.
 */
function buildOneConstructorArgumentResolverJit(node, implementationType, resolveActivations) {
    const id = getGeneratedResolverId().toString();
    if (resolveActivations === undefined) {
        const buildResolveNode = new Function(`node$${id}`, `ctor$${id}`, `isPromise$${id}`, `return function resolveNode$${id}(params$${id}) {
        const resolvedValue$${id} = node$${id}.constructorParams[0].resolve(params$${id});

        if (isPromise$${id}(resolvedValue$${id})) {
          return resolvedValue$${id}.then(function (resolvedValue$${id}) {
            return new ctor$${id}(resolvedValue$${id});
          });
        }

        return new ctor$${id}(resolvedValue$${id});
      };`);
        return buildResolveNode(node, implementationType, isPromise);
    }
    const buildResolveNode = new Function(`node$${id}`, `ctor$${id}`, `activate$${id}`, `isPromise$${id}`, `return function resolveNode$${id}(params$${id}) {
        const resolvedValue$${id} = node$${id}.constructorParams[0].resolve(params$${id});

        if (isPromise$${id}(resolvedValue$${id})) {
          return resolvedValue$${id}.then(function (resolvedValue$${id}) {
            return activate$${id}(params$${id}, new ctor$${id}(resolvedValue$${id}));
          });
        }

        return activate$${id}(params$${id}, new ctor$${id}(resolvedValue$${id}));
      };`);
    return buildResolveNode(node, implementationType, resolveActivations, isPromise);
}
//# sourceMappingURL=buildOneConstructorArgumentResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildOnePropertyArgumentResolverJit.js


/**
 * Same rationale as buildOneConstructorArgumentResolverJit, but
 * for zero-argument instance bindings with one property.
 */
function buildOnePropertyArgumentResolverJit(node, implementationType, resolveActivations) {
    const id = getGeneratedResolverId().toString();
    if (resolveActivations === undefined) {
        const buildResolveNode = new Function(`node$${id}`, `ctor$${id}`, `isPromise$${id}`, `return function resolveNode$${id}(params$${id}) {
        const propertyEntry$${id} = node$${id}.propertyParams.entries().next().value;
        const propertyKey$${id} = propertyEntry$${id}[0];
        const instance$${id} = new ctor$${id}();

        if (propertyEntry$${id}[1].bindings === undefined) {
          return instance$${id};
        }

        const resolvedValue$${id} = propertyEntry$${id}[1].resolve(params$${id});

        if (isPromise$${id}(resolvedValue$${id})) {
          return resolvedValue$${id}.then(function (resolvedValue$${id}) {
            instance$${id}[propertyKey$${id}] = resolvedValue$${id};
            return instance$${id};
          });
        }

        instance$${id}[propertyKey$${id}] = resolvedValue$${id};
        return instance$${id};
      };`);
        return buildResolveNode(node, implementationType, isPromise);
    }
    const buildResolveNode = new Function(`node$${id}`, `ctor$${id}`, `activate$${id}`, `isPromise$${id}`, `return function resolveNode$${id}(params$${id}) {
        const propertyEntry$${id} = node$${id}.propertyParams.entries().next().value;
        const propertyKey$${id} = propertyEntry$${id}[0];
        const instance$${id} = new ctor$${id}();

        if (propertyEntry$${id}[1].bindings === undefined) {
          return activate$${id}(params$${id}, instance$${id});
        }

        const resolvedValue$${id} = propertyEntry$${id}[1].resolve(params$${id});

        if (isPromise$${id}(resolvedValue$${id})) {
          return resolvedValue$${id}.then(function (resolvedValue$${id}) {
            instance$${id}[propertyKey$${id}] = resolvedValue$${id};
            return activate$${id}(params$${id}, instance$${id});
          });
        }

        instance$${id}[propertyKey$${id}] = resolvedValue$${id};
        return activate$${id}(params$${id}, instance$${id});
      };`);
    return buildResolveNode(node, implementationType, resolveActivations, isPromise);
}
//# sourceMappingURL=buildOnePropertyArgumentResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildResolveMany.js


function buildResolveMany(node) {
    const id = getGeneratedResolverId().toString();
    const argumentsCount = node.classMetadata.constructorArguments.length +
        node.classMetadata.properties.size;
    const argumentIndexes = Array.from({ length: argumentsCount }, (_, index) => index);
    const valueConcatenation = argumentIndexes
        .map((index) => `value$${index.toString()}`)
        .join(', ');
    const resolvedValueConcatenation = argumentIndexes
        .map((index) => `resolvedValue$${index.toString()}`)
        .join(', ');
    const parametersConcatenation = [valueConcatenation, `build$${id}`]
        .filter((value) => value.length > 0)
        .join(', ');
    const isPromiseChecks = argumentIndexes
        .map((index) => `isPromise$${id}(value$${index.toString()})`)
        .join(' || ') || 'false';
    const buildResolveManyFunction = new Function(`isPromise$${id}`, `return function resolveMany$${id}(${parametersConcatenation}) {
  if (${isPromiseChecks}) {
    return Promise.all([${valueConcatenation}]).then(
      function ([${resolvedValueConcatenation}]) {
        return build$${id}(${resolvedValueConcatenation});
      },
    );
  }

  return build$${id}(${valueConcatenation});
};`);
    return buildResolveManyFunction(isPromise);
}
//# sourceMappingURL=buildResolveMany.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildZeroConstructorArgumentsResolverJit.js

/**
 * Builds a `resolveNode` for a zero-argument instance binding by generating
 * a brand new function via the `Function` constructor for every binding.
 *
 * This is not just an inlining trick: the `Function` constructor result is
 * cached by V8 keyed on the *exact source text* passed to it. If every
 * binding generated the exact same source text (e.g. always naming the
 * constructor parameter `ctor`), V8 would transparently reuse the very same
 * compiled function (and its feedback vector) for every binding sharing
 * this code path. Since that single shared `new ctor()` call site would
 * then observe a different class on every binding, its type feedback would
 * become polymorphic/megamorphic across all of them, defeating the purpose
 * of generating specialized code and forcing V8 back to the generic,
 * non-inlined construction path.
 *
 * Suffixing every identifier with a per-binding id keeps the source text
 * (and therefore the compiled function and its feedback) unique per
 * binding, so the `new ctor()` call site stays monomorphic and V8 can
 * inline/optimize it as if it had been hand-written for that one class.
 */
function buildZeroConstructorArgumentsResolverJit(implementationType, resolveActivations) {
    const id = getGeneratedResolverId().toString();
    if (resolveActivations === undefined) {
        const buildResolveNode = 
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function(`ctor$${id}`, `return function resolveNode$${id}(params$${id}) {
        return new ctor$${id}();
      };`);
        return buildResolveNode(implementationType);
    }
    const buildResolveNode = 
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(`ctor$${id}`, `activate$${id}`, `return function resolveNode$${id}(params$${id}) {
        return activate$${id}(params$${id}, new ctor$${id}());
      };`);
    return buildResolveNode(implementationType, resolveActivations);
}
//# sourceMappingURL=buildZeroConstructorArgumentsResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildNoActivationsInstanceBindingNodeResolverJit.js










const buildNoActivationsInstanceBindingNodeResolverJit_ZERO_CONSTRUCTOR_ARGUMENTS = 0;
const buildNoActivationsInstanceBindingNodeResolverJit_ONE_CONSTRUCTOR_ARGUMENT = 1;
const buildNoActivationsInstanceBindingNodeResolverJit_TWO_CONSTRUCTOR_ARGUMENTS = 2;
const buildNoActivationsInstanceBindingNodeResolverJit_THREE_CONSTRUCTOR_ARGUMENTS = 3;
const buildNoActivationsInstanceBindingNodeResolverJit_FOUR_CONSTRUCTOR_ARGUMENTS = 4;
/**
 * Builds a resolver for instance binding nodes with
 * no post construct methods and no binding activation.
 *
 * The resolution logic is inlined in a single closure to minimize function
 * call dispatch overhead: this is the hottest resolution path. Common small
 * constructor arities are specialized to avoid constructor values array
 * allocations and spread construct calls.
 */
function buildNoActivationsInstanceBindingNodeResolverJit(node, areServiceActivations) {
    const implementationType = node.binding.implementationType;
    const serviceIdentifier = node.binding.serviceIdentifier;
    const resolveActivations = areServiceActivations
        ? resolveServiceActivations(serviceIdentifier)
        : undefined;
    let resolveNode;
    switch (node.classMetadata.constructorArguments.length +
        node.classMetadata.properties.size) {
        case buildNoActivationsInstanceBindingNodeResolverJit_ZERO_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildZeroConstructorArgumentsResolverJit(implementationType, resolveActivations);
            break;
        case buildNoActivationsInstanceBindingNodeResolverJit_ONE_CONSTRUCTOR_ARGUMENT:
            resolveNode =
                node.classMetadata.properties.size === 0
                    ? buildOneConstructorArgumentResolverJit(node, implementationType, resolveActivations)
                    : buildOnePropertyArgumentResolverJit(node, implementationType, resolveActivations);
            break;
        case buildNoActivationsInstanceBindingNodeResolverJit_TWO_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildConstructorArgumentsResolverJit(node, implementationType, resolveTwo, resolveActivations);
            break;
        case buildNoActivationsInstanceBindingNodeResolverJit_THREE_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildConstructorArgumentsResolverJit(node, implementationType, resolveThree, resolveActivations);
            break;
        case buildNoActivationsInstanceBindingNodeResolverJit_FOUR_CONSTRUCTOR_ARGUMENTS:
            resolveNode = buildConstructorArgumentsResolverJit(node, implementationType, resolveFour, resolveActivations);
            break;
        default:
            resolveNode = buildConstructorArgumentsResolverJit(node, implementationType, buildResolveMany(node), resolveActivations);
    }
    return resolveScopedWithNoActivations(node.binding, resolveNode);
}
//# sourceMappingURL=buildNoActivationsInstanceBindingNodeResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/InstanceBindingNodeImplementation.js









const InstanceBindingNodeImplementation_resolveInstanceBindingNode = resolveInstanceBindingNode(resolveInstanceBindingConstructorParams_resolveInstanceBindingConstructorParams, resolveInstanceBindingNodeAsyncFromConstructorParams_resolveInstanceBindingNodeAsyncFromConstructorParams, resolveInstanceBindingNodeFromConstructorParams_resolveInstanceBindingNodeFromConstructorParams);
const resolveScopedInstanceBindingNode = (node) => resolveScoped(node, InstanceBindingNodeImplementation_resolveInstanceBindingNode);
class InstanceBindingNodeImplementation {
    binding;
    classMetadata;
    [isDynamicallyResolvableBindingNodeSymbol];
    constructorParams;
    propertyParams;
    resolve;
    #jitEnabled;
    #onResolverChangedHandlers;
    constructor(binding, classMetadata, params) {
        this.binding = binding;
        this.classMetadata = classMetadata;
        this[isDynamicallyResolvableBindingNodeSymbol] = true;
        this.constructorParams = [];
        this.propertyParams = new Map();
        this.#jitEnabled = params.jitEnabled;
        const areServiceActivations = params.operations.getActivations(binding.serviceIdentifier) !== undefined;
        this.#onResolverChangedHandlers = undefined;
        this.resolve = this.#buildInstanceBindingNodeResolver(areServiceActivations);
        if (!areServiceActivations &&
            this.#areNoBindingActivationsNorPostConstructsDefined()) {
            params.operations.subscribeActivationAddedOnce(binding.serviceIdentifier, this);
        }
    }
    onActivationAdded() {
        this.resolve = this.#buildInstanceBindingNodeResolver(true);
        if (this.#onResolverChangedHandlers !== undefined) {
            for (const handler of this.#onResolverChangedHandlers) {
                handler(this.resolve);
            }
        }
    }
    addOnResolverChangedHandler(callback) {
        if (this.#onResolverChangedHandlers === undefined) {
            this.#onResolverChangedHandlers = [];
        }
        this.#onResolverChangedHandlers.push(callback);
    }
    #buildInstanceBindingNodeResolver(areServiceActivations) {
        if (this.#areNoBindingActivationsNorPostConstructsDefined()) {
            if (this.#jitEnabled &&
                this.binding.scope !== bindingScopeValues.Singleton) {
                return buildNoActivationsInstanceBindingNodeResolverJit(this, areServiceActivations);
            }
            else {
                return buildNoActivationsInstanceBindingNodeResolver(this, areServiceActivations);
            }
        }
        return resolveScopedInstanceBindingNode(this);
    }
    #areNoBindingActivationsNorPostConstructsDefined() {
        return (this.classMetadata.lifecycle.postConstructMethodNames.size === 0 &&
            this.binding.onActivation === undefined);
    }
}
//# sourceMappingURL=InstanceBindingNodeImplementation.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/PlanServiceRedirectionBindingNodeImplementation.js


class PlanServiceRedirectionBindingNodeImplementation {
    binding;
    #redirection;
    #resolve;
    constructor(binding) {
        this.binding = binding;
        this.#redirection = undefined;
        this.#resolve = undefined;
    }
    get redirection() {
        return this.#redirection;
    }
    set redirection(value) {
        this.#redirection = value;
        if (value.bindings === undefined) {
            this.#resolve = () => undefined;
        }
        else {
            if (Array.isArray(value.bindings)) {
                this.#resolve = () => {
                    throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planning, 'Unexpected resolver call for multiple bindings redirection');
                };
            }
            else {
                this.#resolve = (params) => 
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                value.bindings.resolve(params);
            }
        }
    }
    resolve(params) {
        return this.#resolve(params);
    }
}
//# sourceMappingURL=PlanServiceRedirectionBindingNodeImplementation.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveResolvedValueBindingParams.js

function resolveResolvedValueBindingParams(params, node) {
    const paramsResolvedValues = [];
    let promiseValueFound = false;
    for (const param of node.params) {
        const resolvedValue = param.resolve(params);
        if (!promiseValueFound && isPromise(resolvedValue)) {
            promiseValueFound = true;
        }
        paramsResolvedValues.push(resolvedValue);
    }
    return promiseValueFound
        ? Promise.all(paramsResolvedValues)
        : paramsResolvedValues;
}
//# sourceMappingURL=resolveResolvedValueBindingParams.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveResolvedValueBindingNode.js


function resolveResolvedValueBindingNode(params, node) {
    const paramValues = 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolveResolvedValueBindingParams(params, node);
    if (isPromise(paramValues)) {
        return paramValues.then((resolvedParamValues) => node.binding.factory(...resolvedParamValues));
    }
    return node.binding.factory(...paramValues);
}
//# sourceMappingURL=resolveResolvedValueBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildFourResolvedValueArgumentResolver.js

/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * four-argument resolved value bindings. Equivalent to
 * `buildResolvedValueArgumentsResolverJit` with `resolveFour`, but implemented
 * with a plain closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 */
function buildFourResolvedValueArgumentResolver(node, resolveActivations) {
    if (resolveActivations === undefined) {
        return function resolveNode(params) {
            const resolvedValue0 = node.params[0].resolve(params);
            const resolvedValue1 = node.params[1].resolve(params);
            const resolvedValue2 = node.params[2].resolve(params);
            const resolvedValue3 = node.params[3].resolve(params);
            return resolveFour(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3, (resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3) => node.binding.factory(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3));
        };
    }
    return function resolveNode(params) {
        const resolvedValue0 = node.params[0].resolve(params);
        const resolvedValue1 = node.params[1].resolve(params);
        const resolvedValue2 = node.params[2].resolve(params);
        const resolvedValue3 = node.params[3].resolve(params);
        return resolveFour(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3, (resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3) => resolveActivations(params, node.binding.factory(resolvedValue0, resolvedValue1, resolvedValue2, resolvedValue3)));
    };
}
//# sourceMappingURL=buildFourResolvedValueArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildOneResolvedValueArgumentResolver.js

/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * one-argument resolved value bindings. Equivalent to
 * `buildOneResolvedValueArgumentResolverJit`, but implemented with a plain
 * closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 */
function buildOneResolvedValueArgumentResolver(node, resolveActivations) {
    if (resolveActivations === undefined) {
        return function resolveNode(params) {
            const resolvedValue = node.params[0].resolve(params);
            if (isPromise(resolvedValue)) {
                return resolvedValue.then((resolvedValue) => node.binding.factory(resolvedValue));
            }
            return node.binding.factory(resolvedValue);
        };
    }
    return function resolveNode(params) {
        const resolvedValue = node.params[0].resolve(params);
        if (isPromise(resolvedValue)) {
            return resolvedValue.then((resolvedValue) => resolveActivations(params, node.binding.factory(resolvedValue)));
        }
        return resolveActivations(params, node.binding.factory(resolvedValue));
    };
}
//# sourceMappingURL=buildOneResolvedValueArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildThreeResolvedValueArgumentResolver.js

/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * three-argument resolved value bindings. Equivalent to
 * `buildResolvedValueArgumentsResolverJit` with `resolveThree`, but implemented
 * with a plain closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 */
function buildThreeResolvedValueArgumentResolver(node, resolveActivations) {
    if (resolveActivations === undefined) {
        return function resolveNode(params) {
            const resolvedValue0 = node.params[0].resolve(params);
            const resolvedValue1 = node.params[1].resolve(params);
            const resolvedValue2 = node.params[2].resolve(params);
            return resolveThree(resolvedValue0, resolvedValue1, resolvedValue2, (resolvedValue0, resolvedValue1, resolvedValue2) => node.binding.factory(resolvedValue0, resolvedValue1, resolvedValue2));
        };
    }
    return function resolveNode(params) {
        const resolvedValue0 = node.params[0].resolve(params);
        const resolvedValue1 = node.params[1].resolve(params);
        const resolvedValue2 = node.params[2].resolve(params);
        return resolveThree(resolvedValue0, resolvedValue1, resolvedValue2, (resolvedValue0, resolvedValue1, resolvedValue2) => resolveActivations(params, node.binding.factory(resolvedValue0, resolvedValue1, resolvedValue2)));
    };
}
//# sourceMappingURL=buildThreeResolvedValueArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildTwoResolvedValueArgumentResolver.js

/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * two-argument resolved value bindings. Equivalent to
 * `buildResolvedValueArgumentsResolverJit` with `resolveTwo`, but implemented
 * with a plain closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 */
function buildTwoResolvedValueArgumentResolver(node, resolveActivations) {
    if (resolveActivations === undefined) {
        return function resolveNode(params) {
            const resolvedValue0 = node.params[0].resolve(params);
            const resolvedValue1 = node.params[1].resolve(params);
            return resolveTwo(resolvedValue0, resolvedValue1, (resolvedValue0, resolvedValue1) => node.binding.factory(resolvedValue0, resolvedValue1));
        };
    }
    return function resolveNode(params) {
        const resolvedValue0 = node.params[0].resolve(params);
        const resolvedValue1 = node.params[1].resolve(params);
        return resolveTwo(resolvedValue0, resolvedValue1, (resolvedValue0, resolvedValue1) => resolveActivations(params, node.binding.factory(resolvedValue0, resolvedValue1)));
    };
}
//# sourceMappingURL=buildTwoResolvedValueArgumentResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildZeroResolvedValueArgumentsResolver.js
/**
 * Same rationale as buildZeroConstructorArgumentsResolver, but for
 * zero-argument resolved value bindings. Equivalent to
 * `buildZeroResolvedValueArgumentsResolverJit`, but implemented with a plain
 * closure instead of the `Function` constructor, so it works in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 */
function buildZeroResolvedValueArgumentsResolver(node, resolveActivations) {
    if (resolveActivations === undefined) {
        return function resolveNode(_params) {
            return node.binding.factory();
        };
    }
    return function resolveNode(params) {
        return resolveActivations(params, node.binding.factory());
    };
}
//# sourceMappingURL=buildZeroResolvedValueArgumentsResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildNoActivationsResolvedValueBindingNodeResolver.js








const ZERO_PARAMS = 0;
const ONE_PARAM = 1;
const buildNoActivationsResolvedValueBindingNodeResolver_TWO_PARAMS = 2;
const buildNoActivationsResolvedValueBindingNodeResolver_THREE_PARAMS = 3;
const buildNoActivationsResolvedValueBindingNodeResolver_FOUR_PARAMS = 4;
/**
 * Builds a resolver for resolved value binding nodes with no binding
 * activation.
 *
 * Unlike the JIT path, specialized CSP resolvers are implemented with plain
 * closures instead of the `Function` constructor, so they work in
 * environments enforcing a strict Content Security Policy (no
 * `unsafe-eval`).
 */
function buildNoActivationsResolvedValueBindingNodeResolver(node, areServiceActivations) {
    const serviceIdentifier = node.binding.serviceIdentifier;
    const resolveActivations = areServiceActivations
        ? resolveServiceActivations(serviceIdentifier)
        : undefined;
    let resolveNode;
    switch (node.binding.metadata.arguments.length) {
        case ZERO_PARAMS:
            resolveNode = buildZeroResolvedValueArgumentsResolver(node, resolveActivations);
            break;
        case ONE_PARAM:
            resolveNode = buildOneResolvedValueArgumentResolver(node, resolveActivations);
            break;
        case buildNoActivationsResolvedValueBindingNodeResolver_TWO_PARAMS:
            resolveNode = buildTwoResolvedValueArgumentResolver(node, resolveActivations);
            break;
        case buildNoActivationsResolvedValueBindingNodeResolver_THREE_PARAMS:
            resolveNode = buildThreeResolvedValueArgumentResolver(node, resolveActivations);
            break;
        case buildNoActivationsResolvedValueBindingNodeResolver_FOUR_PARAMS:
            resolveNode = buildFourResolvedValueArgumentResolver(node, resolveActivations);
            break;
        default:
            resolveNode =
                resolveActivations === undefined
                    ? (params) => resolveResolvedValueBindingNode(params, node)
                    : (params) => resolveActivations(params, resolveResolvedValueBindingNode(params, node));
    }
    return resolveScopedWithNoActivations(node.binding, resolveNode);
}
//# sourceMappingURL=buildNoActivationsResolvedValueBindingNodeResolver.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildOneResolvedValueArgumentResolverJit.js


function buildOneResolvedValueArgumentResolverJit(node, resolveActivations) {
    const id = getGeneratedResolverId().toString();
    if (resolveActivations === undefined) {
        const buildResolveNode = new Function(`node$${id}`, `isPromise$${id}`, `return function resolveNode$${id}(params$${id}) {
      const resolvedValue$${id} = node$${id}.params[0].resolve(params$${id});

      if (isPromise$${id}(resolvedValue$${id})) {
        return resolvedValue$${id}.then(function (resolvedValue$${id}) {
          return node$${id}.binding.factory(resolvedValue$${id});
        });
      }

      return node$${id}.binding.factory(resolvedValue$${id});
    };`);
        return buildResolveNode(node, isPromise);
    }
    const buildResolveNode = new Function(`node$${id}`, `activate$${id}`, `isPromise$${id}`, `return function resolveNode$${id}(params$${id}) {
      const resolvedValue$${id} = node$${id}.params[0].resolve(params$${id});

      if (isPromise$${id}(resolvedValue$${id})) {
        return resolvedValue$${id}.then(function (resolvedValue$${id}) {
          return activate$${id}(params$${id}, node$${id}.binding.factory(resolvedValue$${id}));
        });
      }

      return activate$${id}(params$${id}, node$${id}.binding.factory(resolvedValue$${id}));
    };`);
    return buildResolveNode(node, resolveActivations, isPromise);
}
//# sourceMappingURL=buildOneResolvedValueArgumentResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildResolvedValueArgumentsResolverJit.js

function buildResolvedValueArgumentsResolverJit(node, 
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
resolveAsyncValues, resolveActivations) {
    const id = getGeneratedResolverId().toString();
    const argumentIndexes = Array.from({ length: node.binding.metadata.arguments.length }, (_, index) => index);
    const resolvedValueConcatenation = argumentIndexes
        .map((index) => `value$${index.toString()}`)
        .join(', ');
    let resolvedValueDeclarations = '';
    for (const index of argumentIndexes) {
        resolvedValueDeclarations += `const value$${index.toString()} = node$${id}.params[${index.toString()}].resolve(params$${id});\n`;
    }
    if (resolveActivations === undefined) {
        const buildResolveNode = new Function(`node$${id}`, `resolveAsyncValues$${id}`, `return function resolveNode$${id}(params$${id}) {
  ${resolvedValueDeclarations}

  return resolveAsyncValues$${id}(
    ${resolvedValueConcatenation},
    function (${resolvedValueConcatenation}) {
      return node$${id}.binding.factory(${resolvedValueConcatenation});
    },
  );
}`);
        return buildResolveNode(node, resolveAsyncValues);
    }
    const buildResolveNode = new Function(`node$${id}`, `activate$${id}`, `resolveAsyncValues$${id}`, `return function resolveNode$${id}(params$${id}) {
  ${resolvedValueDeclarations}

  return resolveAsyncValues$${id}(
    ${resolvedValueConcatenation},
    function (${resolvedValueConcatenation}) {
      return activate$${id}(
        params$${id},
        node$${id}.binding.factory(${resolvedValueConcatenation}),
      );
    },
  );
}`);
    return buildResolveNode(node, resolveActivations, resolveAsyncValues);
}
//# sourceMappingURL=buildResolvedValueArgumentsResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildZeroResolvedValueArgumentsResolverJit.js

function buildZeroResolvedValueArgumentsResolverJit(node, resolveActivations) {
    const id = getGeneratedResolverId().toString();
    if (resolveActivations === undefined) {
        const buildResolveNode = new Function(`node$${id}`, `return function resolveNode$${id}(params$${id}) {
      return node$${id}.binding.factory();
    };`);
        return buildResolveNode(node);
    }
    const buildResolveNode = new Function(`node$${id}`, `activate$${id}`, `return function resolveNode$${id}(params$${id}) {
      return activate$${id}(params$${id}, node$${id}.binding.factory());
    };`);
    return buildResolveNode(node, resolveActivations);
}
//# sourceMappingURL=buildZeroResolvedValueArgumentsResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildNoActivationsResolvedValueBindingNodeResolverJit.js









const buildNoActivationsResolvedValueBindingNodeResolverJit_ZERO_PARAMS = 0;
const buildNoActivationsResolvedValueBindingNodeResolverJit_ONE_PARAM = 1;
const buildNoActivationsResolvedValueBindingNodeResolverJit_TWO_PARAMS = 2;
const buildNoActivationsResolvedValueBindingNodeResolverJit_THREE_PARAMS = 3;
const buildNoActivationsResolvedValueBindingNodeResolverJit_FOUR_PARAMS = 4;
/**
 * Builds a resolver for resolved value binding nodes with no binding
 * activation.
 *
 * The resolution logic is specialized by argument arity to minimize function
 * call dispatch overhead on the hottest resolution path.
 */
function buildNoActivationsResolvedValueBindingNodeResolverJit(node, areServiceActivations) {
    const serviceIdentifier = node.binding.serviceIdentifier;
    const resolveActivations = areServiceActivations
        ? resolveServiceActivations(serviceIdentifier)
        : undefined;
    let resolveNode;
    switch (node.binding.metadata.arguments.length) {
        case buildNoActivationsResolvedValueBindingNodeResolverJit_ZERO_PARAMS:
            resolveNode = buildZeroResolvedValueArgumentsResolverJit(node, resolveActivations);
            break;
        case buildNoActivationsResolvedValueBindingNodeResolverJit_ONE_PARAM:
            resolveNode = buildOneResolvedValueArgumentResolverJit(node, resolveActivations);
            break;
        case buildNoActivationsResolvedValueBindingNodeResolverJit_TWO_PARAMS:
            resolveNode = buildResolvedValueArgumentsResolverJit(node, resolveTwo, resolveActivations);
            break;
        case buildNoActivationsResolvedValueBindingNodeResolverJit_THREE_PARAMS:
            resolveNode = buildResolvedValueArgumentsResolverJit(node, resolveThree, resolveActivations);
            break;
        case buildNoActivationsResolvedValueBindingNodeResolverJit_FOUR_PARAMS:
            resolveNode = buildResolvedValueArgumentsResolverJit(node, resolveFour, resolveActivations);
            break;
        default:
            resolveNode = buildResolvedValueArgumentsResolverJit(node, resolveMany, resolveActivations);
    }
    return resolveScopedWithNoActivations(node.binding, resolveNode);
}
//# sourceMappingURL=buildNoActivationsResolvedValueBindingNodeResolverJit.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/ResolvedValueBindingNodeImplementation.js






const resolveScopedResolvedValueBindingNode = (node) => resolveScoped(node, resolveResolvedValueBindingNode);
class ResolvedValueBindingNodeImplementation {
    binding;
    [isDynamicallyResolvableBindingNodeSymbol];
    params;
    resolve;
    #jitEnabled;
    #onResolverChangedHandlers;
    constructor(binding, params) {
        this.binding = binding;
        this[isDynamicallyResolvableBindingNodeSymbol] = true;
        this.params = [];
        this.#jitEnabled = params.jitEnabled;
        const areServiceActivations = params.operations.getActivations(binding.serviceIdentifier) !== undefined;
        this.#onResolverChangedHandlers = undefined;
        this.resolve = this.#buildResolvedValueBindingNodeResolver(areServiceActivations);
        if (!areServiceActivations && this.#areNoBindingActivationsDefined()) {
            params.operations.subscribeActivationAddedOnce(binding.serviceIdentifier, this);
        }
    }
    onActivationAdded() {
        this.resolve = this.#buildResolvedValueBindingNodeResolver(true);
        if (this.#onResolverChangedHandlers !== undefined) {
            for (const handler of this.#onResolverChangedHandlers) {
                handler(this.resolve);
            }
        }
    }
    addOnResolverChangedHandler(callback) {
        if (this.#onResolverChangedHandlers === undefined) {
            this.#onResolverChangedHandlers = [];
        }
        this.#onResolverChangedHandlers.push(callback);
    }
    #buildResolvedValueBindingNodeResolver(areServiceActivations) {
        if (this.#areNoBindingActivationsDefined()) {
            if (this.#jitEnabled &&
                this.binding.scope !== bindingScopeValues.Singleton) {
                return buildNoActivationsResolvedValueBindingNodeResolverJit(this, areServiceActivations);
            }
            else {
                return buildNoActivationsResolvedValueBindingNodeResolver(this, areServiceActivations);
            }
        }
        return resolveScopedResolvedValueBindingNode(this);
    }
    #areNoBindingActivationsDefined() {
        return this.binding.onActivation === undefined;
    }
}
//# sourceMappingURL=ResolvedValueBindingNodeImplementation.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/curryBuildServiceNodeBindings.js








function curryBuildServiceNodeBindings(subplan) {
    const buildInstancePlanBindingNode = curryBuildInstancePlanBindingNode(subplan);
    const buildResolvedValuePlanBindingNode = curryBuildResolvedValuePlanBindingNode(subplan);
    const buildServiceNodeBindings = (params, bindingConstraintsList, serviceBindings, parentNode, buildServiceNodeOptions) => {
        const serviceIdentifier = isPlanServiceRedirectionBindingNode(parentNode)
            ? parentNode.binding.targetServiceIdentifier
            : parentNode.serviceIdentifier;
        params.servicesBranch.push(serviceIdentifier);
        const planBindingNodes = [];
        for (const binding of serviceBindings) {
            if (binding.type === bindingTypeValues.Factory) {
                planBindingNodes.push(new FactoryBindingNodeImplementation(binding));
                continue;
            }
            switch (binding.type) {
                case bindingTypeValues.ConstantValue: {
                    planBindingNodes.push(new ConstantValueBindingNode(binding));
                    break;
                }
                case bindingTypeValues.DynamicValue: {
                    planBindingNodes.push(new DynamicValueBindingNode(binding, params));
                    break;
                }
                case bindingTypeValues.Instance: {
                    planBindingNodes.push(buildInstancePlanBindingNode(params, binding, bindingConstraintsList));
                    break;
                }
                case bindingTypeValues.ResolvedValue: {
                    planBindingNodes.push(buildResolvedValuePlanBindingNode(params, binding, bindingConstraintsList));
                    break;
                }
                case bindingTypeValues.ServiceRedirection: {
                    const planBindingNode = buildServiceRedirectionPlanBindingNode(params, bindingConstraintsList, binding, buildServiceNodeOptions);
                    planBindingNodes.push(planBindingNode);
                    break;
                }
            }
        }
        params.servicesBranch.pop();
        return planBindingNodes;
    };
    const buildServiceRedirectionPlanBindingNode = curryBuildServiceRedirectionPlanBindingNode(subplan);
    return buildServiceNodeBindings;
}
function curryBuildInstancePlanBindingNode(subplan) {
    return (params, binding, bindingConstraintsList) => {
        const classMetadata = params.operations.getClassMetadata(binding.implementationType);
        const childNode = new InstanceBindingNodeImplementation(binding, classMetadata, params);
        const subplanParams = {
            autobindOptions: params.autobindOptions,
            jitEnabled: params.jitEnabled,
            node: childNode,
            operations: params.operations,
            servicesBranch: params.servicesBranch,
        };
        return subplan(subplanParams, bindingConstraintsList);
    };
}
function curryBuildResolvedValuePlanBindingNode(subplan) {
    return (params, binding, bindingConstraintsList) => {
        const childNode = new ResolvedValueBindingNodeImplementation(binding, params);
        const subplanParams = {
            autobindOptions: params.autobindOptions,
            jitEnabled: params.jitEnabled,
            node: childNode,
            operations: params.operations,
            servicesBranch: params.servicesBranch,
        };
        return subplan(subplanParams, bindingConstraintsList);
    };
}
function curryBuildServiceRedirectionPlanBindingNode(subplan) {
    return (params, bindingConstraintsList, binding, buildServiceNodeOptions) => {
        const childNode = new PlanServiceRedirectionBindingNodeImplementation(binding);
        const subplanParams = {
            autobindOptions: params.autobindOptions,
            buildServiceNodeOptions: {
                ...buildServiceNodeOptions,
                serviceIdentifier: binding.targetServiceIdentifier,
            },
            jitEnabled: params.jitEnabled,
            node: childNode,
            operations: params.operations,
            servicesBranch: params.servicesBranch,
        };
        return subplan(subplanParams, bindingConstraintsList);
    };
}
//# sourceMappingURL=curryBuildServiceNodeBindings.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/common/calculations/buildBuildServiceNodeOptionsFromClassElementMetadata.js


function buildBuildServiceNodeOptionsFromClassElementMetadata(elementMetadata) {
    const serviceIdentifier = LazyServiceIdentifier.is(elementMetadata.value)
        ? elementMetadata.value.unwrap()
        : elementMetadata.value;
    if (elementMetadata.kind === ClassElementMetadataKind_ClassElementMetadataKind.multipleInjection) {
        return {
            chained: elementMetadata.chained,
            isMultiple: true,
            name: elementMetadata.name,
            optional: elementMetadata.optional,
            serviceIdentifier,
            tags: elementMetadata.tags,
        };
    }
    return {
        isMultiple: false,
        name: elementMetadata.name,
        optional: elementMetadata.optional,
        serviceIdentifier,
        tags: elementMetadata.tags,
    };
}
//# sourceMappingURL=buildBuildServiceNodeOptionsFromClassElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/common/calculations/buildBuildServiceNodeOptionsFromResolvedValueElementMetadata.js


function buildBuildServiceNodeOptionsFromResolvedValueElementMetadata(elementMetadata) {
    const serviceIdentifier = LazyServiceIdentifier.is(elementMetadata.value)
        ? elementMetadata.value.unwrap()
        : elementMetadata.value;
    if (elementMetadata.kind === ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind.multipleInjection) {
        return {
            chained: elementMetadata.chained,
            isMultiple: true,
            name: elementMetadata.name,
            optional: elementMetadata.optional,
            serviceIdentifier,
            tags: elementMetadata.tags,
        };
    }
    return {
        isMultiple: false,
        name: elementMetadata.name,
        optional: elementMetadata.optional,
        serviceIdentifier,
        tags: elementMetadata.tags,
    };
}
//# sourceMappingURL=buildBuildServiceNodeOptionsFromResolvedValueElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/buildConstructorNoParamNode.js
const CONSTRUCTOR_NO_PARAM_NODE = {
    isNoParam: true,
    resolve: () => undefined,
};
function buildConstructorNoParamNode() {
    return CONSTRUCTOR_NO_PARAM_NODE;
}
//# sourceMappingURL=buildConstructorNoParamNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/isInstanceBindingNode.js

function isInstanceBindingNode(node) {
    return node.binding.type === bindingTypeValues.Instance;
}
//# sourceMappingURL=isInstanceBindingNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/tryBuildGetPlanOptionsFromBuildServiceNodeOptions.js

function tryBuildGetPlanOptionsFromBuildServiceNodeOptions(options) {
    let tag;
    if (options.tags.size === 0) {
        tag = undefined;
    }
    else if (options.tags.size === 1) {
        const [key, value] = options.tags.entries().next()
            .value;
        tag = { key, value };
    }
    else {
        return undefined;
    }
    const serviceIdentifier = LazyServiceIdentifier.is(options.serviceIdentifier)
        ? options.serviceIdentifier.unwrap()
        : options.serviceIdentifier;
    if (options.isMultiple) {
        return {
            chained: options.chained,
            isMultiple: true,
            name: options.name,
            optional: options.optional,
            serviceIdentifier,
            tag,
        };
    }
    else {
        return {
            isMultiple: false,
            name: options.name,
            optional: options.optional,
            serviceIdentifier,
            tag,
        };
    }
}
//# sourceMappingURL=tryBuildGetPlanOptionsFromBuildServiceNodeOptions.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/tryBuildGetPlanOptionsFromManagedClassElementMetadata.js


function tryBuildGetPlanOptionsFromManagedClassElementMetadata(elementMetadata) {
    let tag;
    if (elementMetadata.tags.size === 0) {
        tag = undefined;
    }
    else if (elementMetadata.tags.size === 1) {
        const [key, value] = elementMetadata.tags
            .entries()
            .next().value;
        tag = { key, value };
    }
    else {
        return undefined;
    }
    const serviceIdentifier = LazyServiceIdentifier.is(elementMetadata.value)
        ? elementMetadata.value.unwrap()
        : elementMetadata.value;
    if (elementMetadata.kind === ClassElementMetadataKind_ClassElementMetadataKind.multipleInjection) {
        return {
            chained: elementMetadata.chained,
            isMultiple: true,
            name: elementMetadata.name,
            optional: elementMetadata.optional,
            serviceIdentifier,
            tag,
        };
    }
    else {
        return {
            isMultiple: false,
            name: elementMetadata.name,
            optional: elementMetadata.optional,
            serviceIdentifier,
            tag,
        };
    }
}
//# sourceMappingURL=tryBuildGetPlanOptionsFromManagedClassElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/tryBuildGetPlanOptionsFromResolvedValueElementMetadata.js


function tryBuildGetPlanOptionsFromResolvedValueElementMetadata(resolvedValueElementMetadata) {
    let tag;
    if (resolvedValueElementMetadata.tags.size === 0) {
        tag = undefined;
    }
    else if (resolvedValueElementMetadata.tags.size === 1) {
        const [key, value] = resolvedValueElementMetadata.tags.entries().next().value;
        tag = { key, value };
    }
    else {
        return undefined;
    }
    const serviceIdentifier = LazyServiceIdentifier.is(resolvedValueElementMetadata.value)
        ? resolvedValueElementMetadata.value.unwrap()
        : resolvedValueElementMetadata.value;
    if (resolvedValueElementMetadata.kind ===
        ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind.multipleInjection) {
        return {
            chained: resolvedValueElementMetadata.chained,
            isMultiple: true,
            name: resolvedValueElementMetadata.name,
            optional: resolvedValueElementMetadata.optional,
            serviceIdentifier,
            tag,
        };
    }
    else {
        return {
            isMultiple: false,
            name: resolvedValueElementMetadata.name,
            optional: resolvedValueElementMetadata.optional,
            serviceIdentifier,
            tag,
        };
    }
}
//# sourceMappingURL=tryBuildGetPlanOptionsFromResolvedValueElementMetadata.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/cacheNonRootPlanServiceNode.js

function cacheNonRootPlanServiceNode(getPlanOptions, operations, planServiceNode, context) {
    if (getPlanOptions !== undefined &&
        ((LazyPlanServiceNode.is(planServiceNode) &&
            !planServiceNode.isExpanded()) ||
            planServiceNode.isContextFree)) {
        const planResult = {
            tree: {
                root: planServiceNode,
            },
        };
        operations.setPlan(getPlanOptions, planResult);
    }
    else {
        operations.setNonCachedServiceNode(planServiceNode, context);
    }
}
//# sourceMappingURL=cacheNonRootPlanServiceNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/currySubplan.js













const MAX_PLAN_DEPTH = 500;
class LazySubPlanServiceNode extends LazyPlanServiceNode {
    #params;
    #buildLazyPlanServiceNodeFromOptions;
    #bindingConstraintsList;
    #options;
    constructor(params, buildLazyPlanServiceNodeFromOptions, bindingConstraintsList, options, serviceNode) {
        super(serviceNode, options.serviceIdentifier);
        this.#buildLazyPlanServiceNodeFromOptions =
            buildLazyPlanServiceNodeFromOptions;
        this.#params = params;
        this.#bindingConstraintsList = bindingConstraintsList;
        this.#options = options;
    }
    _buildPlanServiceNode() {
        return this.#buildLazyPlanServiceNodeFromOptions(this.#params, this.#bindingConstraintsList, this.#options);
    }
}
function currySubplan(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions) {
    const subplanInstanceBindingNode = currySubplanInstanceBindingNode(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions);
    const subplanRedirectionBindingNode = currySubplanRedirectionBindingNode(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions);
    const subplanResolvedValueBindingNode = currySubplanResolvedValueBindingNode(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions);
    return (params, bindingConstraintsList) => {
        if (isInstanceBindingNode(params.node)) {
            return subplanInstanceBindingNode(params, params.node, bindingConstraintsList);
        }
        else {
            if (isPlanServiceRedirectionBindingNode(params.node)) {
                return subplanRedirectionBindingNode(params, params.node, bindingConstraintsList);
            }
            else {
                return subplanResolvedValueBindingNode(params, params.node, bindingConstraintsList);
            }
        }
    };
}
function currySubplanInstanceBindingNode(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions) {
    const handlePlanServiceNodeBuildFromClassElementMetadata = curryHandlePlanServiceNodeBuildFromClassElementMetadata(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions);
    return (params, node, bindingConstraintsList) => {
        const classMetadata = node.classMetadata;
        for (const [index, elementMetadata,] of classMetadata.constructorArguments.entries()) {
            node.constructorParams[index] =
                handlePlanServiceNodeBuildFromClassElementMetadata(params, bindingConstraintsList, elementMetadata) ?? buildConstructorNoParamNode();
        }
        for (const [propertyKey, elementMetadata] of classMetadata.properties) {
            const planServiceNode = handlePlanServiceNodeBuildFromClassElementMetadata(params, bindingConstraintsList, elementMetadata);
            if (planServiceNode !== undefined) {
                node.propertyParams.set(propertyKey, planServiceNode);
            }
        }
        return params.node;
    };
}
function currySubplanRedirectionBindingNode(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions) {
    const handlePlanServiceNodeBuildFromRedirectionSubplanParams = curryHandlePlanServiceNodeBuildFromRedirectionSubplanParams(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions);
    return (params, node, bindingConstraintsList) => {
        const redirectionSubplanParams = {
            autobindOptions: params.autobindOptions,
            buildServiceNodeOptions: params.buildServiceNodeOptions,
            jitEnabled: params.jitEnabled,
            node,
            operations: params.operations,
            servicesBranch: params.servicesBranch,
        };
        node.redirection = handlePlanServiceNodeBuildFromRedirectionSubplanParams(redirectionSubplanParams, bindingConstraintsList);
        return node;
    };
}
function currySubplanResolvedValueBindingNode(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions) {
    const handlePlanServiceNodeBuildFromResolvedValueElementMetadata = curryHandlePlanServiceNodeBuildFromResolvedValueElementMetadata(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions);
    return (params, node, bindingConstraintsList) => {
        const resolvedValueMetadata = node.binding.metadata;
        for (const [index, elementMetadata,] of resolvedValueMetadata.arguments.entries()) {
            node.params[index] =
                handlePlanServiceNodeBuildFromResolvedValueElementMetadata(params, bindingConstraintsList, elementMetadata);
        }
        return params.node;
    };
}
function curryHandlePlanServiceNodeBuildFromClassElementMetadata(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions) {
    return (params, bindingConstraintsList, elementMetadata) => {
        if (elementMetadata.kind === ClassElementMetadataKind_ClassElementMetadataKind.unmanaged) {
            return undefined;
        }
        if (bindingConstraintsList.length > MAX_PLAN_DEPTH) {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planningMaxDepthExceeded, 'Maximum plan depth exceeded. This is likely caused by a circular dependency.');
        }
        const getPlanOptions = tryBuildGetPlanOptionsFromManagedClassElementMetadata(elementMetadata);
        if (getPlanOptions !== undefined) {
            const planResult = params.operations.getPlan(getPlanOptions);
            if (planResult !== undefined && planResult.tree.root.isContextFree) {
                return planResult.tree.root;
            }
        }
        const options = buildBuildServiceNodeOptionsFromClassElementMetadata(elementMetadata);
        const serviceNode = buildPlanServiceNodeFromOptions(params, bindingConstraintsList, options);
        const lazyPlanServiceNode = new LazySubPlanServiceNode(params, buildLazyPlanServiceNodeFromOptions, bindingConstraintsList, options, serviceNode);
        cacheNonRootPlanServiceNode(getPlanOptions, params.operations, lazyPlanServiceNode, {
            bindingConstraintsList,
            buildServiceNodeOptions: options,
        });
        return lazyPlanServiceNode;
    };
}
function curryHandlePlanServiceNodeBuildFromRedirectionSubplanParams(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions) {
    return (params, bindingConstraintsList) => {
        const getPlanOptions = tryBuildGetPlanOptionsFromBuildServiceNodeOptions(params.buildServiceNodeOptions);
        if (getPlanOptions !== undefined) {
            const planResult = params.operations.getPlan(getPlanOptions);
            if (planResult !== undefined && planResult.tree.root.isContextFree) {
                return planResult.tree.root;
            }
        }
        const options = params.buildServiceNodeOptions;
        const serviceNode = buildPlanServiceNodeFromOptions(params, bindingConstraintsList, options);
        const lazyPlanServiceNode = new LazySubPlanServiceNode(params, buildLazyPlanServiceNodeFromOptions, bindingConstraintsList, options, serviceNode);
        cacheNonRootPlanServiceNode(getPlanOptions, params.operations, lazyPlanServiceNode, {
            bindingConstraintsList,
            buildServiceNodeOptions: options,
        });
        return lazyPlanServiceNode;
    };
}
function curryHandlePlanServiceNodeBuildFromResolvedValueElementMetadata(buildLazyPlanServiceNodeFromOptions, buildPlanServiceNodeFromOptions) {
    return (params, bindingConstraintsList, elementMetadata) => {
        if (bindingConstraintsList.length > MAX_PLAN_DEPTH) {
            throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planningMaxDepthExceeded, 'Maximum plan depth exceeded. This is likely caused by a circular dependency.');
        }
        const getPlanOptions = tryBuildGetPlanOptionsFromResolvedValueElementMetadata(elementMetadata);
        if (getPlanOptions !== undefined) {
            const planResult = params.operations.getPlan(getPlanOptions);
            if (planResult !== undefined && planResult.tree.root.isContextFree) {
                return planResult.tree.root;
            }
        }
        const options = buildBuildServiceNodeOptionsFromResolvedValueElementMetadata(elementMetadata);
        const serviceNode = buildPlanServiceNodeFromOptions(params, bindingConstraintsList, options);
        const lazyPlanServiceNode = new LazySubPlanServiceNode(params, buildLazyPlanServiceNodeFromOptions, bindingConstraintsList, options, serviceNode);
        cacheNonRootPlanServiceNode(getPlanOptions, params.operations, lazyPlanServiceNode, {
            bindingConstraintsList,
            buildServiceNodeOptions: options,
        });
        return lazyPlanServiceNode;
    };
}
//# sourceMappingURL=currySubplan.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/plan.js







class LazyRootPlanServiceNode extends LazyPlanServiceNode {
    #params;
    constructor(params, serviceNode) {
        super(serviceNode, serviceNode.serviceIdentifier);
        this.#params = params;
    }
    _buildPlanServiceNode() {
        return buildPlanServiceNode(this.#params);
    }
}
const plan_buildPlanServiceNodeFromOptions = curryBuildPlanServiceNodeFromOptions(circularBuildServiceNodeBindings);
const plan_subplan = currySubplan(plan_buildPlanServiceNodeFromOptions, plan_buildPlanServiceNodeFromOptions);
const plan_buildServiceNodeBindings = curryBuildServiceNodeBindings(plan_subplan);
function circularBuildServiceNodeBindings(params, bindingConstraintsList, serviceBindings, parentNode, buildServiceNodeOptions) {
    return plan_buildServiceNodeBindings(params, bindingConstraintsList, serviceBindings, parentNode, buildServiceNodeOptions);
}
const buildPlanServiceNode = curryBuildPlanServiceNode(plan_buildServiceNodeBindings);
function plan(params) {
    try {
        const getPlanOptions = buildGetPlanOptionsFromPlanParams(params);
        const planResultFromCache = params.operations.getPlan(getPlanOptions);
        if (planResultFromCache !== undefined) {
            return planResultFromCache;
        }
        const serviceNode = buildPlanServiceNode(params);
        const planResult = {
            tree: {
                root: new LazyRootPlanServiceNode(params, serviceNode),
            },
        };
        // Set the plan result in the cache no matter what, even if the plan is context dependent
        params.operations.setPlan(getPlanOptions, planResult);
        return planResult;
    }
    catch (error) {
        handlePlanError(params, error);
    }
}
//# sourceMappingURL=plan.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/models/CacheBindingInvalidationKind.js
var CacheBindingInvalidationKind_CacheBindingInvalidationKind;
(function (CacheBindingInvalidationKind) {
    CacheBindingInvalidationKind["bindingAdded"] = "bindingAdded";
    CacheBindingInvalidationKind["bindingRemoved"] = "bindingRemoved";
})(CacheBindingInvalidationKind_CacheBindingInvalidationKind || (CacheBindingInvalidationKind_CacheBindingInvalidationKind = {}));
//# sourceMappingURL=CacheBindingInvalidationKind.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/curryLazyBuildPlanServiceNodeFromOptions.js



function curryLazyBuildPlanServiceNodeFromOptions(buildServiceNodeBindings) {
    const buildPlanServiceNodeFromOptions = curryBuildPlanServiceNodeFromOptions(buildServiceNodeBindings);
    return (params, bindingConstraintsList, options) => {
        try {
            return buildPlanServiceNodeFromOptions(params, bindingConstraintsList, options);
        }
        catch (error) {
            if (InversifyCoreError_InversifyCoreError.isErrorOfKind(error, InversifyCoreErrorKind_InversifyCoreErrorKind.planning)) {
                return undefined;
            }
            throw error;
        }
    };
}
//# sourceMappingURL=curryLazyBuildPlanServiceNodeFromOptions.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/addServiceNodeBindingIfContextFree.js









const addServiceNodeBindingIfContextFree_subplan = currySubplan(plan_buildPlanServiceNodeFromOptions, circularLazyBuildPlanServiceNodeFromOptions);
const addServiceNodeBindingIfContextFree_buildServiceNodeBindings = curryBuildServiceNodeBindings(addServiceNodeBindingIfContextFree_subplan);
const lazyBuildPlanServiceNodeFromOptions = curryLazyBuildPlanServiceNodeFromOptions(addServiceNodeBindingIfContextFree_buildServiceNodeBindings);
function circularLazyBuildPlanServiceNodeFromOptions(params, bindingConstraintsList, options) {
    return lazyBuildPlanServiceNodeFromOptions(params, bindingConstraintsList, options);
}
/**
 * Attach a binding to a service node if the binding is context-free.
 * @param params The plan parameters.
 * @param serviceNode The service node to attach the binding to.
 * @param binding The binding to attach.
 * @param bindingConstraintsList The list of binding constraints.
 * @param chainedBindings Whether the bindings are chained.
 * @returns True if the binding requires ancestor metadata, false otherwise.
 */
function addServiceNodeBindingIfContextFree(params, serviceNode, binding, bindingConstraintsList, buildServiceNodeOptions) {
    if (LazyPlanServiceNode.is(serviceNode) && !serviceNode.isExpanded()) {
        return {
            isContextFreeBinding: true,
            shouldInvalidateServiceNode: false,
        };
    }
    const bindingConstraints = new BindingConstraintsImplementation(bindingConstraintsList.last);
    if (!binding.isSatisfiedBy(bindingConstraints) ||
        bindingConstraintsList.last.elem.getAncestorsCalled) {
        return {
            isContextFreeBinding: !bindingConstraintsList.last.elem.getAncestorsCalled,
            shouldInvalidateServiceNode: false,
        };
    }
    return addServiceNodeSatisfiedBindingIfContextFree(params, serviceNode, binding, bindingConstraintsList, buildServiceNodeOptions);
}
function addServiceNodeSatisfiedBindingIfContextFree(params, serviceNode, binding, bindingConstraintsList, buildServiceNodeOptions) {
    let serviceNodeBinding;
    try {
        [serviceNodeBinding] = addServiceNodeBindingIfContextFree_buildServiceNodeBindings(params, bindingConstraintsList, [binding], serviceNode, buildServiceNodeOptions);
    }
    catch (error) {
        if (isStackOverflowError(error) ||
            InversifyCoreError_InversifyCoreError.isErrorOfKind(error, InversifyCoreErrorKind_InversifyCoreErrorKind.planningMaxDepthExceeded)) {
            /**
             * We could potentially detect if we managed to traverse at least one iteration of the circular dependency loop.
             * If so, the binding is context free if and only if bindingConstraintsList.last.elem.getAncestorsCalled is false.
             *
             * Having said that, computing this does not solve an underlying issue with circular dependencies: further cache
             * refreshes are likely to encounter the same issue again and again. Recovering from stack overflow errors constantly
             * is not feasible, so we prefer to declare the binding as non context free, asking for a more aggressive cache
             * invalidation strategy, which is likely to be a cache clear.
             */
            return {
                isContextFreeBinding: false,
                shouldInvalidateServiceNode: true,
            };
        }
        throw error;
    }
    return addServiceNodeBindingNodeIfContextFree(serviceNode, serviceNodeBinding);
}
function addServiceNodeBindingNodeIfContextFree(serviceNode, serviceNodeBinding) {
    if (Array.isArray(serviceNode.bindings)) {
        serviceNode.bindings.push(serviceNodeBinding);
    }
    else {
        if (serviceNode.bindings === undefined) {
            serviceNode.bindings = serviceNodeBinding;
        }
        else {
            if (!LazyPlanServiceNode.is(serviceNode)) {
                throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planning, 'Unexpected non-lazy plan service node. This is likely a bug in the planning logic. Please, report this issue');
            }
            return {
                isContextFreeBinding: true,
                shouldInvalidateServiceNode: true,
            };
        }
    }
    return {
        isContextFreeBinding: true,
        shouldInvalidateServiceNode: false,
    };
}
//# sourceMappingURL=addServiceNodeBindingIfContextFree.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/addRootServiceNodeBindingIfContextFree.js




/**
 * Attach a binding to the root service node if the binding is context-free.
 * @param params The plan parameters.
 * @param serviceNode The service node to attach the binding to.
 * @param binding The binding to attach.
 * @returns True if the binding requires ancestor metadata, false otherwise.
 */
function addRootServiceNodeBindingIfContextFree(params, serviceNode, binding) {
    if (LazyPlanServiceNode.is(serviceNode) && !serviceNode.isExpanded()) {
        return {
            isContextFreeBinding: true,
            shouldInvalidateServiceNode: false,
        };
    }
    const bindingConstraintsList = buildPlanBindingConstraintsList(params);
    return addServiceNodeBindingIfContextFree(params, serviceNode, binding, bindingConstraintsList, buildBuildServiceNodeOptionsFromPlanParamsConstraints(params.rootConstraints));
}
//# sourceMappingURL=addRootServiceNodeBindingIfContextFree.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/removeServiceNodeBindingIfContextFree.js




/**
 * Detach a binding to the root service node if it is context-free.
 * @param serviceNode The service node to attach the binding to.
 * @param binding The binding to attach.
 * @param bindingConstraintsList The list of binding constraints.
 * @param optionalBindings Whether the bindings are optional.
 * @returns True if the binding requires ancestor metadata, false otherwise.
 */
function removeServiceNodeBindingIfContextFree(serviceNode, binding, bindingConstraintsList, optionalBindings) {
    if (LazyPlanServiceNode.is(serviceNode) && !serviceNode.isExpanded()) {
        return {
            bindingNodeRemoved: undefined,
            isContextFreeBinding: true,
        };
    }
    const bindingConstraints = new BindingConstraintsImplementation(bindingConstraintsList.last);
    if (!binding.isSatisfiedBy(bindingConstraints) ||
        bindingConstraintsList.last.elem.getAncestorsCalled) {
        return {
            bindingNodeRemoved: undefined,
            isContextFreeBinding: !bindingConstraintsList.last.elem.getAncestorsCalled,
        };
    }
    let bindingNodeRemoved;
    if (Array.isArray(serviceNode.bindings)) {
        serviceNode.bindings = serviceNode.bindings.filter((bindingNode) => {
            if (bindingNode.binding === binding) {
                bindingNodeRemoved = bindingNode;
                return false;
            }
            return true;
        });
    }
    else {
        if (serviceNode.bindings?.binding === binding) {
            bindingNodeRemoved = serviceNode.bindings;
            if (optionalBindings) {
                serviceNode.bindings = undefined;
            }
            else {
                if (!LazyPlanServiceNode.is(serviceNode)) {
                    throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planning, 'Unexpected non-lazy plan service node. This is likely a bug in the planning logic. Please, report this issue');
                }
                serviceNode.invalidate();
            }
        }
    }
    return {
        bindingNodeRemoved: bindingNodeRemoved,
        isContextFreeBinding: true,
    };
}
//# sourceMappingURL=removeServiceNodeBindingIfContextFree.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/actions/removeRootServiceNodeBindingIfContextFree.js



/**
 * Detach a binding to the root service node if it is context-free.
 * @param params The plan parameters.
 * @param serviceNode The service node to attach the binding to.
 * @param binding The binding to attach.
 * @returns True if the binding requires ancestor metadata, false otherwise.
 */
function removeRootServiceNodeBindingIfContextFree(params, serviceNode, binding) {
    if (LazyPlanServiceNode.is(serviceNode) && !serviceNode.isExpanded()) {
        return {
            bindingNodeRemoved: undefined,
            isContextFreeBinding: true,
        };
    }
    const bindingConstraintsList = buildPlanBindingConstraintsList(params);
    return removeServiceNodeBindingIfContextFree(serviceNode, binding, bindingConstraintsList, params.rootConstraints.isOptional ?? false);
}
//# sourceMappingURL=removeRootServiceNodeBindingIfContextFree.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/isConstructorNoParamNode.js
function isConstructorNoParamNode(value) {
    return value.isNoParam === true;
}
//# sourceMappingURL=isConstructorNoParamNode.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/services/PlanResultCacheService.js









const NO_OPTIONS_INDEX = 0;
const CHAINED_MASK = 0x4;
const IS_MULTIPLE_MASK = 0x2;
const OPTIONAL_MASK = 0x1;
const MAP_ARRAY_LENGTH = 0x8;
/**
 * Service to cache plans.
 *
 * This class is used to cache plans and to notify PlanService subscribers when the cache is cleared.
 * The cache should be cleared when a new binding is registered or when a binding is unregistered.
 *
 * Subscribers are supposed to be plan services from child containers.
 *
 * Ancestor binding constraints are the reason to avoid reusing plans from plan children nodes.
 */
class PlanResultCacheService {
    #jitEnabled;
    #serviceIdToNonCachedServiceNodeMapMap;
    #serviceIdToValuePlanMap;
    #namedServiceIdToValuePlanMap;
    #namedTaggedServiceIdToValuePlanMap;
    #taggedServiceIdToValuePlanMap;
    #subscribers;
    constructor(jitEnabled) {
        this.#jitEnabled = jitEnabled;
        this.#serviceIdToNonCachedServiceNodeMapMap = new Map();
        this.#serviceIdToValuePlanMap = this.#buildInitializedMapArray();
        this.#namedServiceIdToValuePlanMap = this.#buildInitializedMapArray();
        this.#namedTaggedServiceIdToValuePlanMap = this.#buildInitializedMapArray();
        this.#taggedServiceIdToValuePlanMap = this.#buildInitializedMapArray();
        this.#subscribers = new WeakList();
    }
    clearCache() {
        for (const map of this.#getMaps()) {
            map.clear();
        }
        for (const subscriber of this.#subscribers) {
            subscriber.clearCache();
        }
    }
    getByServiceIdentifier(serviceIdentifier) {
        return this.#serviceIdToValuePlanMap[NO_OPTIONS_INDEX].get(serviceIdentifier);
    }
    get(options) {
        if (options.name === undefined) {
            if (options.tag === undefined) {
                return this.#getMapFromMapArray(this.#serviceIdToValuePlanMap, options).get(options.serviceIdentifier);
            }
            else {
                return this.#getMapFromMapArray(this.#taggedServiceIdToValuePlanMap, options)
                    .get(options.serviceIdentifier)
                    ?.get(options.tag.key)
                    ?.get(options.tag.value);
            }
        }
        else {
            if (options.tag === undefined) {
                return this.#getMapFromMapArray(this.#namedServiceIdToValuePlanMap, options)
                    .get(options.serviceIdentifier)
                    ?.get(options.name);
            }
            else {
                return this.#getMapFromMapArray(this.#namedTaggedServiceIdToValuePlanMap, options)
                    .get(options.serviceIdentifier)
                    ?.get(options.name)
                    ?.get(options.tag.key)
                    ?.get(options.tag.value);
            }
        }
    }
    invalidateServiceBinding(invalidation) {
        this.#invalidateServiceMap(invalidation);
        this.#invalidateNamedServiceMap(invalidation);
        this.#invalidateNamedTaggedServiceMap(invalidation);
        this.#invalidateTaggedServiceMap(invalidation);
        this.#invalidateNonCachedServiceNodeSetMap(invalidation);
        for (const subscriber of this.#subscribers) {
            subscriber.invalidateServiceBinding(invalidation);
        }
    }
    set(options, planResult) {
        if (options.name === undefined) {
            if (options.tag === undefined) {
                this.#getMapFromMapArray(this.#serviceIdToValuePlanMap, options).set(options.serviceIdentifier, planResult);
            }
            else {
                this.#getOrBuildMapValueFromMapMap(this.#getOrBuildMapValueFromMapMap(this.#getMapFromMapArray(this.#taggedServiceIdToValuePlanMap, options), options.serviceIdentifier), options.tag.key).set(options.tag.value, planResult);
            }
        }
        else {
            if (options.tag === undefined) {
                this.#getOrBuildMapValueFromMapMap(this.#getMapFromMapArray(this.#namedServiceIdToValuePlanMap, options), options.serviceIdentifier).set(options.name, planResult);
            }
            else {
                this.#getOrBuildMapValueFromMapMap(this.#getOrBuildMapValueFromMapMap(this.#getOrBuildMapValueFromMapMap(this.#getMapFromMapArray(this.#namedTaggedServiceIdToValuePlanMap, options), options.serviceIdentifier), options.name), options.tag.key).set(options.tag.value, planResult);
            }
        }
    }
    setNonCachedServiceNode(node, context) {
        let nonCachedMap = this.#serviceIdToNonCachedServiceNodeMapMap.get(node.serviceIdentifier);
        if (nonCachedMap === undefined) {
            nonCachedMap = new Map();
            this.#serviceIdToNonCachedServiceNodeMapMap.set(node.serviceIdentifier, nonCachedMap);
        }
        nonCachedMap.set(node, context);
    }
    subscribe(subscriber) {
        this.#subscribers.push(subscriber);
    }
    #buildInitializedMapArray() {
        const mapArray = new Array(MAP_ARRAY_LENGTH);
        for (let i = 0; i < mapArray.length; ++i) {
            mapArray[i] = new Map();
        }
        return mapArray;
    }
    #buildUpdatePlanParams(invalidation, index, name, tag) {
        const isMultiple = (index & IS_MULTIPLE_MASK) !== 0;
        let planParamsConstraint;
        if (isMultiple) {
            const isChained = (index & IS_MULTIPLE_MASK & CHAINED_MASK) !== 0;
            planParamsConstraint = {
                chained: isChained,
                isMultiple,
                serviceIdentifier: invalidation.binding.serviceIdentifier,
            };
        }
        else {
            planParamsConstraint = {
                isMultiple,
                serviceIdentifier: invalidation.binding.serviceIdentifier,
            };
        }
        const isOptional = (index & OPTIONAL_MASK) !== 0;
        if (isOptional) {
            planParamsConstraint.isOptional = true;
        }
        if (name !== undefined) {
            planParamsConstraint.name = name;
        }
        if (tag !== undefined) {
            planParamsConstraint.tag = tag;
        }
        return {
            autobindOptions: undefined,
            jitEnabled: this.#jitEnabled,
            operations: invalidation.operations,
            rootConstraints: planParamsConstraint,
            servicesBranch: [],
        };
    }
    #getOrBuildMapValueFromMapMap(map, key) {
        let valueMap = map.get(key);
        if (valueMap === undefined) {
            valueMap = new Map();
            map.set(key, valueMap);
        }
        return valueMap;
    }
    #getMapFromMapArray(mapArray, options) {
        return mapArray[this.#getMapArrayIndex(options)];
    }
    #getMaps() {
        return [
            this.#serviceIdToNonCachedServiceNodeMapMap,
            ...this.#serviceIdToValuePlanMap,
            ...this.#namedServiceIdToValuePlanMap,
            ...this.#namedTaggedServiceIdToValuePlanMap,
            ...this.#taggedServiceIdToValuePlanMap,
        ];
    }
    #getMapArrayIndex(options) {
        if (options.isMultiple) {
            return ((options.chained ? CHAINED_MASK : 0) |
                (options.optional ? OPTIONAL_MASK : 0) |
                IS_MULTIPLE_MASK);
        }
        else {
            return options.optional ? OPTIONAL_MASK : 0;
        }
    }
    #invalidateNamedServiceMap(invalidation) {
        for (const [index, map] of this.#namedServiceIdToValuePlanMap.entries()) {
            const servicePlans = map.get(invalidation.binding.serviceIdentifier);
            if (servicePlans !== undefined) {
                for (const [name, servicePlan] of servicePlans.entries()) {
                    this.#updatePlan(invalidation, servicePlan, index, name, undefined);
                }
            }
        }
    }
    #invalidateNamedTaggedServiceMap(invalidation) {
        for (const [index, map,] of this.#namedTaggedServiceIdToValuePlanMap.entries()) {
            const servicePlanMapMapMap = map.get(invalidation.binding.serviceIdentifier);
            if (servicePlanMapMapMap !== undefined) {
                for (const [name, servicePlanMapMap,] of servicePlanMapMapMap.entries()) {
                    for (const [tag, servicePlanMap] of servicePlanMapMap.entries()) {
                        for (const [tagValue, servicePlan] of servicePlanMap.entries()) {
                            this.#updatePlan(invalidation, servicePlan, index, name, {
                                key: tag,
                                value: tagValue,
                            });
                        }
                    }
                }
            }
        }
    }
    #invalidateNonCachePlanBindingNodeDescendents(planBindingNode) {
        switch (planBindingNode.binding.type) {
            case bindingTypeValues.ServiceRedirection:
                this.#invalidateNonCachePlanServiceNode(planBindingNode.redirection);
                break;
            case bindingTypeValues.Instance:
                for (const constructorParam of planBindingNode
                    .constructorParams) {
                    if (!isConstructorNoParamNode(constructorParam)) {
                        this.#invalidateNonCachePlanServiceNode(constructorParam);
                    }
                }
                for (const propertyParam of planBindingNode.propertyParams.values()) {
                    this.#invalidateNonCachePlanServiceNode(propertyParam);
                }
                break;
            case bindingTypeValues.ResolvedValue:
                for (const resolvedValue of planBindingNode.params) {
                    this.#invalidateNonCachePlanServiceNode(resolvedValue);
                }
                break;
            default:
        }
    }
    #invalidateNonCachePlanServiceNode(planServiceNode) {
        const serviceNonCachedMap = this.#serviceIdToNonCachedServiceNodeMapMap.get(planServiceNode.serviceIdentifier);
        if (serviceNonCachedMap === undefined ||
            !serviceNonCachedMap.has(planServiceNode)) {
            return;
        }
        serviceNonCachedMap.delete(planServiceNode);
        this.#invalidateNonCachePlanServiceNodeDescendents(planServiceNode);
    }
    #invalidateNonCachePlanServiceNodeDescendents(planServiceNode) {
        if (LazyPlanServiceNode.is(planServiceNode) &&
            !planServiceNode.isExpanded()) {
            return;
        }
        if (planServiceNode.bindings === undefined) {
            return;
        }
        if (Array.isArray(planServiceNode.bindings)) {
            for (const binding of planServiceNode.bindings) {
                this.#invalidateNonCachePlanBindingNodeDescendents(binding);
            }
        }
        else {
            this.#invalidateNonCachePlanBindingNodeDescendents(planServiceNode.bindings);
        }
    }
    #invalidateNonCachedServiceNodeSetMap(invalidation) {
        const serviceNonCachedServiceNodeMap = this.#serviceIdToNonCachedServiceNodeMapMap.get(invalidation.binding.serviceIdentifier);
        if (serviceNonCachedServiceNodeMap !== undefined) {
            switch (invalidation.kind) {
                case CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingAdded:
                    for (const [serviceNode, context] of serviceNonCachedServiceNodeMap) {
                        const result = addServiceNodeBindingIfContextFree({
                            autobindOptions: undefined,
                            jitEnabled: this.#jitEnabled,
                            operations: invalidation.operations,
                            servicesBranch: [],
                        }, serviceNode, invalidation.binding, context.bindingConstraintsList, context.buildServiceNodeOptions);
                        if (result.isContextFreeBinding) {
                            if (result.shouldInvalidateServiceNode &&
                                LazyPlanServiceNode.is(serviceNode)) {
                                this.#invalidateNonCachePlanServiceNodeDescendents(serviceNode);
                                serviceNode.invalidate();
                            }
                        }
                        else {
                            this.clearCache();
                        }
                    }
                    break;
                case CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingRemoved:
                    for (const [serviceNode, context] of serviceNonCachedServiceNodeMap) {
                        const result = removeServiceNodeBindingIfContextFree(serviceNode, invalidation.binding, context.bindingConstraintsList, context.buildServiceNodeOptions.optional);
                        if (result.isContextFreeBinding) {
                            if (result.bindingNodeRemoved !== undefined) {
                                this.#invalidateNonCachePlanBindingNodeDescendents(result.bindingNodeRemoved);
                            }
                        }
                        else {
                            this.clearCache();
                        }
                    }
                    break;
            }
        }
    }
    #invalidateServiceMap(invalidation) {
        for (const [index, map] of this.#serviceIdToValuePlanMap.entries()) {
            const servicePlan = map.get(invalidation.binding.serviceIdentifier);
            this.#updatePlan(invalidation, servicePlan, index, undefined, undefined);
        }
    }
    #invalidateTaggedServiceMap(invalidation) {
        for (const [index, map] of this.#taggedServiceIdToValuePlanMap.entries()) {
            const servicePlanMapMap = map.get(invalidation.binding.serviceIdentifier);
            if (servicePlanMapMap !== undefined) {
                for (const [tag, servicePlanMap] of servicePlanMapMap.entries()) {
                    for (const [tagValue, servicePlan] of servicePlanMap.entries()) {
                        this.#updatePlan(invalidation, servicePlan, index, undefined, {
                            key: tag,
                            value: tagValue,
                        });
                    }
                }
            }
        }
    }
    #updatePlan(invalidation, servicePlan, index, name, tag) {
        if (servicePlan !== undefined &&
            LazyPlanServiceNode.is(servicePlan.tree.root)) {
            const planParams = this.#buildUpdatePlanParams(invalidation, index, name, tag);
            switch (invalidation.kind) {
                case CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingAdded:
                    {
                        const result = addRootServiceNodeBindingIfContextFree(planParams, servicePlan.tree.root, invalidation.binding);
                        if (result.isContextFreeBinding) {
                            if (result.shouldInvalidateServiceNode) {
                                this.#invalidateNonCachePlanServiceNodeDescendents(servicePlan.tree.root);
                                servicePlan.tree.root.invalidate();
                            }
                        }
                        else {
                            this.clearCache();
                        }
                    }
                    break;
                case CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingRemoved:
                    {
                        const result = removeRootServiceNodeBindingIfContextFree(planParams, servicePlan.tree.root, invalidation.binding);
                        if (result.isContextFreeBinding) {
                            if (result.bindingNodeRemoved !== undefined) {
                                this.#invalidateNonCachePlanBindingNodeDescendents(result.bindingNodeRemoved);
                            }
                        }
                        else {
                            this.clearCache();
                        }
                    }
                    break;
            }
        }
    }
}
//# sourceMappingURL=PlanResultCacheService.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/planning/calculations/handleResolveError.js







const INDEX_NOT_FOUND = -1;
function handleResolveError(params, error) {
    if (isStackOverflowError(error) ||
        InversifyCoreError_InversifyCoreError.isErrorOfKind(error, InversifyCoreErrorKind_InversifyCoreErrorKind.planningMaxDepthExceeded)) {
        const stringifiedCircularDependencies = handleResolveError_stringifyServiceIdentifierTrace(handleResolveError_extractLikelyCircularDependency(params));
        throw new InversifyCoreError_InversifyCoreError(InversifyCoreErrorKind_InversifyCoreErrorKind.planning, `Circular dependency found: ${stringifiedCircularDependencies}`, { cause: error });
    }
    throw error;
}
function handleResolveError_extractLikelyCircularDependency(params) {
    const root = params.planResult.tree.root;
    const stack = [];
    function depthFirstSearch(node) {
        const existingIndex = stack.indexOf(node);
        if (existingIndex !== INDEX_NOT_FOUND) {
            const cycleNodes = [
                ...stack.slice(existingIndex),
                node,
            ];
            return cycleNodes.map((n) => n.serviceIdentifier);
        }
        stack.push(node);
        try {
            for (const child of getChildServiceNodes(node)) {
                const result = depthFirstSearch(child);
                if (result !== undefined) {
                    return result;
                }
            }
        }
        finally {
            stack.pop();
        }
        return undefined;
    }
    const result = depthFirstSearch(root);
    return result ?? [];
}
function getChildServiceNodes(serviceNode) {
    const children = [];
    const bindings = serviceNode.bindings;
    if (bindings === undefined) {
        return children;
    }
    const processBindingNode = (bindingNode) => {
        if (isPlanServiceRedirectionBindingNode(bindingNode)) {
            children.push(...getChildServiceNodes(bindingNode.redirection));
            return;
        }
        switch (bindingNode.binding.type) {
            case bindingTypeValues.Instance: {
                const instanceNode = bindingNode;
                for (const ctorParam of instanceNode.constructorParams) {
                    if (!isConstructorNoParamNode(ctorParam)) {
                        children.push(ctorParam);
                    }
                }
                for (const propParam of instanceNode.propertyParams.values()) {
                    children.push(propParam);
                }
                break;
            }
            case bindingTypeValues.ResolvedValue: {
                const resolvedValueNode = bindingNode;
                for (const param of resolvedValueNode.params) {
                    children.push(param);
                }
                break;
            }
            default:
                break;
        }
    };
    if (Array.isArray(bindings)) {
        for (const bindingNode of bindings) {
            processBindingNode(bindingNode);
        }
    }
    else {
        processBindingNode(bindings);
    }
    return children;
}
function handleResolveError_stringifyServiceIdentifierTrace(serviceIdentifiers) {
    const serviceIdentifiersArray = [...serviceIdentifiers];
    if (serviceIdentifiersArray.length === 0) {
        return '(No dependency trace)';
    }
    return serviceIdentifiersArray.map(stringifyServiceIdentifier).join(' -> ');
}
//# sourceMappingURL=handleResolveError.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolve.js

function resolve_resolve(params) {
    try {
        const serviceNode = params.planResult.tree.root;
        return serviceNode.resolve(params);
    }
    catch (error) {
        handleResolveError(params, error);
    }
}
//# sourceMappingURL=resolve.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/binding/calculations/isScopedBinding.js
function isScopedBinding(binding) {
    return (binding.scope !==
        undefined);
}
//# sourceMappingURL=isScopedBinding.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingPreDestroy.js


const CACHE_KEY_TYPE = 'cache';
function resolveBindingPreDestroy(params, binding) {
    if (binding.type === bindingTypeValues.Instance) {
        const classMetadata = params.getClassMetadata(binding.implementationType);
        const instance = binding.cache
            .value;
        if (isPromise(instance)) {
            return instance.then((instance) => resolveInstancePreDestroyMethods(classMetadata, instance));
        }
        else {
            return resolveInstancePreDestroyMethods(classMetadata, instance);
        }
    }
}
function resolveInstancePreDestroyMethod(instance, methodName) {
    if (typeof instance[methodName] === 'function') {
        const result = instance[methodName]();
        return result;
    }
}
function resolveInstancePreDestroyMethods(classMetadata, instance) {
    const preDestroyMethodNames = classMetadata.lifecycle.preDestroyMethodNames;
    if (preDestroyMethodNames.size === 0) {
        return;
    }
    let result = undefined;
    for (const methodName of preDestroyMethodNames) {
        if (result === undefined) {
            result = resolveInstancePreDestroyMethod(instance, methodName);
        }
        else {
            result = result.then(() => resolveInstancePreDestroyMethod(instance, methodName));
        }
    }
    return result;
}
//# sourceMappingURL=resolveBindingPreDestroy.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingServiceDeactivations.js

function resolveBindingServiceDeactivations(params, serviceIdentifier, value) {
    const deactivations = params.getDeactivations(serviceIdentifier);
    if (deactivations === undefined) {
        return undefined;
    }
    if (isPromise(value)) {
        return resolveBindingDeactivationsFromIteratorAsync(value, deactivations[Symbol.iterator]());
    }
    return resolveBindingDeactivationsFromIterator(value, deactivations[Symbol.iterator]());
}
function resolveBindingDeactivationsFromIterator(value, deactivationsIterator) {
    let deactivationIteratorResult = deactivationsIterator.next();
    while (deactivationIteratorResult.done !== true) {
        const nextDeactivationValue = deactivationIteratorResult.value(value);
        if (isPromise(nextDeactivationValue)) {
            return resolveBindingDeactivationsFromIteratorAsync(value, deactivationsIterator);
        }
        deactivationIteratorResult = deactivationsIterator.next();
    }
}
async function resolveBindingDeactivationsFromIteratorAsync(value, deactivationsIterator) {
    const resolvedValue = await value;
    let deactivationIteratorResult = deactivationsIterator.next();
    while (deactivationIteratorResult.done !== true) {
        await deactivationIteratorResult.value(resolvedValue);
        deactivationIteratorResult = deactivationsIterator.next();
    }
}
//# sourceMappingURL=resolveBindingServiceDeactivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingDeactivations.js



const resolveBindingDeactivations_CACHE_KEY_TYPE = 'cache';
function resolveBindingDeactivations(params, binding) {
    const preDestroyResult = resolveBindingPreDestroy(params, binding);
    if (preDestroyResult === undefined) {
        return resolveBindingDeactivationsAfterPreDestroy(params, binding);
    }
    return preDestroyResult.then(() => resolveBindingDeactivationsAfterPreDestroy(params, binding));
}
function resolveBindingDeactivationsAfterPreDestroy(params, binding) {
    const bindingCache = binding.cache;
    if (isPromise(bindingCache.value)) {
        return bindingCache.value.then((resolvedValue) => resolveBindingDeactivationsAfterPreDestroyFromValue(params, binding, resolvedValue));
    }
    return resolveBindingDeactivationsAfterPreDestroyFromValue(params, binding, bindingCache.value);
}
function resolveBindingDeactivationsAfterPreDestroyFromValue(params, binding, resolvedValue) {
    let deactivationResult = undefined;
    if (binding.onDeactivation !== undefined) {
        const bindingDeactivation = binding.onDeactivation;
        deactivationResult = bindingDeactivation(resolvedValue);
    }
    if (deactivationResult === undefined) {
        return resolveBindingServiceDeactivations(params, binding.serviceIdentifier, resolvedValue);
    }
    else {
        return deactivationResult.then(() => resolveBindingServiceDeactivations(params, binding.serviceIdentifier, resolvedValue));
    }
}
//# sourceMappingURL=resolveBindingDeactivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveBindingsDeactivations.js



const resolveBindingsDeactivations_CACHE_KEY_TYPE = 'cache';
function resolveBindingsDeactivations(params, bindings) {
    if (bindings === undefined) {
        return;
    }
    const singletonScopedBindings = filterCachedSinglentonScopedBindings(bindings);
    const deactivationPromiseResults = [];
    for (const binding of singletonScopedBindings) {
        const deactivationResult = resolveBindingDeactivations(params, binding);
        if (deactivationResult !== undefined) {
            deactivationPromiseResults.push(deactivationResult);
        }
    }
    if (deactivationPromiseResults.length > 0) {
        return Promise.all(deactivationPromiseResults).then(() => undefined);
    }
}
function filterCachedSinglentonScopedBindings(bindings) {
    const filteredBindings = [];
    for (const binding of bindings) {
        if (isScopedBinding(binding) &&
            binding.scope === bindingScopeValues.Singleton &&
            binding.cache.isRight) {
            filteredBindings.push(binding);
        }
    }
    return filteredBindings;
}
//# sourceMappingURL=resolveBindingsDeactivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveModuleDeactivations.js

function resolveModuleDeactivations(params, moduleId) {
    const bindings = params.getBindingsFromModule(moduleId);
    return resolveBindingsDeactivations(params, bindings);
}
//# sourceMappingURL=resolveModuleDeactivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/resolution/actions/resolveServiceDeactivations.js

function resolveServiceDeactivations(params, serviceIdentifier) {
    const bindings = params.getBindings(serviceIdentifier);
    return resolveBindingsDeactivations(params, bindings);
}
//# sourceMappingURL=resolveServiceDeactivations.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+core@15.0.1_reflect-metadata@0.2.2/node_modules/@inversifyjs/core/lib/index.js

































//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/models/BindingIdentifier.js
const bindingIdentifierSymbol = Symbol.for('@inversifyjs/container/bindingIdentifier');
//# sourceMappingURL=BindingIdentifier.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isBindingIdentifier.js

function isBindingIdentifier(value) {
    return (typeof value === 'object' &&
        value !== null &&
        value[bindingIdentifierSymbol] === true);
}
//# sourceMappingURL=isBindingIdentifier.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/binding/utils/BindingConstraintUtils.js
class BindingConstraintUtils {
    static always = (_bindingConstraints) => {
        return true;
    };
}
//# sourceMappingURL=BindingConstraintUtils.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/error/models/InversifyContainerError.js
const InversifyContainerError_isAppErrorSymbol = Symbol.for('@inversifyjs/container/InversifyContainerError');
class InversifyContainerError extends Error {
    [InversifyContainerError_isAppErrorSymbol];
    kind;
    constructor(kind, message, options) {
        super(message, options);
        this[InversifyContainerError_isAppErrorSymbol] = true;
        this.kind = kind;
    }
    static is(value) {
        return (typeof value === 'object' &&
            value !== null &&
            value[InversifyContainerError_isAppErrorSymbol] === true);
    }
    static isErrorOfKind(value, kind) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return InversifyContainerError.is(value) && value.kind === kind;
    }
}
//# sourceMappingURL=InversifyContainerError.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/error/models/InversifyContainerErrorKind.js
var InversifyContainerErrorKind_InversifyContainerErrorKind;
(function (InversifyContainerErrorKind) {
    InversifyContainerErrorKind[InversifyContainerErrorKind["invalidOperation"] = 0] = "invalidOperation";
})(InversifyContainerErrorKind_InversifyContainerErrorKind || (InversifyContainerErrorKind_InversifyContainerErrorKind = {}));
//# sourceMappingURL=InversifyContainerErrorKind.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/buildBindingIdentifier.js

function buildBindingIdentifier(binding) {
    return {
        [bindingIdentifierSymbol]: true,
        id: binding.id,
    };
}
//# sourceMappingURL=buildBindingIdentifier.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isAnyAncestorBindingConstraints.js
function isAnyAncestorBindingConstraints(condition) {
    return (constraints) => {
        for (let ancestorMetadata = constraints.getAncestor(); ancestorMetadata !== undefined; ancestorMetadata = ancestorMetadata.getAncestor()) {
            if (condition(ancestorMetadata)) {
                return true;
            }
        }
        return false;
    };
}
//# sourceMappingURL=isAnyAncestorBindingConstraints.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isBindingConstraintsWithName.js
function isBindingConstraintsWithName(name) {
    return (constraints) => constraints.name === name;
}
//# sourceMappingURL=isBindingConstraintsWithName.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isAnyAncestorBindingConstraintsWithName.js


function isAnyAncestorBindingConstraintsWithName(name) {
    return isAnyAncestorBindingConstraints(isBindingConstraintsWithName(name));
}
//# sourceMappingURL=isAnyAncestorBindingConstraintsWithName.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isBindingConstraintsWithServiceId.js
function isBindingConstraintsWithServiceId(serviceId) {
    return (constraints) => constraints.serviceIdentifier === serviceId;
}
//# sourceMappingURL=isBindingConstraintsWithServiceId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isAnyAncestorBindingConstraintsWithServiceId.js


function isAnyAncestorBindingConstraintsWithServiceId(serviceId) {
    return isAnyAncestorBindingConstraints(isBindingConstraintsWithServiceId(serviceId));
}
//# sourceMappingURL=isAnyAncestorBindingConstraintsWithServiceId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isBindingConstraintsWithTag.js
function isBindingConstraintsWithTag(tag, value) {
    return (constraints) => constraints.tags.has(tag) && constraints.tags.get(tag) === value;
}
//# sourceMappingURL=isBindingConstraintsWithTag.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isAnyAncestorBindingConstraintsWithTag.js


function isAnyAncestorBindingConstraintsWithTag(tag, value) {
    return isAnyAncestorBindingConstraints(isBindingConstraintsWithTag(tag, value));
}
//# sourceMappingURL=isAnyAncestorBindingConstraintsWithTag.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isBindingConstraintsWithNoNameNorTags.js
function isBindingConstraintsWithNoNameNorTags(constraints) {
    return constraints.name === undefined && constraints.tags.size === 0;
}
//# sourceMappingURL=isBindingConstraintsWithNoNameNorTags.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isMultipleResolvedValueMetadataInjectOptions.js
function isMultipleResolvedValueMetadataInjectOptions(options) {
    return (options
        .isMultiple === true);
}
//# sourceMappingURL=isMultipleResolvedValueMetadataInjectOptions.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNoAncestorBindingConstraints.js

function isNoAncestorBindingConstraints(condition) {
    const isAnyAncestorBindingConstraintsConstraint = isAnyAncestorBindingConstraints(condition);
    return (constraints) => {
        return !isAnyAncestorBindingConstraintsConstraint(constraints);
    };
}
//# sourceMappingURL=isNoAncestorBindingConstraints.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNoAncestorBindingConstraintsWithName.js


function isNoAncestorBindingConstraintsWithName(name) {
    return isNoAncestorBindingConstraints(isBindingConstraintsWithName(name));
}
//# sourceMappingURL=isNoAncestorBindingConstraintsWithName.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNoAncestorBindingConstraintsWithServiceId.js


function isNoAncestorBindingConstraintsWithServiceId(serviceId) {
    return isNoAncestorBindingConstraints(isBindingConstraintsWithServiceId(serviceId));
}
//# sourceMappingURL=isNoAncestorBindingConstraintsWithServiceId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNoAncestorBindingConstraintsWithTag.js


function isNoAncestorBindingConstraintsWithTag(tag, value) {
    return isNoAncestorBindingConstraints(isBindingConstraintsWithTag(tag, value));
}
//# sourceMappingURL=isNoAncestorBindingConstraintsWithTag.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNotParentBindingConstraints.js
function isNotParentBindingConstraints(condition) {
    return (constraints) => {
        const ancestorMetadata = constraints.getAncestor();
        return ancestorMetadata === undefined || !condition(ancestorMetadata);
    };
}
//# sourceMappingURL=isNotParentBindingConstraints.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNotParentBindingConstraintsWithName.js


function isNotParentBindingConstraintsWithName(name) {
    return isNotParentBindingConstraints(isBindingConstraintsWithName(name));
}
//# sourceMappingURL=isNotParentBindingConstraintsWithName.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNotParentBindingConstraintsWithServiceId.js


function isNotParentBindingConstraintsWithServiceId(serviceId) {
    return isNotParentBindingConstraints(isBindingConstraintsWithServiceId(serviceId));
}
//# sourceMappingURL=isNotParentBindingConstraintsWithServiceId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isNotParentBindingConstraintsWithTag.js


function isNotParentBindingConstraintsWithTag(tag, value) {
    return isNotParentBindingConstraints(isBindingConstraintsWithTag(tag, value));
}
//# sourceMappingURL=isNotParentBindingConstraintsWithTag.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isParentBindingConstraints.js
function isParentBindingConstraints(condition) {
    return (constraints) => {
        const ancestorMetadata = constraints.getAncestor();
        return ancestorMetadata !== undefined && condition(ancestorMetadata);
    };
}
//# sourceMappingURL=isParentBindingConstraints.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isParentBindingConstraintsWithName.js


function isParentBindingConstraintsWithName(name) {
    return isParentBindingConstraints(isBindingConstraintsWithName(name));
}
//# sourceMappingURL=isParentBindingConstraintsWithName.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isParentBindingConstraintsWithServiceId.js


function isParentBindingConstraintsWithServiceId(serviceId) {
    return isParentBindingConstraints(isBindingConstraintsWithServiceId(serviceId));
}
//# sourceMappingURL=isParentBindingConstraintsWithServiceId.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isParentBindingConstraintsWithTag.js


function isParentBindingConstraintsWithTag(tag, value) {
    return isParentBindingConstraints(isBindingConstraintsWithTag(tag, value));
}
//# sourceMappingURL=isParentBindingConstraintsWithTag.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/calculations/isResolvedValueMetadataInjectOptions.js

function isResolvedValueMetadataInjectOptions(options) {
    return typeof options === 'object' && !LazyServiceIdentifier.is(options);
}
//# sourceMappingURL=isResolvedValueMetadataInjectOptions.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/binding/models/BindingFluentSyntaxImplementation.js




























class BindInFluentSyntaxImplementation {
    #binding;
    constructor(binding) {
        this.#binding = binding;
    }
    getIdentifier() {
        return buildBindingIdentifier(this.#binding);
    }
    inRequestScope() {
        this.#binding.scope = bindingScopeValues.Request;
        return new BindWhenOnFluentSyntaxImplementation(this.#binding);
    }
    inSingletonScope() {
        this.#binding.scope = bindingScopeValues.Singleton;
        return new BindWhenOnFluentSyntaxImplementation(this.#binding);
    }
    inTransientScope() {
        this.#binding.scope = bindingScopeValues.Transient;
        return new BindWhenOnFluentSyntaxImplementation(this.#binding);
    }
}
class BindToFluentSyntaxImplementation {
    #callback;
    #containerModuleId;
    #defaultScope;
    #serviceIdentifier;
    constructor(callback, containerModuleId, defaultScope, serviceIdentifier) {
        this.#callback = callback;
        this.#containerModuleId = containerModuleId;
        this.#defaultScope = defaultScope;
        this.#serviceIdentifier = serviceIdentifier;
    }
    to(type) {
        const classMetadata = getClassMetadata_getClassMetadata(type);
        const binding = {
            cache: {
                isRight: false,
                value: undefined,
            },
            id: getBindingId(),
            implementationType: type,
            isSatisfiedBy: BindingConstraintUtils.always,
            moduleId: this.#containerModuleId,
            onActivation: undefined,
            onDeactivation: undefined,
            scope: classMetadata.scope ?? this.#defaultScope,
            serviceIdentifier: this.#serviceIdentifier,
            type: bindingTypeValues.Instance,
        };
        this.#callback(binding);
        return new BindInWhenOnFluentSyntaxImplementation(binding);
    }
    toSelf() {
        if (typeof this.#serviceIdentifier !== 'function') {
            throw new Error('"toSelf" function can only be applied when a newable function is used as service identifier');
        }
        return this.to(this.#serviceIdentifier);
    }
    toConstantValue(value) {
        const binding = {
            cache: {
                isRight: false,
                value: undefined,
            },
            id: getBindingId(),
            isSatisfiedBy: BindingConstraintUtils.always,
            moduleId: this.#containerModuleId,
            onActivation: undefined,
            onDeactivation: undefined,
            scope: bindingScopeValues.Singleton,
            serviceIdentifier: this.#serviceIdentifier,
            type: bindingTypeValues.ConstantValue,
            value,
        };
        this.#callback(binding);
        return new BindWhenOnFluentSyntaxImplementation(binding);
    }
    toDynamicValue(builder) {
        const binding = {
            cache: {
                isRight: false,
                value: undefined,
            },
            id: getBindingId(),
            isSatisfiedBy: BindingConstraintUtils.always,
            moduleId: this.#containerModuleId,
            onActivation: undefined,
            onDeactivation: undefined,
            scope: this.#defaultScope,
            serviceIdentifier: this.#serviceIdentifier,
            type: bindingTypeValues.DynamicValue,
            value: builder,
        };
        this.#callback(binding);
        return new BindInWhenOnFluentSyntaxImplementation(binding);
    }
    toResolvedValue(factory, injectOptions) {
        const binding = {
            cache: {
                isRight: false,
                value: undefined,
            },
            factory,
            id: getBindingId(),
            isSatisfiedBy: BindingConstraintUtils.always,
            metadata: this.#buildResolvedValueMetadata(injectOptions),
            moduleId: this.#containerModuleId,
            onActivation: undefined,
            onDeactivation: undefined,
            scope: this.#defaultScope,
            serviceIdentifier: this.#serviceIdentifier,
            type: bindingTypeValues.ResolvedValue,
        };
        this.#callback(binding);
        return new BindInWhenOnFluentSyntaxImplementation(binding);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toFactory(builder) {
        const binding = {
            cache: {
                isRight: false,
                value: undefined,
            },
            factory: builder,
            id: getBindingId(),
            isSatisfiedBy: BindingConstraintUtils.always,
            moduleId: this.#containerModuleId,
            onActivation: undefined,
            onDeactivation: undefined,
            scope: bindingScopeValues.Singleton,
            serviceIdentifier: this.#serviceIdentifier,
            type: bindingTypeValues.Factory,
        };
        this.#callback(binding);
        return new BindWhenOnFluentSyntaxImplementation(binding);
    }
    toService(service) {
        const binding = {
            id: getBindingId(),
            isSatisfiedBy: BindingConstraintUtils.always,
            moduleId: this.#containerModuleId,
            serviceIdentifier: this.#serviceIdentifier,
            targetServiceIdentifier: service,
            type: bindingTypeValues.ServiceRedirection,
        };
        this.#callback(binding);
    }
    #buildResolvedValueMetadata(options) {
        const resolvedValueMetadata = {
            arguments: (options ?? []).map((injectOption) => {
                if (isResolvedValueMetadataInjectOptions(injectOption)) {
                    if (isMultipleResolvedValueMetadataInjectOptions(injectOption)) {
                        return {
                            chained: injectOption.chained ?? false,
                            kind: ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind.multipleInjection,
                            name: injectOption.name,
                            optional: injectOption.optional ?? false,
                            tags: new Map((injectOption.tags ?? []).map((tag) => [
                                tag.key,
                                tag.value,
                            ])),
                            value: injectOption.serviceIdentifier,
                        };
                    }
                    else {
                        return {
                            kind: ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind.singleInjection,
                            name: injectOption.name,
                            optional: injectOption.optional ?? false,
                            tags: new Map((injectOption.tags ?? []).map((tag) => [
                                tag.key,
                                tag.value,
                            ])),
                            value: injectOption.serviceIdentifier,
                        };
                    }
                }
                else {
                    return {
                        kind: ResolvedValueElementMetadataKind_ResolvedValueElementMetadataKind.singleInjection,
                        name: undefined,
                        optional: false,
                        tags: new Map(),
                        value: injectOption,
                    };
                }
            }),
        };
        return resolvedValueMetadata;
    }
}
class BindOnFluentSyntaxImplementation {
    #binding;
    constructor(binding) {
        this.#binding = binding;
    }
    getIdentifier() {
        return buildBindingIdentifier(this.#binding);
    }
    onActivation(activation) {
        this.#binding.onActivation = activation;
        return new BindWhenFluentSyntaxImplementation(this.#binding);
    }
    onDeactivation(deactivation) {
        this.#binding.onDeactivation = deactivation;
        if (this.#binding.scope !== bindingScopeValues.Singleton) {
            throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, `Binding for service "${stringifyServiceIdentifier(this.#binding.serviceIdentifier)}" has a deactivation function, but its scope is not singleton. Deactivation functions can only be used with singleton bindings.`);
        }
        return new BindWhenFluentSyntaxImplementation(this.#binding);
    }
}
class BindWhenFluentSyntaxImplementation {
    #binding;
    constructor(binding) {
        this.#binding = binding;
    }
    getIdentifier() {
        return buildBindingIdentifier(this.#binding);
    }
    when(constraint) {
        this.#binding.isSatisfiedBy = constraint;
        return new BindOnFluentSyntaxImplementation(this.#binding);
    }
    whenAnyAncestor(constraint) {
        return this.when(isAnyAncestorBindingConstraints(constraint));
    }
    whenAnyAncestorIs(serviceIdentifier) {
        return this.when(isAnyAncestorBindingConstraintsWithServiceId(serviceIdentifier));
    }
    whenAnyAncestorNamed(name) {
        return this.when(isAnyAncestorBindingConstraintsWithName(name));
    }
    whenAnyAncestorTagged(tag, tagValue) {
        return this.when(isAnyAncestorBindingConstraintsWithTag(tag, tagValue));
    }
    whenDefault() {
        return this.when(isBindingConstraintsWithNoNameNorTags);
    }
    whenNamed(name) {
        return this.when(isBindingConstraintsWithName(name));
    }
    whenNoParent(constraint) {
        return this.when(isNotParentBindingConstraints(constraint));
    }
    whenNoParentIs(serviceIdentifier) {
        return this.when(isNotParentBindingConstraintsWithServiceId(serviceIdentifier));
    }
    whenNoParentNamed(name) {
        return this.when(isNotParentBindingConstraintsWithName(name));
    }
    whenNoParentTagged(tag, tagValue) {
        return this.when(isNotParentBindingConstraintsWithTag(tag, tagValue));
    }
    whenParent(constraint) {
        return this.when(isParentBindingConstraints(constraint));
    }
    whenParentIs(serviceIdentifier) {
        return this.when(isParentBindingConstraintsWithServiceId(serviceIdentifier));
    }
    whenParentNamed(name) {
        return this.when(isParentBindingConstraintsWithName(name));
    }
    whenParentTagged(tag, tagValue) {
        return this.when(isParentBindingConstraintsWithTag(tag, tagValue));
    }
    whenTagged(tag, tagValue) {
        return this.when(isBindingConstraintsWithTag(tag, tagValue));
    }
    whenNoAncestor(constraint) {
        return this.when(isNoAncestorBindingConstraints(constraint));
    }
    whenNoAncestorIs(serviceIdentifier) {
        return this.when(isNoAncestorBindingConstraintsWithServiceId(serviceIdentifier));
    }
    whenNoAncestorNamed(name) {
        return this.when(isNoAncestorBindingConstraintsWithName(name));
    }
    whenNoAncestorTagged(tag, tagValue) {
        return this.when(isNoAncestorBindingConstraintsWithTag(tag, tagValue));
    }
}
class BindWhenOnFluentSyntaxImplementation extends BindWhenFluentSyntaxImplementation {
    #bindOnFluentSyntax;
    constructor(binding) {
        super(binding);
        this.#bindOnFluentSyntax = new BindOnFluentSyntaxImplementation(binding);
    }
    onActivation(activation) {
        return this.#bindOnFluentSyntax.onActivation(activation);
    }
    onDeactivation(deactivation) {
        return this.#bindOnFluentSyntax.onDeactivation(deactivation);
    }
}
class BindInWhenOnFluentSyntaxImplementation extends BindWhenOnFluentSyntaxImplementation {
    #bindInFluentSyntax;
    constructor(binding) {
        super(binding);
        this.#bindInFluentSyntax = new BindInFluentSyntaxImplementation(binding);
    }
    inRequestScope() {
        return this.#bindInFluentSyntax.inRequestScope();
    }
    inSingletonScope() {
        return this.#bindInFluentSyntax.inSingletonScope();
    }
    inTransientScope() {
        return this.#bindInFluentSyntax.inTransientScope();
    }
}
//# sourceMappingURL=BindingFluentSyntaxImplementation.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/common/actions/getFirstIteratorResult.js
function getFirstIteratorResult(iterator) {
    if (iterator === undefined) {
        return undefined;
    }
    const firstIteratorResult = iterator.next();
    if (firstIteratorResult.done === true) {
        return undefined;
    }
    return firstIteratorResult.value;
}
//# sourceMappingURL=getFirstIteratorResult.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/common/calculations/getFirstIterableResult.js

function getFirstIterableResult(iterable) {
    return getFirstIteratorResult(iterable?.[Symbol.iterator]());
}
//# sourceMappingURL=getFirstIterableResult.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/BindingManager.js







class BindingManager {
    #deactivationParams;
    #defaultScope;
    #planResultCacheManager;
    #serviceReferenceManager;
    constructor(deactivationParams, defaultScope, planResultCacheManager, serviceReferenceManager) {
        this.#deactivationParams = deactivationParams;
        this.#defaultScope = defaultScope;
        this.#planResultCacheManager = planResultCacheManager;
        this.#serviceReferenceManager = serviceReferenceManager;
    }
    bind(serviceIdentifier) {
        return new BindToFluentSyntaxImplementation((binding) => {
            this.#setBinding(binding);
        }, undefined, this.#defaultScope, serviceIdentifier);
    }
    isBound(serviceIdentifier, options) {
        const bindings = this.#serviceReferenceManager.bindingService.get(serviceIdentifier);
        return this.#isAnyValidBinding(serviceIdentifier, bindings, options);
    }
    isCurrentBound(serviceIdentifier, options) {
        const bindings = this.#serviceReferenceManager.bindingService.getNonParentBindings(serviceIdentifier);
        return this.#isAnyValidBinding(serviceIdentifier, bindings, options);
    }
    async rebindAsync(serviceIdentifier) {
        await this.unbindAsync(serviceIdentifier);
        return this.bind(serviceIdentifier);
    }
    rebind(serviceIdentifier) {
        this.unbind(serviceIdentifier);
        return this.bind(serviceIdentifier);
    }
    async unbindAsync(identifier) {
        await this.#unbindAsync(identifier);
    }
    async unbindAllAsync() {
        await this.#unbindAll();
    }
    unbindAll() {
        const result = this.#unbindAll();
        if (result !== undefined) {
            throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, 'Unexpected asynchronous deactivation when unbinding all services. Consider using Container.unbindAllAsync() instead.');
        }
    }
    unbind(identifier) {
        const result = this.#unbindAsync(identifier);
        if (result !== undefined) {
            this.#throwUnexpectedAsyncUnbindOperation(identifier);
        }
    }
    #setBinding(binding) {
        this.#serviceReferenceManager.bindingService.set(binding);
        this.#planResultCacheManager.invalidateService({
            binding: binding,
            kind: CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingAdded,
        });
    }
    #throwUnexpectedAsyncUnbindOperation(identifier) {
        let errorMessage;
        if (isBindingIdentifier(identifier)) {
            const bindingsById = this.#serviceReferenceManager.bindingService.getById(identifier.id);
            const bindingServiceIdentifier = getFirstIterableResult(bindingsById)?.serviceIdentifier;
            if (bindingServiceIdentifier === undefined) {
                errorMessage =
                    'Unexpected asynchronous deactivation when unbinding binding identifier. Consider using Container.unbindAsync() instead.';
            }
            else {
                errorMessage = `Unexpected asynchronous deactivation when unbinding "${stringifyServiceIdentifier(bindingServiceIdentifier)}" binding. Consider using Container.unbindAsync() instead.`;
            }
        }
        else {
            errorMessage = `Unexpected asynchronous deactivation when unbinding "${stringifyServiceIdentifier(identifier)}" service. Consider using Container.unbindAsync() instead.`;
        }
        throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, errorMessage);
    }
    #unbindAsync(identifier) {
        if (isBindingIdentifier(identifier)) {
            return this.#unbindBindingIdentifier(identifier);
        }
        return this.#unbindServiceIdentifier(identifier);
    }
    #unbindBindingIdentifier(identifier) {
        const bindingsIterable = this.#serviceReferenceManager.bindingService.getById(identifier.id);
        const bindings = bindingsIterable === undefined ? undefined : [...bindingsIterable];
        const result = resolveBindingsDeactivations(this.#deactivationParams, bindingsIterable);
        if (result === undefined) {
            this.#clearAfterUnbindBindingIdentifier(bindings, identifier);
        }
        else {
            return result.then(() => {
                this.#clearAfterUnbindBindingIdentifier(bindings, identifier);
            });
        }
    }
    #clearAfterUnbindBindingIdentifier(bindings, identifier) {
        this.#serviceReferenceManager.bindingService.removeById(identifier.id);
        if (bindings !== undefined) {
            for (const binding of bindings) {
                this.#planResultCacheManager.invalidateService({
                    binding,
                    kind: CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingRemoved,
                });
            }
        }
    }
    #unbindAll() {
        const nonParentBoundServiceIds = [
            ...this.#serviceReferenceManager.bindingService.getNonParentBoundServices(),
        ];
        const deactivationResults = nonParentBoundServiceIds.map((serviceId) => resolveServiceDeactivations(this.#deactivationParams, serviceId));
        const hasAsyncDeactivations = deactivationResults.some((result) => isPromise(result));
        if (hasAsyncDeactivations) {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            return Promise.all(deactivationResults).then(() => {
                this.#clearAfterUnbindAll(nonParentBoundServiceIds);
            });
        }
        this.#clearAfterUnbindAll(nonParentBoundServiceIds);
    }
    #clearAfterUnbindAll(serviceIds) {
        /*
         * Removing service related objects here so unbindAll is deterministic.
         *
         * Removing service related objects as soon as resolveModuleDeactivations takes
         * effect leads to module deactivations not triggering previously deleted
         * deactivations, introducing non determinism depending in the order in which
         * services are deactivated.
         */
        for (const serviceId of serviceIds) {
            this.#serviceReferenceManager.activationService.removeAllByServiceId(serviceId);
            this.#serviceReferenceManager.bindingService.removeAllByServiceId(serviceId);
            this.#serviceReferenceManager.deactivationService.removeAllByServiceId(serviceId);
        }
        this.#serviceReferenceManager.planResultCacheService.clearCache();
    }
    #unbindServiceIdentifier(identifier) {
        const bindingsIterable = this.#serviceReferenceManager.bindingService.get(identifier);
        const bindings = bindingsIterable === undefined ? undefined : [...bindingsIterable];
        const result = resolveBindingsDeactivations(this.#deactivationParams, bindingsIterable);
        if (result === undefined) {
            this.#clearAfterUnbindServiceIdentifier(identifier, bindings);
        }
        else {
            return result.then(() => {
                this.#clearAfterUnbindServiceIdentifier(identifier, bindings);
            });
        }
    }
    #clearAfterUnbindServiceIdentifier(identifier, bindings) {
        this.#serviceReferenceManager.activationService.removeAllByServiceId(identifier);
        this.#serviceReferenceManager.bindingService.removeAllByServiceId(identifier);
        this.#serviceReferenceManager.deactivationService.removeAllByServiceId(identifier);
        if (bindings !== undefined) {
            for (const binding of bindings) {
                this.#planResultCacheManager.invalidateService({
                    binding,
                    kind: CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingRemoved,
                });
            }
        }
    }
    #isAnyValidBinding(serviceIdentifier, bindings, options) {
        if (bindings === undefined) {
            return false;
        }
        const bindingConstraints = {
            getAncestor: () => undefined,
            name: options?.name,
            serviceIdentifier,
            tags: new Map(),
        };
        if (options?.tag !== undefined) {
            bindingConstraints.tags.set(options.tag.key, options.tag.value);
        }
        for (const binding of bindings) {
            if (binding.isSatisfiedBy(bindingConstraints)) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=BindingManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/ContainerModuleManager.js




class ContainerModuleManager {
    #bindingManager;
    #deactivationParams;
    #defaultScope;
    #planResultCacheManager;
    #serviceReferenceManager;
    constructor(bindingManager, deactivationParams, defaultScope, planResultCacheManager, serviceReferenceManager) {
        this.#bindingManager = bindingManager;
        this.#deactivationParams = deactivationParams;
        this.#defaultScope = defaultScope;
        this.#planResultCacheManager = planResultCacheManager;
        this.#serviceReferenceManager = serviceReferenceManager;
    }
    async loadAsync(...modules) {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await Promise.all(this.#load(...modules));
    }
    load(...modules) {
        const results = this.#load(...modules);
        for (const result of results) {
            if (result !== undefined) {
                throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, 'Unexpected asynchronous module load. Consider using container.loadAsync() instead.');
            }
        }
    }
    async unloadAsync(...modules) {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await Promise.all(this.#unload(...modules));
        /*
         * Removing module related objects here so unload is deterministic.
         *
         * Removing modules as soon as resolveModuleDeactivations takes effect leads to
         * module deactivations not triggering previously deleted deactivations,
         * introducing non determinism depending in the order in which modules are
         * deactivated.
         */
        this.#clearAfterUnloadModules(modules);
    }
    unload(...modules) {
        const results = this.#unload(...modules);
        for (const result of results) {
            if (result !== undefined) {
                throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, 'Unexpected asynchronous module unload. Consider using container.unloadAsync() instead.');
            }
        }
        /*
         * Removing module related objects here so unload is deterministic.
         *
         * Removing modules as soon as resolveModuleDeactivations takes effect leads to
         * module deactivations not triggering previously deleted deactivations,
         * introducing non determinism depending in the order in which modules are
         * deactivated.
         */
        this.#clearAfterUnloadModules(modules);
    }
    #buildContainerModuleLoadOptions(moduleId) {
        return {
            bind: (serviceIdentifier) => {
                return new BindToFluentSyntaxImplementation((binding) => {
                    this.#setBinding(binding);
                }, moduleId, this.#defaultScope, serviceIdentifier);
            },
            isBound: this.#bindingManager.isBound.bind(this.#bindingManager),
            onActivation: (serviceIdentifier, activation) => {
                this.#serviceReferenceManager.activationService.add(activation, {
                    moduleId,
                    serviceId: serviceIdentifier,
                });
            },
            onDeactivation: (serviceIdentifier, deactivation) => {
                this.#serviceReferenceManager.deactivationService.add(deactivation, {
                    moduleId,
                    serviceId: serviceIdentifier,
                });
            },
            rebind: this.#bindingManager.rebind.bind(this.#bindingManager),
            rebindAsync: this.#bindingManager.rebindAsync.bind(this.#bindingManager),
            unbind: this.#bindingManager.unbind.bind(this.#bindingManager),
            unbindAsync: this.#bindingManager.unbindAsync.bind(this.#bindingManager),
        };
    }
    #clearAfterUnloadModules(modules) {
        for (const module of modules) {
            this.#serviceReferenceManager.activationService.removeAllByModuleId(module.id);
            this.#serviceReferenceManager.bindingService.removeAllByModuleId(module.id);
            this.#serviceReferenceManager.deactivationService.removeAllByModuleId(module.id);
        }
        this.#serviceReferenceManager.planResultCacheService.clearCache();
    }
    #load(...modules) {
        return modules.map((module) => module.load(this.#buildContainerModuleLoadOptions(module.id)));
    }
    #setBinding(binding) {
        this.#serviceReferenceManager.bindingService.set(binding);
        this.#planResultCacheManager.invalidateService({
            binding: binding,
            kind: CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingAdded,
        });
    }
    #unload(...modules) {
        return modules.map((module) => resolveModuleDeactivations(this.#deactivationParams, module.id));
    }
}
//# sourceMappingURL=ContainerModuleManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/actions/resetDeactivationParams.js
function resetDeactivationParams(serviceReferenceManager, deactivationParams) {
    deactivationParams.getBindings =
        serviceReferenceManager.bindingService.get.bind(serviceReferenceManager.bindingService);
    deactivationParams.getBindingsFromModule =
        serviceReferenceManager.bindingService.getByModuleId.bind(serviceReferenceManager.bindingService);
    deactivationParams.getDeactivations =
        serviceReferenceManager.deactivationService.get.bind(serviceReferenceManager.deactivationService);
}
//# sourceMappingURL=resetDeactivationParams.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/calculations/buildDeactivationParams.js

function buildDeactivationParams(serviceReferenceManager) {
    return {
        getBindings: serviceReferenceManager.bindingService.get.bind(serviceReferenceManager.bindingService),
        getBindingsFromModule: serviceReferenceManager.bindingService.getByModuleId.bind(serviceReferenceManager.bindingService),
        getClassMetadata: getClassMetadata_getClassMetadata,
        getDeactivations: serviceReferenceManager.deactivationService.get.bind(serviceReferenceManager.deactivationService),
    };
}
//# sourceMappingURL=buildDeactivationParams.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/DeactivationParamsManager.js


class DeactivationParamsManager {
    deactivationParams;
    constructor(serviceReferenceManager) {
        this.deactivationParams = buildDeactivationParams(serviceReferenceManager);
        serviceReferenceManager.onReset(() => {
            resetDeactivationParams(serviceReferenceManager, this.deactivationParams);
        });
    }
}
//# sourceMappingURL=DeactivationParamsManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/PlanParamsOperationsManager.js

class PlanParamsOperationsManager {
    planParamsOperations;
    #serviceReferenceManager;
    constructor(serviceReferenceManager) {
        this.#serviceReferenceManager = serviceReferenceManager;
        this.planParamsOperations = {
            getActivations: this.#getActivations.bind(this),
            getBindings: this.#serviceReferenceManager.bindingService.get.bind(this.#serviceReferenceManager.bindingService),
            getBindingsChained: this.#serviceReferenceManager.bindingService.getChained.bind(this.#serviceReferenceManager.bindingService),
            getClassMetadata: getClassMetadata_getClassMetadata,
            getPlan: this.#serviceReferenceManager.planResultCacheService.get.bind(this.#serviceReferenceManager.planResultCacheService),
            setBinding: this.#setBinding.bind(this),
            setNonCachedServiceNode: this.#serviceReferenceManager.planResultCacheService.setNonCachedServiceNode.bind(this.#serviceReferenceManager.planResultCacheService),
            setPlan: this.#serviceReferenceManager.planResultCacheService.set.bind(this.#serviceReferenceManager.planResultCacheService),
            subscribeActivationAddedOnce: this.#subscribeActivationAddedOnce.bind(this),
        };
        this.#serviceReferenceManager.onReset(() => {
            this.#resetComputedProperties();
        });
    }
    #getActivations(serviceIdentifier) {
        return this.#serviceReferenceManager.activationService.get(serviceIdentifier);
    }
    #subscribeActivationAddedOnce(serviceIdentifier, subscriber) {
        this.#serviceReferenceManager.activationService.subscribeOnce(serviceIdentifier, subscriber);
    }
    #resetComputedProperties() {
        this.planParamsOperations.getBindings =
            this.#serviceReferenceManager.bindingService.get.bind(this.#serviceReferenceManager.bindingService);
        this.planParamsOperations.getBindingsChained =
            this.#serviceReferenceManager.bindingService.getChained.bind(this.#serviceReferenceManager.bindingService);
        this.planParamsOperations.setBinding = this.#setBinding.bind(this);
    }
    #setBinding(binding) {
        this.#serviceReferenceManager.bindingService.set(binding);
        this.#serviceReferenceManager.planResultCacheService.invalidateServiceBinding({
            binding: binding,
            kind: CacheBindingInvalidationKind_CacheBindingInvalidationKind.bindingAdded,
            operations: this.planParamsOperations,
        });
    }
}
//# sourceMappingURL=PlanParamsOperationsManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/PlanResultCacheManager.js
class PlanResultCacheManager {
    #planParamsOperationsManager;
    #serviceReferenceManager;
    constructor(planParamsOperationsManager, serviceReferenceManager) {
        this.#planParamsOperationsManager = planParamsOperationsManager;
        this.#serviceReferenceManager = serviceReferenceManager;
    }
    invalidateService(invalidation) {
        this.#serviceReferenceManager.planResultCacheService.invalidateServiceBinding({
            ...invalidation,
            operations: this.#planParamsOperationsManager.planParamsOperations,
        });
    }
}
//# sourceMappingURL=PlanResultCacheManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+plugin@0.3.1/node_modules/@inversifyjs/plugin/lib/plugin/models/Plugin.js
const isPlugin = Symbol.for('@inversifyjs/plugin/isPlugin');
class Plugin {
    [isPlugin] = true;
    _container;
    _context;
    constructor(container, context) {
        this._container = container;
        this._context = context;
    }
}
//# sourceMappingURL=Plugin.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+plugin@0.3.1/node_modules/@inversifyjs/plugin/lib/index.js


//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/PluginManager.js



class PluginManager {
    #pluginApi;
    #pluginContext;
    #serviceResolutionManager;
    #serviceReferenceManager;
    constructor(container, serviceReferenceManager, serviceResolutionManager) {
        this.#serviceReferenceManager = serviceReferenceManager;
        this.#serviceResolutionManager = serviceResolutionManager;
        this.#pluginApi = this.#buildPluginApi(container);
        this.#pluginContext = this.#buildPluginContext();
    }
    register(container, pluginConstructor) {
        const pluginInstance = new pluginConstructor(container, this.#pluginContext);
        this.#assertIsPlugin(pluginInstance);
        pluginInstance.load(this.#pluginApi);
    }
    #assertIsPlugin(value) {
        if (value[isPlugin] !== true) {
            throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, 'Invalid plugin. The plugin must extend the Plugin class');
        }
    }
    #buildPluginApi(container) {
        return {
            define: (name, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            method) => {
                if (Object.prototype.hasOwnProperty.call(container, name)) {
                    throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, `Container already has a method named "${String(name)}"`);
                }
                container[name] =
                    method;
            },
            onPlan: this.#serviceResolutionManager.onPlan.bind(this.#serviceResolutionManager),
        };
    }
    #buildPluginContext() {
        const serviceReferenceManager = this.#serviceReferenceManager;
        return {
            get activationService() {
                return serviceReferenceManager.activationService;
            },
            get bindingService() {
                return serviceReferenceManager.bindingService;
            },
            get deactivationService() {
                return serviceReferenceManager.deactivationService;
            },
            get planResultCacheService() {
                return serviceReferenceManager.planResultCacheService;
            },
        };
    }
}
//# sourceMappingURL=PluginManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/ServiceReferenceManager.js
/**
 * Manages references to core services used throughout the Container
 * This class allows for proper synchronization of services during snapshot/restore operations
 */
class ServiceReferenceManager {
    activationService;
    bindingService;
    deactivationService;
    planResultCacheService;
    #onResetComputedPropertiesListeners;
    constructor(activationService, bindingService, deactivationService, planResultCacheService) {
        this.activationService = activationService;
        this.bindingService = bindingService;
        this.deactivationService = deactivationService;
        this.planResultCacheService = planResultCacheService;
        this.#onResetComputedPropertiesListeners = [];
    }
    reset(activationService, bindingService, deactivationService) {
        this.activationService = activationService;
        this.bindingService = bindingService;
        this.deactivationService = deactivationService;
        this.planResultCacheService.clearCache();
        for (const listener of this.#onResetComputedPropertiesListeners) {
            listener();
        }
    }
    onReset(listener) {
        this.#onResetComputedPropertiesListeners.push(listener);
    }
}
//# sourceMappingURL=ServiceReferenceManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/ServiceResolutionManager.js




class ServiceResolutionManager {
    #autobind;
    #defaultScope;
    #getActivationsResolutionParam;
    #jitEnabled;
    #resolutionContext;
    #onPlanHandlers;
    #planParamsOperationsManager;
    #serviceReferenceManager;
    constructor(planParamsOperationsManager, serviceReferenceManager, autobind, defaultScope, jitEnabled) {
        this.#planParamsOperationsManager = planParamsOperationsManager;
        this.#serviceReferenceManager = serviceReferenceManager;
        this.#getActivationsResolutionParam = (serviceIdentifier) => this.#serviceReferenceManager.activationService.get(serviceIdentifier);
        this.#resolutionContext = this.#buildResolutionContext();
        this.#autobind = autobind;
        this.#defaultScope = defaultScope;
        this.#jitEnabled = jitEnabled;
        this.#onPlanHandlers = [];
        this.#serviceReferenceManager.onReset(() => {
            this.#resetComputedProperties();
        });
    }
    get(serviceIdentifier, options) {
        const planResult = this.#buildPlanResult(false, serviceIdentifier, options);
        const resolvedValue = this.#getFromPlanResult(planResult);
        if (isPromise(resolvedValue)) {
            throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, `Unexpected asynchronous service when resolving service "${stringifyServiceIdentifier(serviceIdentifier)}"`);
        }
        return resolvedValue;
    }
    getAll(serviceIdentifier, options) {
        const planResult = this.#buildPlanResult(true, serviceIdentifier, options);
        const resolvedValue = this.#getFromPlanResult(planResult);
        if (isPromise(resolvedValue)) {
            throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, `Unexpected asynchronous service when resolving service "${stringifyServiceIdentifier(serviceIdentifier)}"`);
        }
        return resolvedValue;
    }
    async getAllAsync(serviceIdentifier, options) {
        const planResult = this.#buildPlanResult(true, serviceIdentifier, options);
        return this.#getFromPlanResult(planResult);
    }
    async getAsync(serviceIdentifier, options) {
        const planResult = this.#buildPlanResult(false, serviceIdentifier, options);
        return this.#getFromPlanResult(planResult);
    }
    onPlan(handler) {
        this.#onPlanHandlers.push(handler);
    }
    #resetComputedProperties() {
        this.#resolutionContext = this.#buildResolutionContext();
    }
    #buildGetPlanOptions(isMultiple, serviceIdentifier, options) {
        const name = options?.name;
        const optional = options?.optional ?? false;
        const tag = options?.tag;
        if (isMultiple) {
            return {
                chained: options?.chained ?? false,
                isMultiple,
                name,
                optional,
                serviceIdentifier,
                tag,
            };
        }
        else {
            return {
                isMultiple,
                name,
                optional,
                serviceIdentifier,
                tag,
            };
        }
    }
    #buildPlanParams(serviceIdentifier, isMultiple, options) {
        const planParams = {
            autobindOptions: (options?.autobind ?? this.#autobind)
                ? {
                    scope: this.#defaultScope,
                }
                : undefined,
            jitEnabled: this.#jitEnabled,
            operations: this.#planParamsOperationsManager.planParamsOperations,
            rootConstraints: this.#buildPlanParamsConstraints(serviceIdentifier, isMultiple, options),
            servicesBranch: [],
        };
        this.#handlePlanParamsRootConstraints(planParams, options);
        return planParams;
    }
    #buildPlanParamsConstraints(serviceIdentifier, isMultiple, options) {
        if (isMultiple) {
            return {
                chained: options?.chained ?? false,
                isMultiple,
                serviceIdentifier,
            };
        }
        else {
            return {
                isMultiple,
                serviceIdentifier,
            };
        }
    }
    #buildPlanResult(isMultiple, serviceIdentifier, options) {
        /**
         * This avoids allocating a {@link GetPlanOptions} object and the extra
         * branching performed by the plan result cache service.
         */
        if (!isMultiple && options === undefined) {
            const cachedPlanResultFromServiceIdentifier = this.#serviceReferenceManager.planResultCacheService.getByServiceIdentifier(serviceIdentifier);
            if (cachedPlanResultFromServiceIdentifier !== undefined) {
                return cachedPlanResultFromServiceIdentifier;
            }
        }
        const getPlanOptions = this.#buildGetPlanOptions(isMultiple, serviceIdentifier, options);
        const planResultFromCache = this.#serviceReferenceManager.planResultCacheService.get(getPlanOptions);
        if (planResultFromCache !== undefined) {
            return planResultFromCache;
        }
        const planResult = plan(this.#buildPlanParams(serviceIdentifier, isMultiple, options));
        for (const handler of this.#onPlanHandlers) {
            handler(getPlanOptions, planResult);
        }
        return planResult;
    }
    #buildResolutionContext() {
        return {
            get: this.get.bind(this),
            getActivations: this.#getActivationsResolutionParam,
            getAll: this.getAll.bind(this),
            getAllAsync: this.getAllAsync.bind(this),
            getAsync: this.getAsync.bind(this),
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
    #getFromPlanResult(planResult) {
        return resolve_resolve({
            context: this.#resolutionContext,
            planResult,
            requestScopeCache: undefined,
        });
    }
    #handlePlanParamsRootConstraints(planParams, options) {
        if (options === undefined) {
            return;
        }
        if (options.name !== undefined) {
            planParams.rootConstraints.name = options.name;
        }
        if (options.optional === true) {
            planParams.rootConstraints.isOptional = true;
        }
        if (options.tag !== undefined) {
            planParams.rootConstraints.tag = {
                key: options.tag.key,
                value: options.tag.value,
            };
        }
        if (planParams.rootConstraints.isMultiple) {
            planParams.rootConstraints.chained =
                options?.chained ?? false;
        }
    }
}
//# sourceMappingURL=ServiceResolutionManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/SnapshotManager.js


class SnapshotManager {
    #serviceReferenceManager;
    #snapshots;
    constructor(serviceReferenceManager) {
        this.#serviceReferenceManager = serviceReferenceManager;
        this.#snapshots = [];
    }
    restore() {
        const snapshot = this.#snapshots.pop();
        if (snapshot === undefined) {
            throw new InversifyContainerError(InversifyContainerErrorKind_InversifyContainerErrorKind.invalidOperation, 'No snapshot available to restore');
        }
        this.#serviceReferenceManager.reset(snapshot.activationService, snapshot.bindingService, snapshot.deactivationService);
    }
    snapshot() {
        this.#snapshots.push({
            activationService: this.#serviceReferenceManager.activationService.clone(),
            bindingService: this.#serviceReferenceManager.bindingService.clone(),
            deactivationService: this.#serviceReferenceManager.deactivationService.clone(),
        });
    }
}
//# sourceMappingURL=SnapshotManager.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/container/services/Container.js










const DEFAULT_DEFAULT_SCOPE = bindingScopeValues.Transient;
const DEFAULT_JITLESS = true;
class Container {
    #bindingManager;
    #containerModuleManager;
    #pluginManager;
    #serviceReferenceManager;
    #serviceResolutionManager;
    #snapshotManager;
    constructor(options) {
        const autobind = options?.autobind ?? false;
        const defaultScope = options?.defaultScope ?? DEFAULT_DEFAULT_SCOPE;
        const jitless = options?.jitless ?? DEFAULT_JITLESS;
        this.#serviceReferenceManager = this.#buildServiceReferenceManager(options, autobind, defaultScope, jitless);
        const planParamsOperationsManager = new PlanParamsOperationsManager(this.#serviceReferenceManager);
        const planResultCacheManager = new PlanResultCacheManager(planParamsOperationsManager, this.#serviceReferenceManager);
        const deactivationParamsManager = new DeactivationParamsManager(this.#serviceReferenceManager);
        this.#bindingManager = new BindingManager(deactivationParamsManager.deactivationParams, defaultScope, planResultCacheManager, this.#serviceReferenceManager);
        this.#containerModuleManager = new ContainerModuleManager(this.#bindingManager, deactivationParamsManager.deactivationParams, defaultScope, planResultCacheManager, this.#serviceReferenceManager);
        this.#serviceResolutionManager = new ServiceResolutionManager(planParamsOperationsManager, this.#serviceReferenceManager, autobind, defaultScope, !jitless);
        this.#pluginManager = new PluginManager(this, this.#serviceReferenceManager, this.#serviceResolutionManager);
        this.#snapshotManager = new SnapshotManager(this.#serviceReferenceManager);
    }
    bind(serviceIdentifier) {
        return this.#bindingManager.bind(serviceIdentifier);
    }
    get(serviceIdentifier, options) {
        return this.#serviceResolutionManager.get(serviceIdentifier, options);
    }
    getAll(serviceIdentifier, options) {
        return this.#serviceResolutionManager.getAll(serviceIdentifier, options);
    }
    async getAllAsync(serviceIdentifier, options) {
        return this.#serviceResolutionManager.getAllAsync(serviceIdentifier, options);
    }
    async getAsync(serviceIdentifier, options) {
        return this.#serviceResolutionManager.getAsync(serviceIdentifier, options);
    }
    isBound(serviceIdentifier, options) {
        return this.#bindingManager.isBound(serviceIdentifier, options);
    }
    isCurrentBound(serviceIdentifier, options) {
        return this.#bindingManager.isCurrentBound(serviceIdentifier, options);
    }
    async loadAsync(...modules) {
        return this.#containerModuleManager.loadAsync(...modules);
    }
    load(...modules) {
        this.#containerModuleManager.load(...modules);
    }
    onActivation(serviceIdentifier, activation) {
        this.#serviceReferenceManager.activationService.add(activation, {
            serviceId: serviceIdentifier,
        });
    }
    onDeactivation(serviceIdentifier, deactivation) {
        this.#serviceReferenceManager.deactivationService.add(deactivation, {
            serviceId: serviceIdentifier,
        });
    }
    register(pluginConstructor) {
        this.#pluginManager.register(this, pluginConstructor);
    }
    restore() {
        this.#snapshotManager.restore();
    }
    async rebindAsync(serviceIdentifier) {
        return this.#bindingManager.rebindAsync(serviceIdentifier);
    }
    rebind(serviceIdentifier) {
        return this.#bindingManager.rebind(serviceIdentifier);
    }
    snapshot() {
        this.#snapshotManager.snapshot();
    }
    async unbindAsync(identifier) {
        await this.#bindingManager.unbindAsync(identifier);
    }
    async unbindAllAsync() {
        await this.#bindingManager.unbindAllAsync();
    }
    unbindAll() {
        this.#bindingManager.unbindAll();
    }
    unbind(identifier) {
        this.#bindingManager.unbind(identifier);
    }
    async unloadAsync(...modules) {
        return this.#containerModuleManager.unloadAsync(...modules);
    }
    unload(...modules) {
        this.#containerModuleManager.unload(...modules);
    }
    #buildAutobindOptions(autobind, defaultScope) {
        if (autobind) {
            return { scope: defaultScope };
        }
        return undefined;
    }
    #buildServiceReferenceManager(options, autobind, defaultScope, jitless) {
        const autobindOptions = this.#buildAutobindOptions(autobind, defaultScope);
        if (options?.parent === undefined) {
            return new ServiceReferenceManager(ActivationsService.build(() => undefined), BindingService.build(() => undefined, autobindOptions), DeactivationsService.build(() => undefined), new PlanResultCacheService(!jitless));
        }
        const planResultCacheService = new PlanResultCacheService(!jitless);
        const parent = options.parent;
        parent.#serviceReferenceManager.planResultCacheService.subscribe(planResultCacheService);
        return new ServiceReferenceManager(ActivationsService.build(() => parent.#serviceReferenceManager.activationService), BindingService.build(() => parent.#serviceReferenceManager.bindingService, autobindOptions), DeactivationsService.build(() => parent.#serviceReferenceManager.deactivationService), planResultCacheService);
    }
}
//# sourceMappingURL=Container.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/@inversifyjs+container@3.1.3_reflect-metadata@0.2.2/node_modules/@inversifyjs/container/lib/index.js






//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ../../node_modules/.pnpm/inversify@8.2.3_reflect-metadata@0.2.2/node_modules/inversify/lib/index.js



//# sourceMappingURL=index.js.map
// EXTERNAL MODULE: ../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.js
var eventemitter3 = __webpack_require__(685);
;// CONCATENATED MODULE: ../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.mjs



/* export default */ const node_modules_eventemitter3 = (eventemitter3);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isObject.js
/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject_isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/* export default */ const lodash_es_isObject = (isObject_isObject);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_freeGlobal.js
/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/* export default */ const _freeGlobal = (freeGlobal);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_root.js


/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var _root_root = _freeGlobal || freeSelf || Function('return this')();

/* export default */ const _root = (_root_root);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Symbol.js


/** Built-in value references. */
var _Symbol_Symbol = _root.Symbol;

/* export default */ const _Symbol = (_Symbol_Symbol);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getRawTag.js


/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var _getRawTag_hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = _getRawTag_hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

/* export default */ const _getRawTag = (getRawTag);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_objectToString.js
/** Used for built-in method references. */
var _objectToString_objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var _objectToString_nativeObjectToString = _objectToString_objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return _objectToString_nativeObjectToString.call(value);
}

/* export default */ const _objectToString = (objectToString);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseGetTag.js




/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var _baseGetTag_symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (_baseGetTag_symToStringTag && _baseGetTag_symToStringTag in Object(value))
    ? _getRawTag(value)
    : _objectToString(value);
}

/* export default */ const _baseGetTag = (baseGetTag);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isFunction.js



/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction_isFunction(value) {
  if (!lodash_es_isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = _baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/* export default */ const lodash_es_isFunction = (isFunction_isFunction);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/utils/consts.ts
// Generated by scripts/generate.mts. Do not edit.

const schemaDefinitions = {
    AccountCandidate: {
        type: 'object',
        properties: {
            user: {
                $ref: '#/$defs/PublicAccountUser'
            }
        },
        additionalProperties: false,
        required: [
            'user'
        ]
    },
    AccountEventOrigin: {
        type: 'string',
        enum: [
            'current-context',
            'external-context'
        ]
    },
    AccountSignInEvent: {
        type: 'object',
        properties: {
            origin: {
                $ref: '#/$defs/AccountEventOrigin'
            },
            accountId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'origin',
            'accountId'
        ]
    },
    AccountSignOutEvent: {
        type: 'object',
        properties: {
            origin: {
                $ref: '#/$defs/AccountEventOrigin'
            },
            accountId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'origin'
        ]
    },
    AccountSnapshot: {
        anyOf: [
            {
                $ref: '#/$defs/SignedOutAccountSnapshot'
            },
            {
                $ref: '#/$defs/SignedInAccountSnapshot'
            }
        ]
    },
    AccountSwitchEvent: {
        type: 'object',
        properties: {
            origin: {
                $ref: '#/$defs/AccountEventOrigin'
            },
            previousAccountId: {
                type: 'string'
            },
            accountId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'origin',
            'accountId'
        ]
    },
    AnchorRect: {
        type: 'object',
        properties: {
            x: {
                type: 'number'
            },
            y: {
                type: 'number'
            },
            width: {
                type: 'number'
            },
            height: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'x',
            'y',
            'width',
            'height'
        ]
    },
    AudioCaptureFailedEvent: {
        type: 'object',
        properties: {
            runId: {
                type: 'string',
                pattern: '^\\S(?:[\\s\\S]*\\S)?$'
            },
            code: {
                $ref: '#/$defs/AudioCaptureFailureCode'
            }
        },
        additionalProperties: false,
        required: [
            'runId',
            'code'
        ]
    },
    AudioCaptureFailureCode: {
        type: 'string',
        enum: [
            'UNAVAILABLE',
            'RESOURCE_EXHAUSTED',
            'INTERNAL'
        ]
    },
    AudioCaptureHealth: {
        type: 'string',
        enum: [
            'healthy',
            'silent'
        ]
    },
    AudioCaptureHealthChangedEvent: {
        type: 'object',
        properties: {
            runId: {
                type: 'string'
            },
            health: {
                $ref: '#/$defs/AudioCaptureHealth'
            }
        },
        additionalProperties: false,
        required: [
            'runId',
            'health'
        ]
    },
    AudioCaptureState: {
        type: 'object',
        properties: {
            status: {
                $ref: '#/$defs/AudioCaptureStatus'
            },
            runId: {
                type: 'string',
                pattern: '^\\S(?:[\\s\\S]*\\S)?$'
            },
            pendingPersistence: {
                anyOf: [
                    {
                        const: false
                    },
                    {
                        const: true
                    }
                ]
            }
        },
        additionalProperties: false,
        required: [
            'status'
        ],
        allOf: [
            {
                if: {
                    properties: {
                        status: {
                            const: 'capturing'
                        }
                    },
                    required: [
                        'status'
                    ]
                },
                then: {
                    required: [
                        'runId'
                    ]
                },
                else: {
                    not: {
                        anyOf: [
                            {
                                required: [
                                    'runId'
                                ]
                            },
                            {
                                required: [
                                    'pendingPersistence'
                                ]
                            }
                        ]
                    }
                }
            }
        ]
    },
    AudioCaptureStatus: {
        type: 'string',
        enum: [
            'idle',
            'capturing'
        ]
    },
    AudioLevelChangedEvent: {
        type: 'object',
        properties: {
            runId: {
                type: 'string',
                pattern: '^\\S(?:[\\s\\S]*\\S)?$'
            },
            level: {
                type: 'number',
                minimum: 0,
                maximum: 1
            }
        },
        additionalProperties: false,
        required: [
            'runId',
            'level'
        ]
    },
    AudioSegmentCompletedEvent: {
        type: 'object',
        properties: {
            runId: {
                type: 'string',
                pattern: '^\\S(?:[\\s\\S]*\\S)?$'
            },
            sequenceNo: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
            },
            fileName: {
                type: 'string',
                pattern: '^(?!\\.{1,2}$)[^/\\\\]+$'
            },
            capturedAtEpochMs: {
                type: 'number',
                minimum: 0,
                maximum: 9007199254740991
            },
            deviceMonotonicStartMs: {
                type: 'number',
                minimum: 0,
                maximum: 9007199254740991
            },
            durationMs: {
                type: 'number',
                minimum: 0,
                maximum: 9007199254740991
            },
            contentType: {
                anyOf: [
                    {
                        const: 'audio/flac'
                    },
                    {
                        const: 'audio/ogg'
                    }
                ]
            },
            contentLength: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
            },
            contentSha256: {
                type: 'string',
                pattern: '^[0-9a-f]{64}$'
            }
        },
        additionalProperties: false,
        required: [
            'runId',
            'sequenceNo',
            'fileName',
            'capturedAtEpochMs',
            'deviceMonotonicStartMs',
            'durationMs',
            'contentType',
            'contentLength',
            'contentSha256'
        ]
    },
    CancelToolTaskParams: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'taskId'
        ]
    },
    ClientRuntimeHost: {
        type: 'string',
        enum: [
            'browser',
            'electron'
        ]
    },
    ClientRuntimeInfo: {
        type: 'object',
        properties: {
            host: {
                $ref: '#/$defs/ClientRuntimeHost'
            },
            platform: {
                $ref: '#/$defs/ClientRuntimePlatform'
            },
            surface: {
                $ref: '#/$defs/ClientRuntimeSurface'
            }
        },
        additionalProperties: false,
        required: [
            'host',
            'platform',
            'surface'
        ]
    },
    ClientRuntimePlatform: {
        type: 'string',
        enum: [
            'web',
            'macos',
            'windows',
            'linux'
        ]
    },
    ClientRuntimeSurface: {
        type: 'string',
        enum: [
            'web',
            'app-shell',
            'quick-chat'
        ]
    },
    'cpi.account.applyAccountState.params': {
        $ref: '#/$defs/NativeAccountState'
    },
    'cpi.account.applyAccountState.result': {
        type: 'null'
    },
    'cpi.audio.captureFailed.event': {
        $ref: '#/$defs/AudioCaptureFailedEvent'
    },
    'cpi.audio.getState.result': {
        $ref: '#/$defs/AudioCaptureState'
    },
    'cpi.audio.healthChanged.event': {
        $ref: '#/$defs/AudioCaptureHealthChangedEvent'
    },
    'cpi.audio.levelChanged.event': {
        $ref: '#/$defs/AudioLevelChangedEvent'
    },
    'cpi.audio.segmentCompleted.event': {
        $ref: '#/$defs/AudioSegmentCompletedEvent'
    },
    'cpi.audio.startCapture.params': {
        $ref: '#/$defs/StartAudioCaptureParams'
    },
    'cpi.audio.startCapture.result': {
        type: 'null'
    },
    'cpi.audio.stateChanged.event': {
        $ref: '#/$defs/AudioCaptureState'
    },
    'cpi.audio.stopCapture.result': {
        anyOf: [
            {
                type: 'null'
            },
            {
                $ref: '#/$defs/AudioSegmentCompletedEvent'
            }
        ]
    },
    'cpi.deviceConnectors.changed.event': {
        $ref: '#/$defs/DeviceConnectorChangedEvent'
    },
    'cpi.deviceConnectors.readSnapshot.params': {
        $ref: '#/$defs/ReadDeviceConnectorSnapshotParams'
    },
    'cpi.deviceConnectors.readSnapshot.result': {
        $ref: '#/$defs/DeviceConnectorSnapshotResult'
    },
    'cpi.macos.modifierGestureTriggered.event': {
        $ref: '#/$defs/MacOSModifierGestureTriggeredEvent'
    },
    'cpi.macos.openWebAuthenticationSession.params': {
        $ref: '#/$defs/OpenWebAuthenticationSessionParams'
    },
    'cpi.macos.openWebAuthenticationSession.result': {
        $ref: '#/$defs/WebAuthenticationSessionResult'
    },
    'cpi.macos.readLegacyQuickChatShortcut.result': {
        anyOf: [
            {
                type: 'null'
            },
            {
                $ref: '#/$defs/MacOSLegacyQuickChatShortcut'
            }
        ]
    },
    'cpi.macos.registerModifierGesture.params': {
        $ref: '#/$defs/RegisterMacOSModifierGestureParams'
    },
    'cpi.macos.registerModifierGesture.result': {
        type: 'null'
    },
    'cpi.macos.showStatusMenu.params': {
        $ref: '#/$defs/ShowMacOSStatusMenuParams'
    },
    'cpi.macos.showStatusMenu.result': {
        anyOf: [
            {
                type: 'null'
            },
            {
                type: 'string'
            }
        ]
    },
    'cpi.macos.unregisterModifierGesture.params': {
        $ref: '#/$defs/UnregisterMacOSModifierGestureParams'
    },
    'cpi.macos.unregisterModifierGesture.result': {
        type: 'null'
    },
    'cpi.permissions.changed.event': {
        $ref: '#/$defs/PermissionInfo'
    },
    'cpi.permissions.getPermissionInfo.params': {
        $ref: '#/$defs/PermissionParams'
    },
    'cpi.permissions.getPermissionInfo.result': {
        $ref: '#/$defs/PermissionInfo'
    },
    'cpi.permissions.listPermissions.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/PermissionInfo'
        }
    },
    'cpi.permissions.performPermissionAction.params': {
        $ref: '#/$defs/PerformPermissionActionParams'
    },
    'cpi.permissions.performPermissionAction.result': {
        type: 'null'
    },
    'cpi.system.getDeviceInfo.result': {
        $ref: '#/$defs/DeviceInfo'
    },
    'cpi.system.getPreventSleepWhileRunning.result': {
        type: 'boolean'
    },
    'cpi.system.getSystemInfo.result': {
        $ref: '#/$defs/SystemInfo'
    },
    'cpi.system.isPreventSleepWhileRunningSupported.result': {
        type: 'boolean'
    },
    'cpi.system.scanFileInventory.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/FileInventorySnapshot'
        }
    },
    'cpi.system.setPreventSleepWhileRunning.params': {
        $ref: '#/$defs/SetPreventSleepWhileRunningParams'
    },
    'cpi.system.setPreventSleepWhileRunning.result': {
        type: 'null'
    },
    'cpi.tools.cancelTask.params': {
        $ref: '#/$defs/CancelToolTaskParams'
    },
    'cpi.tools.cancelTask.result': {
        type: 'null'
    },
    'cpi.tools.catalogChanged.event': {
        type: 'array',
        items: {
            $ref: '#/$defs/ToolSummary'
        }
    },
    'cpi.tools.getRunningTasks.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/ToolTaskSummary'
        }
    },
    'cpi.tools.getTaskInfo.params': {
        $ref: '#/$defs/GetToolTaskInfoParams'
    },
    'cpi.tools.getTaskInfo.result': {
        $ref: '#/$defs/ToolTaskInfo'
    },
    'cpi.tools.getToolInfo.params': {
        $ref: '#/$defs/GetToolInfoParams'
    },
    'cpi.tools.getToolInfo.result': {
        $ref: '#/$defs/ToolInfo'
    },
    'cpi.tools.listToolRegistrations.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/NativeToolRegistrationInfo'
        }
    },
    'cpi.tools.listTools.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/ToolSummary'
        }
    },
    'cpi.tools.startTask.params': {
        $ref: '#/$defs/StartToolTaskParams'
    },
    'cpi.tools.startTask.result': {
        type: 'string'
    },
    'cpi.tools.taskChanged.event': {
        $ref: '#/$defs/ToolTaskSummary'
    },
    'cpi.windows.dismissStatusMenu.result': {
        type: 'null'
    },
    'cpi.windows.showStatusMenu.params': {
        $ref: '#/$defs/ShowWindowsStatusMenuParams'
    },
    'cpi.windows.showStatusMenu.result': {
        anyOf: [
            {
                type: 'null'
            },
            {
                type: 'string'
            }
        ]
    },
    CpuArchitecture: {
        type: 'string',
        enum: [
            'arm64',
            'x64',
            'other'
        ]
    },
    DebugSocketConnectionStatus: {
        type: 'string',
        enum: [
            'idle',
            'connecting',
            'connected',
            'reconnecting',
            'unauthorized',
            'closed',
            'error'
        ]
    },
    DebugSocketDirection: {
        type: 'string',
        enum: [
            'incoming',
            'outgoing',
            'internal'
        ]
    },
    DebugSocketRecord: {
        type: 'object',
        properties: {
            direction: {
                $ref: '#/$defs/DebugSocketDirection'
            },
            type: {
                type: 'string'
            },
            timestamp: {
                type: 'string'
            },
            source: {
                $ref: '#/$defs/DebugSocketSource'
            },
            payload: {
                $ref: '#/$defs/JsonValue'
            },
            detail: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'direction',
            'type',
            'timestamp'
        ]
    },
    DebugSocketSource: {
        type: 'string',
        enum: [
            'classic',
            'shared-client',
            'shared-worker'
        ]
    },
    DebugSocketState: {
        type: 'object',
        properties: {
            transport: {
                $ref: '#/$defs/DebugSocketTransport'
            },
            preferredTransport: {
                $ref: '#/$defs/DebugSocketTransport'
            },
            status: {
                $ref: '#/$defs/DebugSocketConnectionStatus'
            },
            workerStatus: {
                $ref: '#/$defs/DebugSocketWorkerStatus'
            },
            offline: {
                type: 'boolean'
            },
            packetLoss: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'transport',
            'preferredTransport',
            'status',
            'workerStatus',
            'offline',
            'packetLoss'
        ]
    },
    DebugSocketTransport: {
        type: 'string',
        enum: [
            'classic',
            'shared'
        ]
    },
    DebugSocketWorkerStatus: {
        type: 'string',
        enum: [
            'idle',
            'connecting',
            'connected',
            'reconnecting',
            'fallback',
            'unavailable',
            'closed',
            'error'
        ]
    },
    DeviceConnectorCapability: {
        type: 'string',
        enum: [
            'calendar.events.list',
            'reminders.list'
        ]
    },
    DeviceConnectorChangedEvent: {
        type: 'object',
        properties: {
            capability: {
                $ref: '#/$defs/DeviceConnectorCapability'
            }
        },
        additionalProperties: false,
        required: [
            'capability'
        ]
    },
    DeviceConnectorCoverage: {
        type: 'object',
        properties: {
            start: {
                type: 'string'
            },
            end: {
                type: 'string'
            },
            timeZone: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'start',
            'end',
            'timeZone'
        ]
    },
    DeviceConnectorIdentityLostResult: {
        type: 'object',
        properties: {
            outcome: {
                const: 'identity-lost'
            },
            capability: {
                $ref: '#/$defs/DeviceConnectorCapability'
            }
        },
        additionalProperties: false,
        required: [
            'outcome',
            'capability'
        ]
    },
    DeviceConnectorSnapshot: {
        type: 'object',
        properties: {
            capturedAt: {
                type: 'number'
            },
            items: {
                type: 'array',
                items: {
                    $ref: '#/$defs/DeviceConnectorSnapshotItem'
                }
            },
            outsideCoverageCount: {
                type: 'number'
            },
            unusableCount: {
                type: 'number'
            },
            truncationCount: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'capturedAt',
            'items',
            'outsideCoverageCount',
            'unusableCount',
            'truncationCount'
        ]
    },
    DeviceConnectorSnapshotItem: {
        type: 'object',
        properties: {
            key: {
                type: 'string'
            },
            payload: {
                $ref: '#/$defs/JsonValue'
            }
        },
        additionalProperties: false,
        required: [
            'key',
            'payload'
        ]
    },
    DeviceConnectorSnapshotReadResult: {
        type: 'object',
        properties: {
            outcome: {
                const: 'snapshot'
            },
            snapshot: {
                $ref: '#/$defs/DeviceConnectorSnapshot'
            }
        },
        additionalProperties: false,
        required: [
            'outcome',
            'snapshot'
        ]
    },
    DeviceConnectorSnapshotResult: {
        anyOf: [
            {
                $ref: '#/$defs/DeviceConnectorSnapshotReadResult'
            },
            {
                $ref: '#/$defs/DeviceConnectorIdentityLostResult'
            }
        ]
    },
    DeviceInfo: {
        type: 'object',
        properties: {
            displayName: {
                type: 'string'
            },
            model: {
                type: 'string'
            },
            installationId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'displayName',
            'installationId'
        ]
    },
    FeatureDebugInfo: {
        type: 'object',
        properties: {
            label: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'label'
        ]
    },
    FeatureInfo: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            value: {
                $ref: '#/$defs/FeatureValue'
            },
            debug: {
                $ref: '#/$defs/FeatureDebugInfo'
            },
            defaultValue: {
                $ref: '#/$defs/FeatureValue'
            },
            overrideValue: {
                $ref: '#/$defs/FeatureValue'
            }
        },
        additionalProperties: false,
        required: [
            'id',
            'value'
        ]
    },
    FeatureParams: {
        type: 'object',
        properties: {
            featureId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'featureId'
        ]
    },
    FeatureValue: {
        anyOf: [
            {
                type: 'null'
            },
            {
                type: 'string'
            },
            {
                type: 'number'
            },
            {
                const: false
            },
            {
                const: true
            },
            {
                type: 'array',
                items: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            }
        ]
    },
    FileInventoryEntry: {
        type: 'object',
        properties: {
            name: {
                type: 'string'
            },
            path: {
                type: 'string'
            },
            kind: {
                $ref: '#/$defs/FileInventoryEntryKind'
            },
            size: {
                type: 'number'
            },
            children: {
                type: 'array',
                items: {
                    $ref: '#/$defs/FileInventoryEntry'
                }
            },
            omittedChildCount: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'path',
            'kind'
        ]
    },
    FileInventoryEntryKind: {
        anyOf: [
            {
                const: 'file'
            },
            {
                const: 'other'
            },
            {
                const: 'directory'
            }
        ]
    },
    FileInventoryEvidence: {
        type: 'object',
        properties: {
            totalEntryCount: {
                type: 'number'
            },
            topLevelEntryCount: {
                type: 'number'
            },
            truncatedEntryCount: {
                type: 'number'
            },
            failedDirectoryCount: {
                type: 'number'
            },
            listedDirectoryCount: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'totalEntryCount',
            'topLevelEntryCount',
            'truncatedEntryCount',
            'failedDirectoryCount',
            'listedDirectoryCount'
        ]
    },
    FileInventorySnapshot: {
        type: 'object',
        properties: {
            root: {
                $ref: '#/$defs/ToolFileRoot'
            },
            strategy: {
                $ref: '#/$defs/FileInventoryStrategy'
            },
            evidence: {
                $ref: '#/$defs/FileInventoryEvidence'
            },
            tree: {
                $ref: '#/$defs/FileInventoryEntry'
            }
        },
        additionalProperties: false,
        required: [
            'root',
            'strategy',
            'evidence',
            'tree'
        ]
    },
    FileInventoryStrategy: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            root: {
                type: 'string'
            },
            depth: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'id',
            'root'
        ]
    },
    GetToolInfoParams: {
        type: 'object',
        properties: {
            toolId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'toolId'
        ]
    },
    GetToolTaskInfoParams: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'taskId'
        ]
    },
    InterfaceDescriptor: {
        type: 'object',
        properties: {
            kind: {
                $ref: '#/$defs/InterfaceKind'
            },
            contractVersion: {
                type: 'string',
                pattern: '^\\d+\\.\\d+\\.\\d+$'
            },
            modules: {
                type: 'array',
                items: {
                    $ref: '#/$defs/ModuleDescriptor'
                }
            }
        },
        additionalProperties: false,
        required: [
            'kind',
            'contractVersion',
            'modules'
        ]
    },
    InterfaceErrorCode: {
        type: 'string',
        enum: [
            'UNSUPPORTED',
            'UNAVAILABLE',
            'INVALID_ARGUMENT',
            'NOT_FOUND',
            'AUTH_REQUIRED',
            'PERMISSION_REQUIRED',
            'PERMISSION_DENIED',
            'PERMISSION_SETTINGS_OPENED',
            'CONFLICT',
            'CANCELLED',
            'DEADLINE_EXCEEDED',
            'RESOURCE_EXHAUSTED',
            'NETWORK_ERROR',
            'INTERNAL'
        ]
    },
    InterfaceErrorData: {
        type: 'object',
        properties: {
            code: {
                $ref: '#/$defs/InterfaceErrorCode'
            },
            message: {
                type: 'string'
            },
            permissionId: {
                type: 'string',
                pattern: '^\\S(?:[\\s\\S]*\\S)?$'
            }
        },
        additionalProperties: false,
        required: [
            'code',
            'message'
        ],
        allOf: [
            {
                if: {
                    properties: {
                        code: {
                            enum: [
                                'PERMISSION_REQUIRED',
                                'PERMISSION_DENIED',
                                'PERMISSION_SETTINGS_OPENED'
                            ]
                        }
                    },
                    required: [
                        'code'
                    ]
                },
                then: {
                    required: [
                        'permissionId'
                    ]
                },
                else: {
                    not: {
                        required: [
                            'permissionId'
                        ]
                    }
                }
            }
        ]
    },
    InterfaceKind: {
        type: 'string',
        enum: [
            'WEI',
            'CPI',
            'NEI'
        ]
    },
    JsonPrimitive: {
        anyOf: [
            {
                type: 'null'
            },
            {
                type: 'string'
            },
            {
                type: 'number'
            },
            {
                const: false
            },
            {
                const: true
            }
        ]
    },
    JsonValue: {
        anyOf: [
            {
                type: 'null'
            },
            {
                type: 'string'
            },
            {
                type: 'number'
            },
            {
                const: false
            },
            {
                const: true
            },
            {
                type: 'array',
                items: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            }
        ]
    },
    KeyCombinationShortcutBinding: {
        type: 'object',
        properties: {
            kind: {
                const: 'key-combination'
            },
            code: {
                type: 'string'
            },
            modifiers: {
                type: 'array',
                items: {
                    $ref: '#/$defs/ShortcutModifier'
                }
            }
        },
        additionalProperties: false,
        required: [
            'code',
            'modifiers'
        ]
    },
    LocalLogUploadStatus: {
        type: 'string',
        enum: [
            'uploading',
            'completed',
            'failed'
        ]
    },
    LogLevel: {
        type: 'string',
        enum: [
            'error',
            'warning',
            'info',
            'log'
        ]
    },
    MacOSLegacyQuickChatShortcut: {
        type: 'object',
        properties: {
            option: {
                $ref: '#/$defs/MacOSLegacyQuickChatShortcutOption'
            },
            customBinding: {
                $ref: '#/$defs/KeyCombinationShortcutBinding'
            }
        },
        additionalProperties: false,
        required: [
            'option'
        ]
    },
    MacOSLegacyQuickChatShortcutOption: {
        type: 'string',
        enum: [
            'double-option',
            'option-space',
            'custom',
            'no-shortcut'
        ]
    },
    MacOSModifierGestureTriggeredEvent: {
        type: 'object',
        properties: {
            gestureId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'gestureId'
        ]
    },
    MetricAttributes: {
        type: 'object',
        properties: {},
        additionalProperties: {
            $ref: '#/$defs/MetricAttributeValue'
        }
    },
    MetricAttributeValue: {
        anyOf: [
            {
                type: 'string'
            },
            {
                type: 'number'
            },
            {
                const: false
            },
            {
                const: true
            }
        ]
    },
    MetricPoint: {
        type: 'object',
        properties: {
            name: {
                type: 'string'
            },
            type: {
                anyOf: [
                    {
                        const: 'counter'
                    },
                    {
                        const: 'gauge'
                    },
                    {
                        const: 'distribution'
                    }
                ]
            },
            value: {
                type: 'number'
            },
            unit: {
                type: 'string'
            },
            attributes: {
                $ref: '#/$defs/MetricAttributes'
            }
        },
        additionalProperties: false,
        required: [
            'name',
            'type',
            'value'
        ]
    },
    ModifierChordShortcutBinding: {
        type: 'object',
        properties: {
            kind: {
                const: 'modifier-chord'
            },
            keys: {
                type: 'array',
                items: {
                    $ref: '#/$defs/PhysicalModifierKey'
                }
            }
        },
        additionalProperties: false,
        required: [
            'kind',
            'keys'
        ]
    },
    ModifierDoubleTapShortcutBinding: {
        type: 'object',
        properties: {
            kind: {
                const: 'modifier-double-tap'
            },
            modifier: {
                $ref: '#/$defs/ShortcutModifier'
            },
            side: {
                $ref: '#/$defs/ModifierDoubleTapSide'
            }
        },
        additionalProperties: false,
        required: [
            'kind',
            'modifier',
            'side'
        ]
    },
    ModifierDoubleTapSide: {
        type: 'string',
        enum: [
            'left',
            'right',
            'either'
        ]
    },
    ModifierGestureShortcutBinding: {
        anyOf: [
            {
                $ref: '#/$defs/ModifierDoubleTapShortcutBinding'
            },
            {
                $ref: '#/$defs/ModifierChordShortcutBinding'
            }
        ]
    },
    ModuleAvailability: {
        type: 'string',
        enum: [
            'available',
            'unsupported'
        ]
    },
    ModuleDescriptor: {
        type: 'object',
        properties: {
            name: {
                type: 'string'
            },
            version: {
                type: 'string',
                pattern: '^\\d+\\.\\d+\\.\\d+$'
            },
            availability: {
                $ref: '#/$defs/ModuleAvailability'
            }
        },
        additionalProperties: false,
        required: [
            'name',
            'version',
            'availability'
        ]
    },
    NativeAccountState: {
        anyOf: [
            {
                $ref: '#/$defs/NativeSignedOutAccountState'
            },
            {
                $ref: '#/$defs/NativeSignedInAccountState'
            }
        ]
    },
    NativeAuthContext: {
        type: 'object',
        properties: {
            accessToken: {
                type: 'string'
            },
            expiresAt: {
                type: 'number'
            },
            accountId: {
                type: 'string'
            },
            environment: {
                $ref: '#/$defs/RuntimeEnvironment'
            },
            trafficLane: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'accessToken',
            'expiresAt',
            'accountId',
            'environment'
        ]
    },
    NativeSignedInAccountState: {
        type: 'object',
        properties: {
            status: {
                const: 'signed-in'
            },
            accountId: {
                type: 'string'
            },
            environment: {
                $ref: '#/$defs/RuntimeEnvironment'
            },
            sessionEpoch: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'status',
            'accountId',
            'environment',
            'sessionEpoch'
        ]
    },
    NativeSignedOutAccountState: {
        type: 'object',
        properties: {
            status: {
                const: 'signed-out'
            },
            sessionEpoch: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'status',
            'sessionEpoch'
        ]
    },
    NativeToolInvocationCancellation: {
        type: 'object',
        properties: {
            invocationId: {
                type: 'string'
            },
            reason: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'invocationId'
        ]
    },
    NativeToolInvocationError: {
        type: 'object',
        properties: {
            code: {
                type: 'string'
            },
            message: {
                type: 'string'
            },
            details: {
                $ref: '#/$defs/JsonValue'
            }
        },
        additionalProperties: false,
        required: [
            'code',
            'message'
        ]
    },
    NativeToolInvocationRequest: {
        type: 'object',
        properties: {
            invocationId: {
                type: 'string'
            },
            capabilityId: {
                type: 'string'
            },
            arguments: {
                $ref: '#/$defs/JsonValue'
            },
            timeoutMs: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'invocationId',
            'capabilityId',
            'arguments'
        ]
    },
    NativeToolInvocationResult: {
        type: 'object',
        properties: {
            invocationId: {
                type: 'string'
            },
            success: {
                type: 'boolean'
            },
            data: {
                $ref: '#/$defs/JsonValue'
            },
            error: {
                $ref: '#/$defs/NativeToolInvocationError'
            }
        },
        additionalProperties: false,
        required: [
            'invocationId',
            'success'
        ]
    },
    NativeToolInvocationResultAcknowledgement: {
        type: 'object',
        properties: {
            invocationId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'invocationId'
        ]
    },
    NativeToolPendingInvocation: {
        type: 'object',
        properties: {
            invocationId: {
                type: 'string'
            },
            capabilityId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'invocationId',
            'capabilityId'
        ]
    },
    NativeToolPendingInvocationResultsRequest: {
        type: 'object',
        properties: {
            invocations: {
                type: 'array',
                items: {
                    $ref: '#/$defs/NativeToolPendingInvocation'
                }
            }
        },
        additionalProperties: false,
        required: [
            'invocations'
        ]
    },
    NativeToolRegistrationInfo: {
        type: 'object',
        properties: {
            version: {
                type: 'string'
            },
            riskLevel: {
                $ref: '#/$defs/ToolRiskLevel'
            },
            enabled: {
                type: 'boolean'
            },
            parent: {
                type: 'string'
            },
            inputSchema: {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            outputSchema: {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            id: {
                type: 'string'
            },
            description: {
                type: 'string'
            },
            availability: {
                $ref: '#/$defs/ToolAvailabilityState'
            }
        },
        additionalProperties: false,
        required: [
            'version',
            'riskLevel',
            'enabled',
            'inputSchema',
            'outputSchema',
            'id',
            'description',
            'availability'
        ]
    },
    'nei.account.getFreshAuthContext.result': {
        anyOf: [
            {
                type: 'null'
            },
            {
                $ref: '#/$defs/NativeAuthContext'
            }
        ]
    },
    'nei.features.changed.event': {
        $ref: '#/$defs/FeatureInfo'
    },
    'nei.features.getFeature.params': {
        $ref: '#/$defs/FeatureParams'
    },
    'nei.features.getFeature.result': {
        $ref: '#/$defs/FeatureInfo'
    },
    'nei.features.listFeatures.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/FeatureInfo'
        }
    },
    'nei.features.resetOverrides.result': {
        type: 'null'
    },
    'nei.features.setOverrideValue.params': {
        $ref: '#/$defs/SetFeatureOverrideParams'
    },
    'nei.features.setOverrideValue.result': {
        type: 'null'
    },
    'nei.logs.push.params': {
        $ref: '#/$defs/PushLogParams'
    },
    'nei.logs.push.result': {
        type: 'null'
    },
    'nei.logs.pushMetrics.params': {
        $ref: '#/$defs/PushMetricsParams'
    },
    'nei.logs.pushMetrics.result': {
        type: 'null'
    },
    'nei.logs.uploadLocal.result': {
        type: 'null'
    },
    'nei.logs.uploadProgressChanged.event': {
        type: 'number',
        minimum: 0,
        maximum: 1
    },
    'nei.logs.uploadStatusChanged.event': {
        $ref: '#/$defs/LocalLogUploadStatus'
    },
    'nei.preferences.changed.event': {
        $ref: '#/$defs/PreferenceInfo'
    },
    'nei.preferences.listPreferences.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/PreferenceInfo'
        }
    },
    'nei.preferences.setPreferenceValue.params': {
        $ref: '#/$defs/SetPreferenceValueParams'
    },
    'nei.preferences.setPreferenceValue.result': {
        type: 'null'
    },
    'nei.shortcuts.changed.event': {
        $ref: '#/$defs/ShortcutInfo'
    },
    'nei.shortcuts.listShortcuts.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/ShortcutInfo'
        }
    },
    'nei.shortcuts.setShortcutBinding.params': {
        $ref: '#/$defs/SetShortcutBindingParams'
    },
    'nei.shortcuts.setShortcutBinding.result': {
        type: 'null'
    },
    'nei.shortcuts.triggered.event': {
        $ref: '#/$defs/ShortcutTriggeredEvent'
    },
    'nei.tools.completeInvocation.params': {
        $ref: '#/$defs/NativeToolInvocationResult'
    },
    'nei.tools.completeInvocation.result': {
        type: 'null'
    },
    'nei.tools.invocationCancelled.event': {
        $ref: '#/$defs/NativeToolInvocationCancellation'
    },
    'nei.tools.invocationRequested.event': {
        $ref: '#/$defs/NativeToolInvocationRequest'
    },
    'nei.tools.invocationResultAcknowledged.event': {
        $ref: '#/$defs/NativeToolInvocationResultAcknowledgement'
    },
    'nei.tools.pendingInvocationResultsRequested.event': {
        $ref: '#/$defs/NativeToolPendingInvocationResultsRequest'
    },
    OpenExternalParams: {
        type: 'object',
        properties: {
            url: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'url'
        ]
    },
    OpenShellWebAuthenticationSessionParams: {
        type: 'object',
        properties: {
            authorizationUrl: {
                type: 'string'
            },
            callbackTarget: {
                $ref: '#/$defs/WebAuthenticationCallbackTarget'
            }
        },
        additionalProperties: false,
        required: [
            'authorizationUrl',
            'callbackTarget'
        ]
    },
    OpenWebAuthenticationSessionParams: {
        type: 'object',
        properties: {
            authorizationUrl: {
                type: 'string'
            },
            callbackScheme: {
                const: 'today-connector'
            },
            timeoutMs: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
            }
        },
        additionalProperties: false,
        required: [
            'authorizationUrl',
            'callbackScheme',
            'timeoutMs'
        ]
    },
    PerformPermissionActionParams: {
        type: 'object',
        properties: {
            permissionId: {
                type: 'string'
            },
            action: {
                $ref: '#/$defs/PermissionAction'
            },
            sourceFrame: {
                $ref: '#/$defs/AnchorRect'
            }
        },
        additionalProperties: false,
        required: [
            'permissionId',
            'action'
        ]
    },
    PerformUpdateActionParams: {
        type: 'object',
        properties: {
            action: {
                $ref: '#/$defs/UpdateAction'
            }
        },
        additionalProperties: false,
        required: [
            'action'
        ]
    },
    PermissionAction: {
        type: 'string',
        enum: [
            'request',
            'open-settings'
        ]
    },
    PermissionInfo: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            state: {
                $ref: '#/$defs/PermissionState'
            },
            supportedActions: {
                type: 'array',
                items: {
                    $ref: '#/$defs/PermissionAction'
                }
            }
        },
        additionalProperties: false,
        required: [
            'id',
            'state',
            'supportedActions'
        ]
    },
    PermissionParams: {
        type: 'object',
        properties: {
            permissionId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'permissionId'
        ]
    },
    PermissionState: {
        type: 'string',
        enum: [
            'unknown',
            'not-determined',
            'granted',
            'limited',
            'denied',
            'restricted',
            'unavailable'
        ]
    },
    PhysicalModifierKey: {
        type: 'object',
        properties: {
            modifier: {
                $ref: '#/$defs/ShortcutModifier'
            },
            side: {
                $ref: '#/$defs/PhysicalModifierSide'
            }
        },
        additionalProperties: false,
        required: [
            'modifier',
            'side'
        ]
    },
    PhysicalModifierSide: {
        type: 'string',
        enum: [
            'left',
            'right'
        ]
    },
    PreferenceInfo: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            value: {
                $ref: '#/$defs/PreferenceValue'
            },
            debugOnly: {
                type: 'boolean'
            },
            available: {
                type: 'boolean'
            },
            writable: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'id',
            'value',
            'debugOnly',
            'available',
            'writable'
        ]
    },
    PreferenceValue: {
        anyOf: [
            {
                type: 'null'
            },
            {
                type: 'string'
            },
            {
                type: 'number'
            },
            {
                const: false
            },
            {
                const: true
            }
        ]
    },
    PublicAccountUser: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            displayName: {
                type: 'string'
            },
            email: {
                type: 'string'
            },
            avatarUrl: {
                type: 'string',
                pattern: '^https://'
            }
        },
        additionalProperties: false,
        required: [
            'id'
        ]
    },
    PushLogParams: {
        type: 'object',
        properties: {
            level: {
                $ref: '#/$defs/LogLevel'
            },
            id: {
                type: 'string'
            },
            payload: {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            issue: {
                anyOf: [
                    {
                        const: false
                    },
                    {
                        const: true
                    }
                ]
            },
            target: {
                anyOf: [
                    {
                        const: 'posthog'
                    },
                    {
                        const: 'sentry'
                    },
                    {
                        const: 'file'
                    },
                    {
                        const: 'console'
                    },
                    {
                        type: 'array',
                        items: {
                            $ref: '#/$defs/PushTarget'
                        }
                    }
                ]
            }
        },
        additionalProperties: false,
        required: [
            'level',
            'id'
        ]
    },
    PushMetricsParams: {
        type: 'object',
        properties: {
            metrics: {
                type: 'array',
                items: {
                    $ref: '#/$defs/MetricPoint'
                }
            },
            attributes: {
                $ref: '#/$defs/MetricAttributes'
            }
        },
        additionalProperties: false,
        required: [
            'metrics'
        ]
    },
    PushTarget: {
        type: 'string',
        enum: [
            'posthog',
            'sentry',
            'file',
            'console'
        ]
    },
    ReadDeviceConnectorSnapshotParams: {
        type: 'object',
        properties: {
            capability: {
                $ref: '#/$defs/DeviceConnectorCapability'
            },
            coverage: {
                $ref: '#/$defs/DeviceConnectorCoverage'
            }
        },
        additionalProperties: false,
        required: [
            'capability',
            'coverage'
        ]
    },
    RecordFailure: {
        type: 'object',
        properties: {
            reason: {
                $ref: '#/$defs/RecordFailureReason'
            },
            code: {
                $ref: '#/$defs/InterfaceErrorCode'
            },
            message: {
                type: 'string'
            },
            retryable: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'code',
            'message',
            'retryable'
        ]
    },
    RecordFailureReason: {
        type: 'string',
        enum: [
            'no-usable-speech',
            'capture-interrupted',
            'local-storage-pending',
            'upload-failed'
        ]
    },
    RecordPhase: {
        type: 'string',
        enum: [
            'idle',
            'starting',
            'recording',
            'paused',
            'processing',
            'failed'
        ]
    },
    RecordProcessingStage: {
        type: 'string',
        enum: [
            'finalizing',
            'uploading',
            'retrying',
            'sealing',
            'transcribing'
        ]
    },
    RecordStartType: {
        type: 'string',
        enum: [
            'direct',
            'wait-refocused',
            'loop'
        ]
    },
    RecordState: {
        type: 'object',
        properties: {
            revision: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
            },
            phase: {
                $ref: '#/$defs/RecordPhase'
            },
            durationMs: {
                type: 'number',
                minimum: 0,
                maximum: 9007199254740991
            },
            updatedAtEpochMs: {
                type: 'number',
                minimum: 0,
                maximum: 9007199254740991
            },
            level: {
                type: 'number',
                minimum: 0,
                maximum: 1
            },
            warning: {
                $ref: '#/$defs/RecordWarning'
            },
            canExportAudio: {
                anyOf: [
                    {
                        const: false
                    },
                    {
                        const: true
                    }
                ]
            },
            recordingId: {
                type: 'string'
            },
            processingStage: {
                $ref: '#/$defs/RecordProcessingStage'
            },
            failure: {
                $ref: '#/$defs/RecordFailure'
            }
        },
        additionalProperties: false,
        required: [
            'revision',
            'phase',
            'durationMs',
            'updatedAtEpochMs',
            'level'
        ],
        allOf: [
            {
                if: {
                    properties: {
                        phase: {
                            const: 'processing'
                        }
                    },
                    required: [
                        'phase'
                    ]
                },
                then: {
                    required: [
                        'processingStage'
                    ]
                },
                else: {
                    not: {
                        required: [
                            'processingStage'
                        ]
                    }
                }
            },
            {
                if: {
                    properties: {
                        phase: {
                            const: 'failed'
                        }
                    },
                    required: [
                        'phase'
                    ]
                },
                then: {
                    required: [
                        'failure'
                    ]
                },
                else: {
                    not: {
                        required: [
                            'failure'
                        ]
                    }
                }
            }
        ]
    },
    RecordWarning: {
        const: 'no-sound'
    },
    RegisterMacOSModifierGestureParams: {
        type: 'object',
        properties: {
            gestureId: {
                type: 'string'
            },
            binding: {
                $ref: '#/$defs/ModifierGestureShortcutBinding'
            }
        },
        additionalProperties: false,
        required: [
            'gestureId',
            'binding'
        ]
    },
    RequestEmailCodeParams: {
        type: 'object',
        properties: {
            email: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'email'
        ]
    },
    RequestPhoneCodeParams: {
        type: 'object',
        properties: {
            phoneNumber: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'phoneNumber'
        ]
    },
    RuntimeEnvironment: {
        type: 'string',
        enum: [
            'dev',
            'staging',
            'prod'
        ]
    },
    SetDebugSocketOfflineParams: {
        type: 'object',
        properties: {
            enabled: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'enabled'
        ]
    },
    SetDebugSocketPacketLossParams: {
        type: 'object',
        properties: {
            enabled: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'enabled'
        ]
    },
    SetDebugSocketTransportParams: {
        type: 'object',
        properties: {
            transport: {
                $ref: '#/$defs/DebugSocketTransport'
            }
        },
        additionalProperties: false,
        required: [
            'transport'
        ]
    },
    SetFeatureOverrideParams: {
        type: 'object',
        properties: {
            featureId: {
                type: 'string'
            },
            value: {
                $ref: '#/$defs/FeatureValue'
            }
        },
        additionalProperties: false,
        required: [
            'featureId',
            'value'
        ]
    },
    SetPreferenceValueParams: {
        type: 'object',
        properties: {
            preferenceId: {
                type: 'string'
            },
            value: {
                $ref: '#/$defs/PreferenceValue'
            }
        },
        additionalProperties: false,
        required: [
            'preferenceId',
            'value'
        ]
    },
    SetPreventSleepWhileRunningParams: {
        type: 'object',
        properties: {
            enabled: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'enabled'
        ]
    },
    SetRecordPausedParams: {
        type: 'object',
        properties: {
            paused: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'paused'
        ]
    },
    SetShortcutBindingParams: {
        type: 'object',
        properties: {
            shortcutId: {
                type: 'string'
            },
            binding: {
                anyOf: [
                    {
                        type: 'null'
                    },
                    {
                        $ref: '#/$defs/KeyCombinationShortcutBinding'
                    },
                    {
                        $ref: '#/$defs/ModifierDoubleTapShortcutBinding'
                    },
                    {
                        $ref: '#/$defs/ModifierChordShortcutBinding'
                    }
                ]
            }
        },
        additionalProperties: false,
        required: [
            'shortcutId',
            'binding'
        ]
    },
    SetSurfaceSizeParams: {
        type: 'object',
        properties: {
            width: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
            },
            height: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
            }
        },
        additionalProperties: false,
        required: [
            'width',
            'height'
        ]
    },
    SetToolAuthorizationParams: {
        type: 'object',
        properties: {
            connectorIds: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            excludedToolIds: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            fileRoots: {
                type: 'array',
                items: {
                    $ref: '#/$defs/ToolFileRoot'
                }
            },
            committed: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'connectorIds',
            'excludedToolIds',
            'fileRoots',
            'committed'
        ]
    },
    ShortcutBinding: {
        anyOf: [
            {
                $ref: '#/$defs/KeyCombinationShortcutBinding'
            },
            {
                $ref: '#/$defs/ModifierDoubleTapShortcutBinding'
            },
            {
                $ref: '#/$defs/ModifierChordShortcutBinding'
            }
        ]
    },
    ShortcutInfo: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            binding: {
                anyOf: [
                    {
                        type: 'null'
                    },
                    {
                        $ref: '#/$defs/KeyCombinationShortcutBinding'
                    },
                    {
                        $ref: '#/$defs/ModifierDoubleTapShortcutBinding'
                    },
                    {
                        $ref: '#/$defs/ModifierChordShortcutBinding'
                    }
                ]
            },
            enabled: {
                type: 'boolean'
            },
            active: {
                type: 'boolean'
            },
            scope: {
                $ref: '#/$defs/ShortcutScope'
            }
        },
        additionalProperties: false,
        required: [
            'id',
            'binding',
            'enabled',
            'active',
            'scope'
        ]
    },
    ShortcutModifier: {
        type: 'string',
        enum: [
            'control',
            'alt',
            'shift',
            'meta'
        ]
    },
    ShortcutScope: {
        type: 'string',
        enum: [
            'foreground',
            'global'
        ]
    },
    ShortcutTriggeredEvent: {
        type: 'object',
        properties: {
            shortcutId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'shortcutId'
        ]
    },
    ShowMacOSStatusMenuParams: {
        type: 'object',
        properties: {
            sourceFrame: {
                $ref: '#/$defs/AnchorRect'
            },
            header: {
                $ref: '#/$defs/StatusMenuHeader'
            },
            sections: {
                type: 'array',
                items: {
                    $ref: '#/$defs/StatusMenuSection'
                }
            }
        },
        additionalProperties: false,
        required: [
            'sourceFrame',
            'sections'
        ]
    },
    ShowWindowsStatusMenuParams: {
        type: 'object',
        properties: {
            sourceFrame: {
                $ref: '#/$defs/WindowsStatusMenuAnchorRect'
            },
            header: {
                $ref: '#/$defs/StatusMenuHeader'
            },
            sections: {
                type: 'array',
                items: {
                    $ref: '#/$defs/StatusMenuSection'
                }
            }
        },
        additionalProperties: false,
        required: [
            'sourceFrame',
            'sections'
        ]
    },
    SignedInAccountSnapshot: {
        type: 'object',
        properties: {
            status: {
                const: 'signed-in'
            },
            user: {
                $ref: '#/$defs/PublicAccountUser'
            }
        },
        additionalProperties: false,
        required: [
            'status',
            'user'
        ]
    },
    SignedOutAccountSnapshot: {
        type: 'object',
        properties: {
            status: {
                const: 'signed-out'
            }
        },
        additionalProperties: false,
        required: [
            'status'
        ]
    },
    SignInWithOAuthParams: {
        type: 'object',
        properties: {
            providerId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'providerId'
        ]
    },
    SocketDiagnosticRecord: {
        type: 'object',
        properties: {
            type: {
                type: 'string'
            },
            timestamp: {
                type: 'string'
            },
            direction: {
                anyOf: [
                    {
                        const: 'internal'
                    },
                    {
                        const: 'incoming'
                    },
                    {
                        const: 'outgoing'
                    }
                ]
            },
            source: {
                anyOf: [
                    {
                        const: 'classic'
                    },
                    {
                        const: 'shared-client'
                    },
                    {
                        const: 'shared-worker'
                    }
                ]
            },
            transport: {
                anyOf: [
                    {
                        const: 'shared'
                    },
                    {
                        const: 'not-shared'
                    }
                ]
            },
            attributes: {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonPrimitive'
                }
            }
        },
        additionalProperties: false,
        required: [
            'type',
            'timestamp',
            'direction',
            'attributes'
        ]
    },
    SocketMessage: {
        type: 'object',
        properties: {
            type: {
                type: 'string'
            },
            payload: {
                $ref: '#/$defs/JsonValue'
            }
        },
        additionalProperties: false,
        required: [
            'type',
            'payload'
        ]
    },
    SocketMessageProtocolVersion: {
        anyOf: [
            {
                const: 'legacy'
            },
            {
                const: 'canonical-v1'
            }
        ]
    },
    SocketNotificationActivation: {
        type: 'object',
        properties: {
            kind: {
                const: 'chat-message'
            },
            messageId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'kind',
            'messageId'
        ]
    },
    SocketState: {
        type: 'object',
        properties: {
            status: {
                $ref: '#/$defs/SocketStatus'
            },
            messageProtocolVersion: {
                $ref: '#/$defs/SocketMessageProtocolVersion'
            },
            registeredDeviceId: {
                type: 'string'
            },
            error: {
                $ref: '#/$defs/InterfaceErrorData'
            }
        },
        additionalProperties: false,
        required: [
            'status'
        ]
    },
    SocketStatus: {
        type: 'string',
        enum: [
            'idle',
            'connecting',
            'connected',
            'reconnecting',
            'auth-required',
            'failed'
        ]
    },
    StartAudioCaptureParams: {
        type: 'object',
        properties: {
            runId: {
                type: 'string',
                pattern: '^\\S(?:[\\s\\S]*\\S)?$'
            },
            directoryPath: {
                type: 'string',
                pattern: '^\\S(?:[\\s\\S]*\\S)?$'
            },
            segmentDurationMs: {
                type: 'number',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
            }
        },
        additionalProperties: false,
        required: [
            'runId',
            'directoryPath',
            'segmentDurationMs'
        ]
    },
    StartRecordParams: {
        type: 'object',
        properties: {
            type: {
                $ref: '#/$defs/RecordStartType'
            }
        },
        additionalProperties: false
    },
    StartToolTaskParams: {
        type: 'object',
        properties: {
            toolId: {
                type: 'string'
            },
            input: {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            timeoutMs: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
            }
        },
        additionalProperties: false,
        required: [
            'toolId',
            'input'
        ]
    },
    StatusMenuHeader: {
        type: 'object',
        properties: {
            title: {
                type: 'string'
            },
            detail: {
                type: 'string'
            },
            online: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'title',
            'detail',
            'online'
        ]
    },
    StatusMenuItem: {
        type: 'object',
        properties: {
            title: {
                type: 'string'
            },
            actionId: {
                type: 'string'
            },
            subtitle: {
                type: 'string'
            },
            shortcut: {
                $ref: '#/$defs/KeyCombinationShortcutBinding'
            },
            checked: {
                anyOf: [
                    {
                        const: false
                    },
                    {
                        const: true
                    }
                ]
            },
            items: {
                type: 'array',
                items: {
                    $ref: '#/$defs/StatusMenuItem'
                }
            }
        },
        additionalProperties: false,
        required: [
            'title'
        ]
    },
    StatusMenuSection: {
        type: 'object',
        properties: {
            items: {
                type: 'array',
                items: {
                    $ref: '#/$defs/StatusMenuItem'
                }
            }
        },
        additionalProperties: false,
        required: [
            'items'
        ]
    },
    SwitchAccountParams: {
        type: 'object',
        properties: {
            accountId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'accountId'
        ]
    },
    SystemInfo: {
        type: 'object',
        properties: {
            platform: {
                $ref: '#/$defs/SystemPlatform'
            },
            osName: {
                type: 'string'
            },
            osVersion: {
                type: 'string'
            },
            architecture: {
                $ref: '#/$defs/CpuArchitecture'
            },
            locale: {
                type: 'string'
            },
            timeZone: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'platform',
            'osName',
            'osVersion',
            'architecture',
            'locale',
            'timeZone'
        ]
    },
    SystemPlatform: {
        type: 'string',
        enum: [
            'macos',
            'windows',
            'linux'
        ]
    },
    ToolAuthorizationState: {
        type: 'object',
        properties: {
            connectorIds: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            excludedToolIds: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            fileRoots: {
                type: 'array',
                items: {
                    $ref: '#/$defs/ToolFileRoot'
                }
            },
            committed: {
                type: 'boolean'
            }
        },
        additionalProperties: false,
        required: [
            'connectorIds',
            'excludedToolIds',
            'fileRoots',
            'committed'
        ]
    },
    ToolAvailabilityState: {
        type: 'string',
        enum: [
            'available',
            'permission-required',
            'disabled',
            'unavailable',
            'unsupported'
        ]
    },
    ToolFileRoot: {
        type: 'string',
        enum: [
            'desktop',
            'documents',
            'downloads',
            'other_files'
        ]
    },
    ToolInfo: {
        type: 'object',
        properties: {
            inputSchema: {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            outputSchema: {
                type: 'object',
                properties: {},
                additionalProperties: {
                    $ref: '#/$defs/JsonValue'
                }
            },
            id: {
                type: 'string'
            },
            description: {
                type: 'string'
            },
            availability: {
                $ref: '#/$defs/ToolAvailabilityState'
            }
        },
        additionalProperties: false,
        required: [
            'inputSchema',
            'outputSchema',
            'id',
            'description',
            'availability'
        ]
    },
    ToolRiskLevel: {
        type: 'string',
        enum: [
            'low',
            'medium',
            'high',
            'critical'
        ]
    },
    ToolSummary: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            description: {
                type: 'string'
            },
            availability: {
                $ref: '#/$defs/ToolAvailabilityState'
            }
        },
        additionalProperties: false,
        required: [
            'id',
            'description',
            'availability'
        ]
    },
    ToolTaskInfo: {
        type: 'object',
        properties: {
            result: {
                $ref: '#/$defs/JsonValue'
            },
            error: {
                $ref: '#/$defs/InterfaceErrorData'
            },
            taskId: {
                type: 'string'
            },
            toolId: {
                type: 'string'
            },
            state: {
                $ref: '#/$defs/ToolTaskState'
            },
            startedAt: {
                type: 'number'
            },
            finishedAt: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'taskId',
            'toolId',
            'state',
            'startedAt'
        ]
    },
    ToolTaskState: {
        type: 'string',
        enum: [
            'running',
            'succeeded',
            'failed',
            'cancelled'
        ]
    },
    ToolTaskSummary: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string'
            },
            toolId: {
                type: 'string'
            },
            state: {
                $ref: '#/$defs/ToolTaskState'
            },
            startedAt: {
                type: 'number'
            },
            finishedAt: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'taskId',
            'toolId',
            'state',
            'startedAt'
        ]
    },
    UnregisterMacOSModifierGestureParams: {
        type: 'object',
        properties: {
            gestureId: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'gestureId'
        ]
    },
    UpdateAction: {
        type: 'string',
        enum: [
            'check',
            'download',
            'install',
            'restart',
            'open-update-source'
        ]
    },
    UpdateAttemptInfo: {
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            trigger: {
                $ref: '#/$defs/UpdateCheckTrigger'
            },
            startedAt: {
                type: 'number'
            },
            phaseStartedAt: {
                type: 'number'
            },
            downloadStartedAt: {
                type: 'number'
            },
            targetPackageBytes: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'id',
            'trigger',
            'startedAt',
            'phaseStartedAt'
        ]
    },
    UpdateCheckTrigger: {
        type: 'string',
        enum: [
            'scheduled-startup',
            'scheduled-interval',
            'manual',
            'manual-retry'
        ]
    },
    UpdateDownloadProgress: {
        type: 'object',
        properties: {
            percent: {
                type: 'number',
                minimum: 0,
                maximum: 100
            },
            transferredBytes: {
                type: 'number'
            },
            totalBytes: {
                type: 'number'
            },
            bytesPerSecond: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'percent'
        ]
    },
    UpdateRequirement: {
        type: 'string',
        enum: [
            'optional',
            'required'
        ]
    },
    UpdateState: {
        type: 'object',
        properties: {
            status: {
                $ref: '#/$defs/UpdateStatus'
            },
            requirement: {
                $ref: '#/$defs/UpdateRequirement'
            },
            attempt: {
                $ref: '#/$defs/UpdateAttemptInfo'
            },
            currentVersion: {
                $ref: '#/$defs/VersionInfo'
            },
            availableUpdate: {
                $ref: '#/$defs/VersionInfo'
            },
            supportedActions: {
                type: 'array',
                items: {
                    $ref: '#/$defs/UpdateAction'
                }
            },
            downloadProgress: {
                $ref: '#/$defs/UpdateDownloadProgress'
            },
            error: {
                $ref: '#/$defs/InterfaceErrorData'
            }
        },
        additionalProperties: false,
        required: [
            'status',
            'currentVersion',
            'supportedActions'
        ]
    },
    UpdateStatus: {
        type: 'string',
        enum: [
            'unsupported',
            'idle',
            'checking',
            'up-to-date',
            'available',
            'downloading',
            'ready',
            'applying',
            'restart-required',
            'external-handoff',
            'failed'
        ]
    },
    VerifyEmailCodeParams: {
        type: 'object',
        properties: {
            email: {
                type: 'string'
            },
            code: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'email',
            'code'
        ]
    },
    VerifyPhoneCodeParams: {
        type: 'object',
        properties: {
            phoneNumber: {
                type: 'string'
            },
            code: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'phoneNumber',
            'code'
        ]
    },
    VersionInfo: {
        type: 'object',
        properties: {
            version: {
                type: 'string'
            },
            build: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'version',
            'build'
        ]
    },
    WebAuthenticationCallbackTarget: {
        anyOf: [
            {
                const: 'connects/callback'
            },
            {
                const: 'macos_channel/callback'
            }
        ]
    },
    WebAuthenticationSessionResult: {
        type: 'object',
        properties: {
            callbackUrl: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'callbackUrl'
        ]
    },
    WebExtendedShellDeepLinkRequest: {
        type: 'object',
        properties: {
            url: {
                type: 'string'
            }
        },
        additionalProperties: false,
        required: [
            'url'
        ]
    },
    'wei.account.afterSignIn.event': {
        $ref: '#/$defs/AccountSignInEvent'
    },
    'wei.account.afterSignOut.event': {
        $ref: '#/$defs/AccountSignOutEvent'
    },
    'wei.account.afterSwitch.event': {
        $ref: '#/$defs/AccountSwitchEvent'
    },
    'wei.account.beforeSignOut.event': {
        $ref: '#/$defs/AccountSignOutEvent'
    },
    'wei.account.beforeSwitch.event': {
        $ref: '#/$defs/AccountSwitchEvent'
    },
    'wei.account.changed.event': {
        $ref: '#/$defs/AccountSnapshot'
    },
    'wei.account.getAccountSnapshot.result': {
        $ref: '#/$defs/AccountSnapshot'
    },
    'wei.account.getFreshAccountSnapshot.result': {
        $ref: '#/$defs/AccountSnapshot'
    },
    'wei.account.listAccounts.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/AccountCandidate'
        }
    },
    'wei.account.requestEmailCode.params': {
        $ref: '#/$defs/RequestEmailCodeParams'
    },
    'wei.account.requestEmailCode.result': {
        type: 'null'
    },
    'wei.account.requestPhoneCode.params': {
        $ref: '#/$defs/RequestPhoneCodeParams'
    },
    'wei.account.requestPhoneCode.result': {
        type: 'null'
    },
    'wei.account.signInWithOAuth.params': {
        $ref: '#/$defs/SignInWithOAuthParams'
    },
    'wei.account.signInWithOAuth.result': {
        type: 'null'
    },
    'wei.account.signOut.result': {
        type: 'null'
    },
    'wei.account.switchAccount.params': {
        $ref: '#/$defs/SwitchAccountParams'
    },
    'wei.account.switchAccount.result': {
        type: 'null'
    },
    'wei.account.verifyEmailCode.params': {
        $ref: '#/$defs/VerifyEmailCodeParams'
    },
    'wei.account.verifyEmailCode.result': {
        type: 'null'
    },
    'wei.account.verifyPhoneCode.params': {
        $ref: '#/$defs/VerifyPhoneCodeParams'
    },
    'wei.account.verifyPhoneCode.result': {
        type: 'null'
    },
    'wei.debug.console.open.result': {
        type: 'null'
    },
    'wei.debug.socket.disconnectWorker.result': {
        type: 'null'
    },
    'wei.debug.socket.getState.result': {
        $ref: '#/$defs/DebugSocketState'
    },
    'wei.debug.socket.recorded.event': {
        $ref: '#/$defs/DebugSocketRecord'
    },
    'wei.debug.socket.setOffline.params': {
        $ref: '#/$defs/SetDebugSocketOfflineParams'
    },
    'wei.debug.socket.setOffline.result': {
        type: 'null'
    },
    'wei.debug.socket.setPacketLoss.params': {
        $ref: '#/$defs/SetDebugSocketPacketLossParams'
    },
    'wei.debug.socket.setPacketLoss.result': {
        type: 'null'
    },
    'wei.debug.socket.setPreferredTransport.params': {
        $ref: '#/$defs/SetDebugSocketTransportParams'
    },
    'wei.debug.socket.setPreferredTransport.result': {
        type: 'null'
    },
    'wei.debug.socket.stateChanged.event': {
        $ref: '#/$defs/DebugSocketState'
    },
    'wei.features.changed.event': {
        $ref: '#/$defs/FeatureInfo'
    },
    'wei.features.getFeature.params': {
        $ref: '#/$defs/FeatureParams'
    },
    'wei.features.getFeature.result': {
        $ref: '#/$defs/FeatureInfo'
    },
    'wei.features.listFeatures.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/FeatureInfo'
        }
    },
    'wei.features.resetOverrides.result': {
        type: 'null'
    },
    'wei.features.setOverrideValue.params': {
        $ref: '#/$defs/SetFeatureOverrideParams'
    },
    'wei.features.setOverrideValue.result': {
        type: 'null'
    },
    'wei.logs.push.params': {
        $ref: '#/$defs/PushLogParams'
    },
    'wei.logs.push.result': {
        type: 'null'
    },
    'wei.logs.pushMetrics.params': {
        $ref: '#/$defs/PushMetricsParams'
    },
    'wei.logs.pushMetrics.result': {
        type: 'null'
    },
    'wei.logs.uploadLocal.result': {
        type: 'null'
    },
    'wei.logs.uploadProgressChanged.event': {
        type: 'number',
        minimum: 0,
        maximum: 1
    },
    'wei.logs.uploadStatusChanged.event': {
        $ref: '#/$defs/LocalLogUploadStatus'
    },
    'wei.permissions.changed.event': {
        $ref: '#/$defs/PermissionInfo'
    },
    'wei.permissions.getPermissionInfo.params': {
        $ref: '#/$defs/PermissionParams'
    },
    'wei.permissions.getPermissionInfo.result': {
        $ref: '#/$defs/PermissionInfo'
    },
    'wei.permissions.listPermissions.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/PermissionInfo'
        }
    },
    'wei.permissions.performPermissionAction.params': {
        $ref: '#/$defs/PerformPermissionActionParams'
    },
    'wei.permissions.performPermissionAction.result': {
        type: 'null'
    },
    'wei.preferences.changed.event': {
        $ref: '#/$defs/PreferenceInfo'
    },
    'wei.preferences.listPreferences.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/PreferenceInfo'
        }
    },
    'wei.preferences.setPreferenceValue.params': {
        $ref: '#/$defs/SetPreferenceValueParams'
    },
    'wei.preferences.setPreferenceValue.result': {
        type: 'null'
    },
    'wei.record.cancel.result': {
        type: 'null'
    },
    'wei.record.dismiss.result': {
        type: 'null'
    },
    'wei.record.exportAudio.result': {
        type: 'null'
    },
    'wei.record.getState.result': {
        $ref: '#/$defs/RecordState'
    },
    'wei.record.retry.result': {
        type: 'null'
    },
    'wei.record.setPaused.params': {
        $ref: '#/$defs/SetRecordPausedParams'
    },
    'wei.record.setPaused.result': {
        type: 'null'
    },
    'wei.record.start.params': {
        $ref: '#/$defs/StartRecordParams'
    },
    'wei.record.start.result': {
        type: 'null'
    },
    'wei.record.stateChanged.event': {
        $ref: '#/$defs/RecordState'
    },
    'wei.record.stop.result': {
        type: 'null'
    },
    'wei.runtime.getRuntimeInfo.result': {
        $ref: '#/$defs/ClientRuntimeInfo'
    },
    'wei.shell.activate.result': {
        type: 'null'
    },
    'wei.shell.deepLinkRequested.event': {
        $ref: '#/$defs/WebExtendedShellDeepLinkRequest'
    },
    'wei.shell.dismiss.result': {
        type: 'null'
    },
    'wei.shell.openExternal.params': {
        $ref: '#/$defs/OpenExternalParams'
    },
    'wei.shell.openExternal.result': {
        type: 'null'
    },
    'wei.shell.openWebAuthenticationSession.params': {
        $ref: '#/$defs/OpenShellWebAuthenticationSessionParams'
    },
    'wei.shell.openWebAuthenticationSession.result': {
        type: 'null'
    },
    'wei.shell.quitApplication.result': {
        type: 'null'
    },
    'wei.shell.setSize.params': {
        $ref: '#/$defs/SetSurfaceSizeParams'
    },
    'wei.shell.setSize.result': {
        type: 'null'
    },
    'wei.shell.settingsRequested.event': {
        type: 'null'
    },
    'wei.shortcuts.changed.event': {
        $ref: '#/$defs/ShortcutInfo'
    },
    'wei.shortcuts.listShortcuts.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/ShortcutInfo'
        }
    },
    'wei.shortcuts.setShortcutBinding.params': {
        $ref: '#/$defs/SetShortcutBindingParams'
    },
    'wei.shortcuts.setShortcutBinding.result': {
        type: 'null'
    },
    'wei.shortcuts.triggered.event': {
        $ref: '#/$defs/ShortcutTriggeredEvent'
    },
    'wei.socket.diagnostic.event': {
        $ref: '#/$defs/SocketDiagnosticRecord'
    },
    'wei.socket.forceSync.result': {
        type: 'null'
    },
    'wei.socket.getSocketState.result': {
        $ref: '#/$defs/SocketState'
    },
    'wei.socket.notificationActivated.event': {
        $ref: '#/$defs/SocketNotificationActivation'
    },
    'wei.socket.receive.event': {
        $ref: '#/$defs/SocketMessage'
    },
    'wei.socket.stateChange.event': {
        $ref: '#/$defs/SocketState'
    },
    'wei.tools.cancelTask.params': {
        $ref: '#/$defs/CancelToolTaskParams'
    },
    'wei.tools.cancelTask.result': {
        type: 'null'
    },
    'wei.tools.catalogChanged.event': {
        type: 'array',
        items: {
            $ref: '#/$defs/ToolSummary'
        }
    },
    'wei.tools.getAuthorization.result': {
        $ref: '#/$defs/ToolAuthorizationState'
    },
    'wei.tools.getRunningTasks.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/ToolTaskSummary'
        }
    },
    'wei.tools.getTaskInfo.params': {
        $ref: '#/$defs/GetToolTaskInfoParams'
    },
    'wei.tools.getTaskInfo.result': {
        $ref: '#/$defs/ToolTaskInfo'
    },
    'wei.tools.getToolInfo.params': {
        $ref: '#/$defs/GetToolInfoParams'
    },
    'wei.tools.getToolInfo.result': {
        $ref: '#/$defs/ToolInfo'
    },
    'wei.tools.listTools.result': {
        type: 'array',
        items: {
            $ref: '#/$defs/ToolSummary'
        }
    },
    'wei.tools.scanFileInventory.result': {
        type: 'null'
    },
    'wei.tools.setAuthorization.params': {
        $ref: '#/$defs/SetToolAuthorizationParams'
    },
    'wei.tools.setAuthorization.result': {
        type: 'null'
    },
    'wei.tools.startTask.params': {
        $ref: '#/$defs/StartToolTaskParams'
    },
    'wei.tools.startTask.result': {
        type: 'string'
    },
    'wei.tools.taskChanged.event': {
        $ref: '#/$defs/ToolTaskSummary'
    },
    'wei.tools.uploadFileInventory.result': {
        type: 'null'
    },
    'wei.update.getUpdateState.result': {
        $ref: '#/$defs/UpdateState'
    },
    'wei.update.getVersionInfo.result': {
        $ref: '#/$defs/VersionInfo'
    },
    'wei.update.performUpdateAction.params': {
        $ref: '#/$defs/PerformUpdateActionParams'
    },
    'wei.update.performUpdateAction.result': {
        type: 'null'
    },
    'wei.update.presentationRequested.event': {
        $ref: '#/$defs/UpdateState'
    },
    'wei.update.stateChanged.event': {
        $ref: '#/$defs/UpdateState'
    },
    WindowsStatusMenuAnchorRect: {
        type: 'object',
        properties: {
            x: {
                type: 'number'
            },
            y: {
                type: 'number'
            },
            width: {
                type: 'number'
            },
            height: {
                type: 'number'
            }
        },
        additionalProperties: false,
        required: [
            'x',
            'y',
            'width',
            'height'
        ]
    }
};
const interfaceDefinitions = {
    wei: {
        kind: (/* inlined export .InterfaceKind.WebExtended */"WEI"),
        modules: {
            runtime: {
                descriptorName: 'runtime',
                version: '0.2.0',
                methods: {
                    getRuntimeInfo: {
                        wireName: 'wei.runtime.getRuntimeInfo',
                        resultSchema: 'wei.runtime.getRuntimeInfo.result',
                        returnsVoid: false
                    }
                },
                events: {}
            },
            account: {
                descriptorName: 'account',
                version: '0.7.0',
                methods: {
                    signInWithOAuth: {
                        wireName: 'wei.account.signInWithOAuth',
                        paramsSchema: 'wei.account.signInWithOAuth.params',
                        resultSchema: 'wei.account.signInWithOAuth.result',
                        returnsVoid: true
                    },
                    requestEmailCode: {
                        wireName: 'wei.account.requestEmailCode',
                        paramsSchema: 'wei.account.requestEmailCode.params',
                        resultSchema: 'wei.account.requestEmailCode.result',
                        returnsVoid: true
                    },
                    verifyEmailCode: {
                        wireName: 'wei.account.verifyEmailCode',
                        paramsSchema: 'wei.account.verifyEmailCode.params',
                        resultSchema: 'wei.account.verifyEmailCode.result',
                        returnsVoid: true
                    },
                    requestPhoneCode: {
                        wireName: 'wei.account.requestPhoneCode',
                        paramsSchema: 'wei.account.requestPhoneCode.params',
                        resultSchema: 'wei.account.requestPhoneCode.result',
                        returnsVoid: true
                    },
                    verifyPhoneCode: {
                        wireName: 'wei.account.verifyPhoneCode',
                        paramsSchema: 'wei.account.verifyPhoneCode.params',
                        resultSchema: 'wei.account.verifyPhoneCode.result',
                        returnsVoid: true
                    },
                    getAccountSnapshot: {
                        wireName: 'wei.account.getAccountSnapshot',
                        resultSchema: 'wei.account.getAccountSnapshot.result',
                        returnsVoid: false
                    },
                    getFreshAccountSnapshot: {
                        wireName: 'wei.account.getFreshAccountSnapshot',
                        resultSchema: 'wei.account.getFreshAccountSnapshot.result',
                        returnsVoid: false
                    },
                    listAccounts: {
                        wireName: 'wei.account.listAccounts',
                        resultSchema: 'wei.account.listAccounts.result',
                        returnsVoid: false
                    },
                    switchAccount: {
                        wireName: 'wei.account.switchAccount',
                        paramsSchema: 'wei.account.switchAccount.params',
                        resultSchema: 'wei.account.switchAccount.result',
                        returnsVoid: true
                    },
                    signOut: {
                        wireName: 'wei.account.signOut',
                        resultSchema: 'wei.account.signOut.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'wei.account.changed',
                        payloadSchema: 'wei.account.changed.event'
                    },
                    afterSignIn: {
                        wireName: 'wei.account.afterSignIn',
                        payloadSchema: 'wei.account.afterSignIn.event'
                    },
                    beforeSwitch: {
                        wireName: 'wei.account.beforeSwitch',
                        payloadSchema: 'wei.account.beforeSwitch.event'
                    },
                    afterSwitch: {
                        wireName: 'wei.account.afterSwitch',
                        payloadSchema: 'wei.account.afterSwitch.event'
                    },
                    beforeSignOut: {
                        wireName: 'wei.account.beforeSignOut',
                        payloadSchema: 'wei.account.beforeSignOut.event'
                    },
                    afterSignOut: {
                        wireName: 'wei.account.afterSignOut',
                        payloadSchema: 'wei.account.afterSignOut.event'
                    }
                }
            },
            shell: {
                descriptorName: 'shell',
                version: '0.8.0',
                methods: {
                    activate: {
                        wireName: 'wei.shell.activate',
                        resultSchema: 'wei.shell.activate.result',
                        returnsVoid: true
                    },
                    dismiss: {
                        wireName: 'wei.shell.dismiss',
                        resultSchema: 'wei.shell.dismiss.result',
                        returnsVoid: true
                    },
                    openExternal: {
                        wireName: 'wei.shell.openExternal',
                        paramsSchema: 'wei.shell.openExternal.params',
                        resultSchema: 'wei.shell.openExternal.result',
                        returnsVoid: true
                    },
                    openWebAuthenticationSession: {
                        wireName: 'wei.shell.openWebAuthenticationSession',
                        paramsSchema: 'wei.shell.openWebAuthenticationSession.params',
                        resultSchema: 'wei.shell.openWebAuthenticationSession.result',
                        returnsVoid: true
                    },
                    quitApplication: {
                        wireName: 'wei.shell.quitApplication',
                        resultSchema: 'wei.shell.quitApplication.result',
                        returnsVoid: true
                    },
                    setSize: {
                        wireName: 'wei.shell.setSize',
                        paramsSchema: 'wei.shell.setSize.params',
                        resultSchema: 'wei.shell.setSize.result',
                        returnsVoid: true
                    }
                },
                events: {
                    deepLinkRequested: {
                        wireName: 'wei.shell.deepLinkRequested',
                        payloadSchema: 'wei.shell.deepLinkRequested.event'
                    },
                    settingsRequested: {
                        wireName: 'wei.shell.settingsRequested',
                        payloadSchema: 'wei.shell.settingsRequested.event'
                    }
                }
            },
            tools: {
                descriptorName: 'tools',
                version: '1.0.0',
                methods: {
                    getAuthorization: {
                        wireName: 'wei.tools.getAuthorization',
                        resultSchema: 'wei.tools.getAuthorization.result',
                        returnsVoid: false
                    },
                    setAuthorization: {
                        wireName: 'wei.tools.setAuthorization',
                        paramsSchema: 'wei.tools.setAuthorization.params',
                        resultSchema: 'wei.tools.setAuthorization.result',
                        returnsVoid: true
                    },
                    scanFileInventory: {
                        wireName: 'wei.tools.scanFileInventory',
                        resultSchema: 'wei.tools.scanFileInventory.result',
                        returnsVoid: true
                    },
                    uploadFileInventory: {
                        wireName: 'wei.tools.uploadFileInventory',
                        resultSchema: 'wei.tools.uploadFileInventory.result',
                        returnsVoid: true
                    },
                    listTools: {
                        wireName: 'wei.tools.listTools',
                        resultSchema: 'wei.tools.listTools.result',
                        returnsVoid: false
                    },
                    getToolInfo: {
                        wireName: 'wei.tools.getToolInfo',
                        paramsSchema: 'wei.tools.getToolInfo.params',
                        resultSchema: 'wei.tools.getToolInfo.result',
                        returnsVoid: false
                    },
                    getRunningTasks: {
                        wireName: 'wei.tools.getRunningTasks',
                        resultSchema: 'wei.tools.getRunningTasks.result',
                        returnsVoid: false
                    },
                    getTaskInfo: {
                        wireName: 'wei.tools.getTaskInfo',
                        paramsSchema: 'wei.tools.getTaskInfo.params',
                        resultSchema: 'wei.tools.getTaskInfo.result',
                        returnsVoid: false
                    },
                    cancelTask: {
                        wireName: 'wei.tools.cancelTask',
                        paramsSchema: 'wei.tools.cancelTask.params',
                        resultSchema: 'wei.tools.cancelTask.result',
                        returnsVoid: true
                    },
                    startTask: {
                        wireName: 'wei.tools.startTask',
                        paramsSchema: 'wei.tools.startTask.params',
                        resultSchema: 'wei.tools.startTask.result',
                        returnsVoid: false
                    }
                },
                events: {
                    catalogChanged: {
                        wireName: 'wei.tools.catalogChanged',
                        payloadSchema: 'wei.tools.catalogChanged.event'
                    },
                    taskChanged: {
                        wireName: 'wei.tools.taskChanged',
                        payloadSchema: 'wei.tools.taskChanged.event'
                    }
                }
            },
            permissions: {
                descriptorName: 'permissions',
                version: '0.2.0',
                methods: {
                    listPermissions: {
                        wireName: 'wei.permissions.listPermissions',
                        resultSchema: 'wei.permissions.listPermissions.result',
                        returnsVoid: false
                    },
                    getPermissionInfo: {
                        wireName: 'wei.permissions.getPermissionInfo',
                        paramsSchema: 'wei.permissions.getPermissionInfo.params',
                        resultSchema: 'wei.permissions.getPermissionInfo.result',
                        returnsVoid: false
                    },
                    performPermissionAction: {
                        wireName: 'wei.permissions.performPermissionAction',
                        paramsSchema: 'wei.permissions.performPermissionAction.params',
                        resultSchema: 'wei.permissions.performPermissionAction.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'wei.permissions.changed',
                        payloadSchema: 'wei.permissions.changed.event'
                    }
                }
            },
            socket: {
                descriptorName: 'socket',
                version: '0.4.0',
                methods: {
                    getSocketState: {
                        wireName: 'wei.socket.getSocketState',
                        resultSchema: 'wei.socket.getSocketState.result',
                        returnsVoid: false
                    },
                    forceSync: {
                        wireName: 'wei.socket.forceSync',
                        resultSchema: 'wei.socket.forceSync.result',
                        returnsVoid: true
                    }
                },
                events: {
                    receive: {
                        wireName: 'wei.socket.receive',
                        payloadSchema: 'wei.socket.receive.event'
                    },
                    stateChange: {
                        wireName: 'wei.socket.stateChange',
                        payloadSchema: 'wei.socket.stateChange.event'
                    },
                    notificationActivated: {
                        wireName: 'wei.socket.notificationActivated',
                        payloadSchema: 'wei.socket.notificationActivated.event'
                    },
                    diagnostic: {
                        wireName: 'wei.socket.diagnostic',
                        payloadSchema: 'wei.socket.diagnostic.event'
                    }
                }
            },
            preferences: {
                descriptorName: 'preferences',
                version: '0.2.0',
                methods: {
                    listPreferences: {
                        wireName: 'wei.preferences.listPreferences',
                        resultSchema: 'wei.preferences.listPreferences.result',
                        returnsVoid: false
                    },
                    setPreferenceValue: {
                        wireName: 'wei.preferences.setPreferenceValue',
                        paramsSchema: 'wei.preferences.setPreferenceValue.params',
                        resultSchema: 'wei.preferences.setPreferenceValue.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'wei.preferences.changed',
                        payloadSchema: 'wei.preferences.changed.event'
                    }
                }
            },
            logs: {
                descriptorName: 'logs',
                version: '0.4.0',
                methods: {
                    push: {
                        wireName: 'wei.logs.push',
                        paramsSchema: 'wei.logs.push.params',
                        resultSchema: 'wei.logs.push.result',
                        returnsVoid: true
                    },
                    pushMetrics: {
                        wireName: 'wei.logs.pushMetrics',
                        paramsSchema: 'wei.logs.pushMetrics.params',
                        resultSchema: 'wei.logs.pushMetrics.result',
                        returnsVoid: true
                    },
                    uploadLocal: {
                        wireName: 'wei.logs.uploadLocal',
                        resultSchema: 'wei.logs.uploadLocal.result',
                        returnsVoid: true
                    }
                },
                events: {
                    uploadStatusChanged: {
                        wireName: 'wei.logs.uploadStatusChanged',
                        payloadSchema: 'wei.logs.uploadStatusChanged.event'
                    },
                    uploadProgressChanged: {
                        wireName: 'wei.logs.uploadProgressChanged',
                        payloadSchema: 'wei.logs.uploadProgressChanged.event'
                    }
                }
            },
            shortcuts: {
                descriptorName: 'shortcuts',
                version: '0.2.0',
                methods: {
                    listShortcuts: {
                        wireName: 'wei.shortcuts.listShortcuts',
                        resultSchema: 'wei.shortcuts.listShortcuts.result',
                        returnsVoid: false
                    },
                    setShortcutBinding: {
                        wireName: 'wei.shortcuts.setShortcutBinding',
                        paramsSchema: 'wei.shortcuts.setShortcutBinding.params',
                        resultSchema: 'wei.shortcuts.setShortcutBinding.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'wei.shortcuts.changed',
                        payloadSchema: 'wei.shortcuts.changed.event'
                    },
                    triggered: {
                        wireName: 'wei.shortcuts.triggered',
                        payloadSchema: 'wei.shortcuts.triggered.event'
                    }
                }
            },
            features: {
                descriptorName: 'features',
                version: '0.2.0',
                methods: {
                    listFeatures: {
                        wireName: 'wei.features.listFeatures',
                        resultSchema: 'wei.features.listFeatures.result',
                        returnsVoid: false
                    },
                    getFeature: {
                        wireName: 'wei.features.getFeature',
                        paramsSchema: 'wei.features.getFeature.params',
                        resultSchema: 'wei.features.getFeature.result',
                        returnsVoid: false
                    },
                    setOverrideValue: {
                        wireName: 'wei.features.setOverrideValue',
                        paramsSchema: 'wei.features.setOverrideValue.params',
                        resultSchema: 'wei.features.setOverrideValue.result',
                        returnsVoid: true
                    },
                    resetOverrides: {
                        wireName: 'wei.features.resetOverrides',
                        resultSchema: 'wei.features.resetOverrides.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'wei.features.changed',
                        payloadSchema: 'wei.features.changed.event'
                    }
                }
            },
            record: {
                descriptorName: 'record',
                version: '0.6.0',
                methods: {
                    getState: {
                        wireName: 'wei.record.getState',
                        resultSchema: 'wei.record.getState.result',
                        returnsVoid: false
                    },
                    start: {
                        wireName: 'wei.record.start',
                        paramsSchema: 'wei.record.start.params',
                        resultSchema: 'wei.record.start.result',
                        returnsVoid: true
                    },
                    cancel: {
                        wireName: 'wei.record.cancel',
                        resultSchema: 'wei.record.cancel.result',
                        returnsVoid: true
                    },
                    setPaused: {
                        wireName: 'wei.record.setPaused',
                        paramsSchema: 'wei.record.setPaused.params',
                        resultSchema: 'wei.record.setPaused.result',
                        returnsVoid: true
                    },
                    stop: {
                        wireName: 'wei.record.stop',
                        resultSchema: 'wei.record.stop.result',
                        returnsVoid: true
                    },
                    retry: {
                        wireName: 'wei.record.retry',
                        resultSchema: 'wei.record.retry.result',
                        returnsVoid: true
                    },
                    exportAudio: {
                        wireName: 'wei.record.exportAudio',
                        resultSchema: 'wei.record.exportAudio.result',
                        returnsVoid: true
                    },
                    dismiss: {
                        wireName: 'wei.record.dismiss',
                        resultSchema: 'wei.record.dismiss.result',
                        returnsVoid: true
                    }
                },
                events: {
                    stateChanged: {
                        wireName: 'wei.record.stateChanged',
                        payloadSchema: 'wei.record.stateChanged.event'
                    }
                }
            },
            update: {
                descriptorName: 'update',
                version: '0.3.0',
                methods: {
                    getVersionInfo: {
                        wireName: 'wei.update.getVersionInfo',
                        resultSchema: 'wei.update.getVersionInfo.result',
                        returnsVoid: false
                    },
                    getUpdateState: {
                        wireName: 'wei.update.getUpdateState',
                        resultSchema: 'wei.update.getUpdateState.result',
                        returnsVoid: false
                    },
                    performUpdateAction: {
                        wireName: 'wei.update.performUpdateAction',
                        paramsSchema: 'wei.update.performUpdateAction.params',
                        resultSchema: 'wei.update.performUpdateAction.result',
                        returnsVoid: true
                    }
                },
                events: {
                    presentationRequested: {
                        wireName: 'wei.update.presentationRequested',
                        payloadSchema: 'wei.update.presentationRequested.event'
                    },
                    stateChanged: {
                        wireName: 'wei.update.stateChanged',
                        payloadSchema: 'wei.update.stateChanged.event'
                    }
                }
            },
            'debug.socket': {
                descriptorName: 'debug',
                version: '1.1.0',
                methods: {
                    getState: {
                        wireName: 'wei.debug.socket.getState',
                        resultSchema: 'wei.debug.socket.getState.result',
                        returnsVoid: false
                    },
                    setPreferredTransport: {
                        wireName: 'wei.debug.socket.setPreferredTransport',
                        paramsSchema: 'wei.debug.socket.setPreferredTransport.params',
                        resultSchema: 'wei.debug.socket.setPreferredTransport.result',
                        returnsVoid: true
                    },
                    setOffline: {
                        wireName: 'wei.debug.socket.setOffline',
                        paramsSchema: 'wei.debug.socket.setOffline.params',
                        resultSchema: 'wei.debug.socket.setOffline.result',
                        returnsVoid: true
                    },
                    setPacketLoss: {
                        wireName: 'wei.debug.socket.setPacketLoss',
                        paramsSchema: 'wei.debug.socket.setPacketLoss.params',
                        resultSchema: 'wei.debug.socket.setPacketLoss.result',
                        returnsVoid: true
                    },
                    disconnectWorker: {
                        wireName: 'wei.debug.socket.disconnectWorker',
                        resultSchema: 'wei.debug.socket.disconnectWorker.result',
                        returnsVoid: true
                    }
                },
                events: {
                    recorded: {
                        wireName: 'wei.debug.socket.recorded',
                        payloadSchema: 'wei.debug.socket.recorded.event'
                    },
                    stateChanged: {
                        wireName: 'wei.debug.socket.stateChanged',
                        payloadSchema: 'wei.debug.socket.stateChanged.event'
                    }
                }
            },
            'debug.console': {
                descriptorName: 'debug',
                version: '1.1.0',
                methods: {
                    open: {
                        wireName: 'wei.debug.console.open',
                        resultSchema: 'wei.debug.console.open.result',
                        returnsVoid: true
                    }
                },
                events: {}
            }
        }
    },
    cpi: {
        kind: (/* inlined export .InterfaceKind.CrossPlatform */"CPI"),
        modules: {
            account: {
                descriptorName: 'account',
                version: '0.2.0',
                methods: {
                    applyAccountState: {
                        wireName: 'cpi.account.applyAccountState',
                        paramsSchema: 'cpi.account.applyAccountState.params',
                        resultSchema: 'cpi.account.applyAccountState.result',
                        returnsVoid: true
                    }
                },
                events: {}
            },
            tools: {
                descriptorName: 'tools',
                version: '0.1.0',
                methods: {
                    listToolRegistrations: {
                        wireName: 'cpi.tools.listToolRegistrations',
                        resultSchema: 'cpi.tools.listToolRegistrations.result',
                        returnsVoid: false
                    },
                    listTools: {
                        wireName: 'cpi.tools.listTools',
                        resultSchema: 'cpi.tools.listTools.result',
                        returnsVoid: false
                    },
                    getToolInfo: {
                        wireName: 'cpi.tools.getToolInfo',
                        paramsSchema: 'cpi.tools.getToolInfo.params',
                        resultSchema: 'cpi.tools.getToolInfo.result',
                        returnsVoid: false
                    },
                    getRunningTasks: {
                        wireName: 'cpi.tools.getRunningTasks',
                        resultSchema: 'cpi.tools.getRunningTasks.result',
                        returnsVoid: false
                    },
                    getTaskInfo: {
                        wireName: 'cpi.tools.getTaskInfo',
                        paramsSchema: 'cpi.tools.getTaskInfo.params',
                        resultSchema: 'cpi.tools.getTaskInfo.result',
                        returnsVoid: false
                    },
                    cancelTask: {
                        wireName: 'cpi.tools.cancelTask',
                        paramsSchema: 'cpi.tools.cancelTask.params',
                        resultSchema: 'cpi.tools.cancelTask.result',
                        returnsVoid: true
                    },
                    startTask: {
                        wireName: 'cpi.tools.startTask',
                        paramsSchema: 'cpi.tools.startTask.params',
                        resultSchema: 'cpi.tools.startTask.result',
                        returnsVoid: false
                    }
                },
                events: {
                    catalogChanged: {
                        wireName: 'cpi.tools.catalogChanged',
                        payloadSchema: 'cpi.tools.catalogChanged.event'
                    },
                    taskChanged: {
                        wireName: 'cpi.tools.taskChanged',
                        payloadSchema: 'cpi.tools.taskChanged.event'
                    }
                }
            },
            audio: {
                descriptorName: 'audio',
                version: '0.4.0',
                methods: {
                    getState: {
                        wireName: 'cpi.audio.getState',
                        resultSchema: 'cpi.audio.getState.result',
                        returnsVoid: false
                    },
                    startCapture: {
                        wireName: 'cpi.audio.startCapture',
                        paramsSchema: 'cpi.audio.startCapture.params',
                        resultSchema: 'cpi.audio.startCapture.result',
                        returnsVoid: true
                    },
                    stopCapture: {
                        wireName: 'cpi.audio.stopCapture',
                        resultSchema: 'cpi.audio.stopCapture.result',
                        returnsVoid: false
                    }
                },
                events: {
                    stateChanged: {
                        wireName: 'cpi.audio.stateChanged',
                        payloadSchema: 'cpi.audio.stateChanged.event'
                    },
                    segmentCompleted: {
                        wireName: 'cpi.audio.segmentCompleted',
                        payloadSchema: 'cpi.audio.segmentCompleted.event'
                    },
                    levelChanged: {
                        wireName: 'cpi.audio.levelChanged',
                        payloadSchema: 'cpi.audio.levelChanged.event'
                    },
                    healthChanged: {
                        wireName: 'cpi.audio.healthChanged',
                        payloadSchema: 'cpi.audio.healthChanged.event'
                    },
                    captureFailed: {
                        wireName: 'cpi.audio.captureFailed',
                        payloadSchema: 'cpi.audio.captureFailed.event'
                    }
                }
            },
            deviceConnectors: {
                descriptorName: 'deviceConnectors',
                version: '0.1.0',
                methods: {
                    readSnapshot: {
                        wireName: 'cpi.deviceConnectors.readSnapshot',
                        paramsSchema: 'cpi.deviceConnectors.readSnapshot.params',
                        resultSchema: 'cpi.deviceConnectors.readSnapshot.result',
                        returnsVoid: false
                    }
                },
                events: {
                    changed: {
                        wireName: 'cpi.deviceConnectors.changed',
                        payloadSchema: 'cpi.deviceConnectors.changed.event'
                    }
                }
            },
            permissions: {
                descriptorName: 'permissions',
                version: '0.2.0',
                methods: {
                    listPermissions: {
                        wireName: 'cpi.permissions.listPermissions',
                        resultSchema: 'cpi.permissions.listPermissions.result',
                        returnsVoid: false
                    },
                    getPermissionInfo: {
                        wireName: 'cpi.permissions.getPermissionInfo',
                        paramsSchema: 'cpi.permissions.getPermissionInfo.params',
                        resultSchema: 'cpi.permissions.getPermissionInfo.result',
                        returnsVoid: false
                    },
                    performPermissionAction: {
                        wireName: 'cpi.permissions.performPermissionAction',
                        paramsSchema: 'cpi.permissions.performPermissionAction.params',
                        resultSchema: 'cpi.permissions.performPermissionAction.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'cpi.permissions.changed',
                        payloadSchema: 'cpi.permissions.changed.event'
                    }
                }
            },
            system: {
                descriptorName: 'system',
                version: '0.3.0',
                methods: {
                    getSystemInfo: {
                        wireName: 'cpi.system.getSystemInfo',
                        resultSchema: 'cpi.system.getSystemInfo.result',
                        returnsVoid: false
                    },
                    getDeviceInfo: {
                        wireName: 'cpi.system.getDeviceInfo',
                        resultSchema: 'cpi.system.getDeviceInfo.result',
                        returnsVoid: false
                    },
                    isPreventSleepWhileRunningSupported: {
                        wireName: 'cpi.system.isPreventSleepWhileRunningSupported',
                        resultSchema: 'cpi.system.isPreventSleepWhileRunningSupported.result',
                        returnsVoid: false
                    },
                    getPreventSleepWhileRunning: {
                        wireName: 'cpi.system.getPreventSleepWhileRunning',
                        resultSchema: 'cpi.system.getPreventSleepWhileRunning.result',
                        returnsVoid: false
                    },
                    setPreventSleepWhileRunning: {
                        wireName: 'cpi.system.setPreventSleepWhileRunning',
                        paramsSchema: 'cpi.system.setPreventSleepWhileRunning.params',
                        resultSchema: 'cpi.system.setPreventSleepWhileRunning.result',
                        returnsVoid: true
                    },
                    scanFileInventory: {
                        wireName: 'cpi.system.scanFileInventory',
                        resultSchema: 'cpi.system.scanFileInventory.result',
                        returnsVoid: false
                    }
                },
                events: {}
            },
            macos: {
                descriptorName: 'macos',
                version: '0.5.0',
                methods: {
                    openWebAuthenticationSession: {
                        wireName: 'cpi.macos.openWebAuthenticationSession',
                        paramsSchema: 'cpi.macos.openWebAuthenticationSession.params',
                        resultSchema: 'cpi.macos.openWebAuthenticationSession.result',
                        returnsVoid: false
                    },
                    showStatusMenu: {
                        wireName: 'cpi.macos.showStatusMenu',
                        paramsSchema: 'cpi.macos.showStatusMenu.params',
                        resultSchema: 'cpi.macos.showStatusMenu.result',
                        returnsVoid: false
                    },
                    registerModifierGesture: {
                        wireName: 'cpi.macos.registerModifierGesture',
                        paramsSchema: 'cpi.macos.registerModifierGesture.params',
                        resultSchema: 'cpi.macos.registerModifierGesture.result',
                        returnsVoid: true
                    },
                    unregisterModifierGesture: {
                        wireName: 'cpi.macos.unregisterModifierGesture',
                        paramsSchema: 'cpi.macos.unregisterModifierGesture.params',
                        resultSchema: 'cpi.macos.unregisterModifierGesture.result',
                        returnsVoid: true
                    },
                    readLegacyQuickChatShortcut: {
                        wireName: 'cpi.macos.readLegacyQuickChatShortcut',
                        resultSchema: 'cpi.macos.readLegacyQuickChatShortcut.result',
                        returnsVoid: false
                    }
                },
                events: {
                    modifierGestureTriggered: {
                        wireName: 'cpi.macos.modifierGestureTriggered',
                        payloadSchema: 'cpi.macos.modifierGestureTriggered.event'
                    }
                }
            },
            windows: {
                descriptorName: 'windows',
                version: '0.2.0',
                methods: {
                    showStatusMenu: {
                        wireName: 'cpi.windows.showStatusMenu',
                        paramsSchema: 'cpi.windows.showStatusMenu.params',
                        resultSchema: 'cpi.windows.showStatusMenu.result',
                        returnsVoid: false
                    },
                    dismissStatusMenu: {
                        wireName: 'cpi.windows.dismissStatusMenu',
                        resultSchema: 'cpi.windows.dismissStatusMenu.result',
                        returnsVoid: true
                    }
                },
                events: {}
            },
            linux: {
                descriptorName: 'linux',
                version: '0.1.0',
                methods: {},
                events: {}
            }
        }
    },
    nei: {
        kind: (/* inlined export .InterfaceKind.NativeExtended */"NEI"),
        modules: {
            account: {
                descriptorName: 'account',
                version: '0.2.0',
                methods: {
                    getFreshAuthContext: {
                        wireName: 'nei.account.getFreshAuthContext',
                        resultSchema: 'nei.account.getFreshAuthContext.result',
                        returnsVoid: false
                    }
                },
                events: {}
            },
            tools: {
                descriptorName: 'tools',
                version: '0.1.0',
                methods: {
                    completeInvocation: {
                        wireName: 'nei.tools.completeInvocation',
                        paramsSchema: 'nei.tools.completeInvocation.params',
                        resultSchema: 'nei.tools.completeInvocation.result',
                        returnsVoid: true
                    }
                },
                events: {
                    invocationRequested: {
                        wireName: 'nei.tools.invocationRequested',
                        payloadSchema: 'nei.tools.invocationRequested.event'
                    },
                    invocationCancelled: {
                        wireName: 'nei.tools.invocationCancelled',
                        payloadSchema: 'nei.tools.invocationCancelled.event'
                    },
                    pendingInvocationResultsRequested: {
                        wireName: 'nei.tools.pendingInvocationResultsRequested',
                        payloadSchema: 'nei.tools.pendingInvocationResultsRequested.event'
                    },
                    invocationResultAcknowledged: {
                        wireName: 'nei.tools.invocationResultAcknowledged',
                        payloadSchema: 'nei.tools.invocationResultAcknowledged.event'
                    }
                }
            },
            preferences: {
                descriptorName: 'preferences',
                version: '0.2.0',
                methods: {
                    listPreferences: {
                        wireName: 'nei.preferences.listPreferences',
                        resultSchema: 'nei.preferences.listPreferences.result',
                        returnsVoid: false
                    },
                    setPreferenceValue: {
                        wireName: 'nei.preferences.setPreferenceValue',
                        paramsSchema: 'nei.preferences.setPreferenceValue.params',
                        resultSchema: 'nei.preferences.setPreferenceValue.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'nei.preferences.changed',
                        payloadSchema: 'nei.preferences.changed.event'
                    }
                }
            },
            logs: {
                descriptorName: 'logs',
                version: '0.4.0',
                methods: {
                    push: {
                        wireName: 'nei.logs.push',
                        paramsSchema: 'nei.logs.push.params',
                        resultSchema: 'nei.logs.push.result',
                        returnsVoid: true
                    },
                    pushMetrics: {
                        wireName: 'nei.logs.pushMetrics',
                        paramsSchema: 'nei.logs.pushMetrics.params',
                        resultSchema: 'nei.logs.pushMetrics.result',
                        returnsVoid: true
                    },
                    uploadLocal: {
                        wireName: 'nei.logs.uploadLocal',
                        resultSchema: 'nei.logs.uploadLocal.result',
                        returnsVoid: true
                    }
                },
                events: {
                    uploadStatusChanged: {
                        wireName: 'nei.logs.uploadStatusChanged',
                        payloadSchema: 'nei.logs.uploadStatusChanged.event'
                    },
                    uploadProgressChanged: {
                        wireName: 'nei.logs.uploadProgressChanged',
                        payloadSchema: 'nei.logs.uploadProgressChanged.event'
                    }
                }
            },
            shortcuts: {
                descriptorName: 'shortcuts',
                version: '0.2.0',
                methods: {
                    listShortcuts: {
                        wireName: 'nei.shortcuts.listShortcuts',
                        resultSchema: 'nei.shortcuts.listShortcuts.result',
                        returnsVoid: false
                    },
                    setShortcutBinding: {
                        wireName: 'nei.shortcuts.setShortcutBinding',
                        paramsSchema: 'nei.shortcuts.setShortcutBinding.params',
                        resultSchema: 'nei.shortcuts.setShortcutBinding.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'nei.shortcuts.changed',
                        payloadSchema: 'nei.shortcuts.changed.event'
                    },
                    triggered: {
                        wireName: 'nei.shortcuts.triggered',
                        payloadSchema: 'nei.shortcuts.triggered.event'
                    }
                }
            },
            features: {
                descriptorName: 'features',
                version: '0.2.0',
                methods: {
                    listFeatures: {
                        wireName: 'nei.features.listFeatures',
                        resultSchema: 'nei.features.listFeatures.result',
                        returnsVoid: false
                    },
                    getFeature: {
                        wireName: 'nei.features.getFeature',
                        paramsSchema: 'nei.features.getFeature.params',
                        resultSchema: 'nei.features.getFeature.result',
                        returnsVoid: false
                    },
                    setOverrideValue: {
                        wireName: 'nei.features.setOverrideValue',
                        paramsSchema: 'nei.features.setOverrideValue.params',
                        resultSchema: 'nei.features.setOverrideValue.result',
                        returnsVoid: true
                    },
                    resetOverrides: {
                        wireName: 'nei.features.resetOverrides',
                        resultSchema: 'nei.features.resetOverrides.result',
                        returnsVoid: true
                    }
                },
                events: {
                    changed: {
                        wireName: 'nei.features.changed',
                        payloadSchema: 'nei.features.changed.event'
                    }
                }
            }
        }
    }
};

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isObjectLike.js
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/* export default */ const lodash_es_isObjectLike = (isObjectLike);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isBoolean.js



/** `Object#toString` result references. */
var boolTag = '[object Boolean]';

/**
 * Checks if `value` is classified as a boolean primitive or object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a boolean, else `false`.
 * @example
 *
 * _.isBoolean(false);
 * // => true
 *
 * _.isBoolean(null);
 * // => false
 */
function isBoolean(value) {
  return value === true || value === false ||
    (lodash_es_isObjectLike(value) && _baseGetTag(value) == boolTag);
}

/* export default */ const lodash_es_isBoolean = (isBoolean);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isNumber.js



/** `Object#toString` result references. */
var numberTag = '[object Number]';

/**
 * Checks if `value` is classified as a `Number` primitive or object.
 *
 * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are
 * classified as numbers, use the `_.isFinite` method.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a number, else `false`.
 * @example
 *
 * _.isNumber(3);
 * // => true
 *
 * _.isNumber(Number.MIN_VALUE);
 * // => true
 *
 * _.isNumber(Infinity);
 * // => true
 *
 * _.isNumber('3');
 * // => false
 */
function isNumber(value) {
  return typeof value == 'number' ||
    (lodash_es_isObjectLike(value) && _baseGetTag(value) == numberTag);
}

/* export default */ const lodash_es_isNumber = (isNumber);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isArray.js
/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/* export default */ const lodash_es_isArray = (isArray);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isString.js




/** `Object#toString` result references. */
var stringTag = '[object String]';

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a string, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' ||
    (!lodash_es_isArray(value) && lodash_es_isObjectLike(value) && _baseGetTag(value) == stringTag);
}

/* export default */ const lodash_es_isString = (isString);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheClear.js
/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/* export default */ const _listCacheClear = (listCacheClear);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/eq.js
/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/* export default */ const lodash_es_eq = (eq);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_assocIndexOf.js


/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (lodash_es_eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/* export default */ const _assocIndexOf = (assocIndexOf);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheDelete.js


/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

/* export default */ const _listCacheDelete = (listCacheDelete);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheGet.js


/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/* export default */ const _listCacheGet = (listCacheGet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheHas.js


/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return _assocIndexOf(this.__data__, key) > -1;
}

/* export default */ const _listCacheHas = (listCacheHas);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_listCacheSet.js


/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

/* export default */ const _listCacheSet = (listCacheSet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_ListCache.js






/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = _listCacheClear;
ListCache.prototype['delete'] = _listCacheDelete;
ListCache.prototype.get = _listCacheGet;
ListCache.prototype.has = _listCacheHas;
ListCache.prototype.set = _listCacheSet;

/* export default */ const _ListCache = (ListCache);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackClear.js


/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new _ListCache;
  this.size = 0;
}

/* export default */ const _stackClear = (stackClear);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackDelete.js
/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

/* export default */ const _stackDelete = (stackDelete);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackGet.js
/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

/* export default */ const _stackGet = (stackGet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackHas.js
/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

/* export default */ const _stackHas = (stackHas);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_coreJsData.js


/** Used to detect overreaching core-js shims. */
var coreJsData = _root["__core-js_shared__"];

/* export default */ const _coreJsData = (coreJsData);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isMasked.js


/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(_coreJsData && _coreJsData.keys && _coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/* export default */ const _isMasked = (isMasked);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_toSource.js
/** Used for built-in method references. */
var funcProto = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/* export default */ const _toSource = (toSource);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsNative.js





/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var _baseIsNative_funcProto = Function.prototype,
    _baseIsNative_objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var _baseIsNative_funcToString = _baseIsNative_funcProto.toString;

/** Used to check objects for own properties. */
var _baseIsNative_hasOwnProperty = _baseIsNative_objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  _baseIsNative_funcToString.call(_baseIsNative_hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!lodash_es_isObject(value) || _isMasked(value)) {
    return false;
  }
  var pattern = lodash_es_isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(_toSource(value));
}

/* export default */ const _baseIsNative = (baseIsNative);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getValue.js
/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/* export default */ const _getValue = (getValue);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getNative.js



/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = _getValue(object, key);
  return _baseIsNative(value) ? value : undefined;
}

/* export default */ const _getNative = (getNative);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Map.js



/* Built-in method references that are verified to be native. */
var _Map_Map = _getNative(_root, 'Map');

/* export default */ const _Map = (_Map_Map);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_nativeCreate.js


/* Built-in method references that are verified to be native. */
var nativeCreate = _getNative(Object, 'create');

/* export default */ const _nativeCreate = (nativeCreate);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashClear.js


/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = _nativeCreate ? _nativeCreate(null) : {};
  this.size = 0;
}

/* export default */ const _hashClear = (hashClear);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashDelete.js
/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/* export default */ const _hashDelete = (hashDelete);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashGet.js


/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var _hashGet_objectProto = Object.prototype;

/** Used to check objects for own properties. */
var _hashGet_hasOwnProperty = _hashGet_objectProto.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (_nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return _hashGet_hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/* export default */ const _hashGet = (hashGet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashHas.js


/** Used for built-in method references. */
var _hashHas_objectProto = Object.prototype;

/** Used to check objects for own properties. */
var _hashHas_hasOwnProperty = _hashHas_objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return _nativeCreate ? (data[key] !== undefined) : _hashHas_hasOwnProperty.call(data, key);
}

/* export default */ const _hashHas = (hashHas);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_hashSet.js


/** Used to stand-in for `undefined` hash values. */
var _hashSet_HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (_nativeCreate && value === undefined) ? _hashSet_HASH_UNDEFINED : value;
  return this;
}

/* export default */ const _hashSet = (hashSet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Hash.js






/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = _hashClear;
Hash.prototype['delete'] = _hashDelete;
Hash.prototype.get = _hashGet;
Hash.prototype.has = _hashHas;
Hash.prototype.set = _hashSet;

/* export default */ const _Hash = (Hash);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheClear.js




/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new _Hash,
    'map': new (_Map || _ListCache),
    'string': new _Hash
  };
}

/* export default */ const _mapCacheClear = (mapCacheClear);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isKeyable.js
/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/* export default */ const _isKeyable = (isKeyable);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getMapData.js


/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return _isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/* export default */ const _getMapData = (getMapData);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheDelete.js


/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = _getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/* export default */ const _mapCacheDelete = (mapCacheDelete);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheGet.js


/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return _getMapData(this, key).get(key);
}

/* export default */ const _mapCacheGet = (mapCacheGet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheHas.js


/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return _getMapData(this, key).has(key);
}

/* export default */ const _mapCacheHas = (mapCacheHas);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapCacheSet.js


/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = _getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

/* export default */ const _mapCacheSet = (mapCacheSet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_MapCache.js






/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = _mapCacheClear;
MapCache.prototype['delete'] = _mapCacheDelete;
MapCache.prototype.get = _mapCacheGet;
MapCache.prototype.has = _mapCacheHas;
MapCache.prototype.set = _mapCacheSet;

/* export default */ const _MapCache = (MapCache);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_stackSet.js




/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof _ListCache) {
    var pairs = data.__data__;
    if (!_Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new _MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

/* export default */ const _stackSet = (stackSet);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Stack.js







/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new _ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = _stackClear;
Stack.prototype['delete'] = _stackDelete;
Stack.prototype.get = _stackGet;
Stack.prototype.has = _stackHas;
Stack.prototype.set = _stackSet;

/* export default */ const _Stack = (Stack);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_setCacheAdd.js
/** Used to stand-in for `undefined` hash values. */
var _setCacheAdd_HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, _setCacheAdd_HASH_UNDEFINED);
  return this;
}

/* export default */ const _setCacheAdd = (setCacheAdd);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_setCacheHas.js
/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {boolean} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

/* export default */ const _setCacheHas = (setCacheHas);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_SetCache.js




/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new _MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = _setCacheAdd;
SetCache.prototype.has = _setCacheHas;

/* export default */ const _SetCache = (SetCache);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arraySome.js
/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

/* export default */ const _arraySome = (arraySome);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_cacheHas.js
/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

/* export default */ const _cacheHas = (cacheHas);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_equalArrays.js




/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Check that cyclic values are equal.
  var arrStacked = stack.get(array);
  var othStacked = stack.get(other);
  if (arrStacked && othStacked) {
    return arrStacked == other && othStacked == array;
  }
  var index = -1,
      result = true,
      seen = (bitmask & COMPARE_UNORDERED_FLAG) ? new _SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!_arraySome(other, function(othValue, othIndex) {
            if (!_cacheHas(seen, othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, bitmask, customizer, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

/* export default */ const _equalArrays = (equalArrays);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Uint8Array.js


/** Built-in value references. */
var Uint8Array = _root.Uint8Array;

/* export default */ const _Uint8Array = (Uint8Array);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_mapToArray.js
/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

/* export default */ const _mapToArray = (mapToArray);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_setToArray.js
/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

/* export default */ const _setToArray = (setToArray);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_equalByTag.js







/** Used to compose bitmasks for value comparisons. */
var _equalByTag_COMPARE_PARTIAL_FLAG = 1,
    _equalByTag_COMPARE_UNORDERED_FLAG = 2;

/** `Object#toString` result references. */
var _equalByTag_boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    mapTag = '[object Map]',
    _equalByTag_numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    _equalByTag_stringTag = '[object String]',
    symbolTag = '[object Symbol]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]';

/** Used to convert symbols to primitives and strings. */
var symbolProto = _Symbol ? _Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new _Uint8Array(object), new _Uint8Array(other))) {
        return false;
      }
      return true;

    case _equalByTag_boolTag:
    case dateTag:
    case _equalByTag_numberTag:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return lodash_es_eq(+object, +other);

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case regexpTag:
    case _equalByTag_stringTag:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag:
      var convert = _mapToArray;

    case setTag:
      var isPartial = bitmask & _equalByTag_COMPARE_PARTIAL_FLAG;
      convert || (convert = _setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= _equalByTag_COMPARE_UNORDERED_FLAG;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = _equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack['delete'](object);
      return result;

    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}

/* export default */ const _equalByTag = (equalByTag);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arrayPush.js
/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/* export default */ const _arrayPush = (arrayPush);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseGetAllKeys.js



/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return lodash_es_isArray(object) ? result : _arrayPush(result, symbolsFunc(object));
}

/* export default */ const _baseGetAllKeys = (baseGetAllKeys);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arrayFilter.js
/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

/* export default */ const _arrayFilter = (arrayFilter);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/stubArray.js
/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

/* export default */ const lodash_es_stubArray = (stubArray);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getSymbols.js



/** Used for built-in method references. */
var _getSymbols_objectProto = Object.prototype;

/** Built-in value references. */
var propertyIsEnumerable = _getSymbols_objectProto.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols ? lodash_es_stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return _arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

/* export default */ const _getSymbols = (getSymbols);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseTimes.js
/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/* export default */ const _baseTimes = (baseTimes);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsArguments.js



/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return lodash_es_isObjectLike(value) && _baseGetTag(value) == argsTag;
}

/* export default */ const _baseIsArguments = (baseIsArguments);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isArguments.js



/** Used for built-in method references. */
var isArguments_objectProto = Object.prototype;

/** Used to check objects for own properties. */
var isArguments_hasOwnProperty = isArguments_objectProto.hasOwnProperty;

/** Built-in value references. */
var isArguments_propertyIsEnumerable = isArguments_objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
  return lodash_es_isObjectLike(value) && isArguments_hasOwnProperty.call(value, 'callee') &&
    !isArguments_propertyIsEnumerable.call(value, 'callee');
};

/* export default */ const lodash_es_isArguments = (isArguments);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/stubFalse.js
/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

/* export default */ const lodash_es_stubFalse = (stubFalse);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isBuffer.js



/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? _root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || lodash_es_stubFalse;

/* export default */ const lodash_es_isBuffer = (isBuffer);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isIndex.js
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

/* export default */ const _isIndex = (isIndex);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isLength.js
/** Used as references for various `Number` constants. */
var isLength_MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= isLength_MAX_SAFE_INTEGER;
}

/* export default */ const lodash_es_isLength = (isLength);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsTypedArray.js




/** `Object#toString` result references. */
var _baseIsTypedArray_argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    _baseIsTypedArray_boolTag = '[object Boolean]',
    _baseIsTypedArray_dateTag = '[object Date]',
    _baseIsTypedArray_errorTag = '[object Error]',
    _baseIsTypedArray_funcTag = '[object Function]',
    _baseIsTypedArray_mapTag = '[object Map]',
    _baseIsTypedArray_numberTag = '[object Number]',
    objectTag = '[object Object]',
    _baseIsTypedArray_regexpTag = '[object RegExp]',
    _baseIsTypedArray_setTag = '[object Set]',
    _baseIsTypedArray_stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var _baseIsTypedArray_arrayBufferTag = '[object ArrayBuffer]',
    _baseIsTypedArray_dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[_baseIsTypedArray_argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[_baseIsTypedArray_arrayBufferTag] = typedArrayTags[_baseIsTypedArray_boolTag] =
typedArrayTags[_baseIsTypedArray_dataViewTag] = typedArrayTags[_baseIsTypedArray_dateTag] =
typedArrayTags[_baseIsTypedArray_errorTag] = typedArrayTags[_baseIsTypedArray_funcTag] =
typedArrayTags[_baseIsTypedArray_mapTag] = typedArrayTags[_baseIsTypedArray_numberTag] =
typedArrayTags[objectTag] = typedArrayTags[_baseIsTypedArray_regexpTag] =
typedArrayTags[_baseIsTypedArray_setTag] = typedArrayTags[_baseIsTypedArray_stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return lodash_es_isObjectLike(value) &&
    lodash_es_isLength(value.length) && !!typedArrayTags[_baseGetTag(value)];
}

/* export default */ const _baseIsTypedArray = (baseIsTypedArray);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseUnary.js
/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/* export default */ const _baseUnary = (baseUnary);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_nodeUtil.js


/** Detect free variable `exports`. */
var _nodeUtil_freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var _nodeUtil_freeModule = _nodeUtil_freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var _nodeUtil_moduleExports = _nodeUtil_freeModule && _nodeUtil_freeModule.exports === _nodeUtil_freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = _nodeUtil_moduleExports && _freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = _nodeUtil_freeModule && _nodeUtil_freeModule.require && _nodeUtil_freeModule.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* export default */ const _nodeUtil = (nodeUtil);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isTypedArray.js




/* Node.js helper references. */
var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? _baseUnary(nodeIsTypedArray) : _baseIsTypedArray;

/* export default */ const lodash_es_isTypedArray = (isTypedArray);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_arrayLikeKeys.js







/** Used for built-in method references. */
var _arrayLikeKeys_objectProto = Object.prototype;

/** Used to check objects for own properties. */
var _arrayLikeKeys_hasOwnProperty = _arrayLikeKeys_objectProto.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = lodash_es_isArray(value),
      isArg = !isArr && lodash_es_isArguments(value),
      isBuff = !isArr && !isArg && lodash_es_isBuffer(value),
      isType = !isArr && !isArg && !isBuff && lodash_es_isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? _baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || _arrayLikeKeys_hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           _isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/* export default */ const _arrayLikeKeys = (arrayLikeKeys);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_isPrototype.js
/** Used for built-in method references. */
var _isPrototype_objectProto = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || _isPrototype_objectProto;

  return value === proto;
}

/* export default */ const _isPrototype = (isPrototype);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_overArg.js
/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/* export default */ const _overArg = (overArg);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_nativeKeys.js


/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = _overArg(Object.keys, Object);

/* export default */ const _nativeKeys = (nativeKeys);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseKeys.js



/** Used for built-in method references. */
var _baseKeys_objectProto = Object.prototype;

/** Used to check objects for own properties. */
var _baseKeys_hasOwnProperty = _baseKeys_objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!_isPrototype(object)) {
    return _nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (_baseKeys_hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/* export default */ const _baseKeys = (baseKeys);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isArrayLike.js



/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && lodash_es_isLength(value.length) && !lodash_es_isFunction(value);
}

/* export default */ const lodash_es_isArrayLike = (isArrayLike);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/keys.js




/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return lodash_es_isArrayLike(object) ? _arrayLikeKeys(object) : _baseKeys(object);
}

/* export default */ const lodash_es_keys = (keys);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getAllKeys.js




/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return _baseGetAllKeys(object, lodash_es_keys, _getSymbols);
}

/* export default */ const _getAllKeys = (getAllKeys);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_equalObjects.js


/** Used to compose bitmasks for value comparisons. */
var _equalObjects_COMPARE_PARTIAL_FLAG = 1;

/** Used for built-in method references. */
var _equalObjects_objectProto = Object.prototype;

/** Used to check objects for own properties. */
var _equalObjects_hasOwnProperty = _equalObjects_objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & _equalObjects_COMPARE_PARTIAL_FLAG,
      objProps = _getAllKeys(object),
      objLength = objProps.length,
      othProps = _getAllKeys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : _equalObjects_hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  // Check that cyclic values are equal.
  var objStacked = stack.get(object);
  var othStacked = stack.get(other);
  if (objStacked && othStacked) {
    return objStacked == other && othStacked == object;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

/* export default */ const _equalObjects = (equalObjects);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_DataView.js



/* Built-in method references that are verified to be native. */
var DataView = _getNative(_root, 'DataView');

/* export default */ const _DataView = (DataView);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Promise.js



/* Built-in method references that are verified to be native. */
var _Promise_Promise = _getNative(_root, 'Promise');

/* export default */ const _Promise = (_Promise_Promise);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Set.js



/* Built-in method references that are verified to be native. */
var _Set_Set = _getNative(_root, 'Set');

/* export default */ const _Set = (_Set_Set);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_WeakMap.js



/* Built-in method references that are verified to be native. */
var WeakMap = _getNative(_root, 'WeakMap');

/* export default */ const _WeakMap = (WeakMap);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getTag.js








/** `Object#toString` result references. */
var _getTag_mapTag = '[object Map]',
    _getTag_objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    _getTag_setTag = '[object Set]',
    _getTag_weakMapTag = '[object WeakMap]';

var _getTag_dataViewTag = '[object DataView]';

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = _toSource(_DataView),
    mapCtorString = _toSource(_Map),
    promiseCtorString = _toSource(_Promise),
    setCtorString = _toSource(_Set),
    weakMapCtorString = _toSource(_WeakMap);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = _baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((_DataView && getTag(new _DataView(new ArrayBuffer(1))) != _getTag_dataViewTag) ||
    (_Map && getTag(new _Map) != _getTag_mapTag) ||
    (_Promise && getTag(_Promise.resolve()) != promiseTag) ||
    (_Set && getTag(new _Set) != _getTag_setTag) ||
    (_WeakMap && getTag(new _WeakMap) != _getTag_weakMapTag)) {
  getTag = function(value) {
    var result = _baseGetTag(value),
        Ctor = result == _getTag_objectTag ? value.constructor : undefined,
        ctorString = Ctor ? _toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return _getTag_dataViewTag;
        case mapCtorString: return _getTag_mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return _getTag_setTag;
        case weakMapCtorString: return _getTag_weakMapTag;
      }
    }
    return result;
  };
}

/* export default */ const _getTag = (getTag);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsEqualDeep.js









/** Used to compose bitmasks for value comparisons. */
var _baseIsEqualDeep_COMPARE_PARTIAL_FLAG = 1;

/** `Object#toString` result references. */
var _baseIsEqualDeep_argsTag = '[object Arguments]',
    _baseIsEqualDeep_arrayTag = '[object Array]',
    _baseIsEqualDeep_objectTag = '[object Object]';

/** Used for built-in method references. */
var _baseIsEqualDeep_objectProto = Object.prototype;

/** Used to check objects for own properties. */
var _baseIsEqualDeep_hasOwnProperty = _baseIsEqualDeep_objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = lodash_es_isArray(object),
      othIsArr = lodash_es_isArray(other),
      objTag = objIsArr ? _baseIsEqualDeep_arrayTag : _getTag(object),
      othTag = othIsArr ? _baseIsEqualDeep_arrayTag : _getTag(other);

  objTag = objTag == _baseIsEqualDeep_argsTag ? _baseIsEqualDeep_objectTag : objTag;
  othTag = othTag == _baseIsEqualDeep_argsTag ? _baseIsEqualDeep_objectTag : othTag;

  var objIsObj = objTag == _baseIsEqualDeep_objectTag,
      othIsObj = othTag == _baseIsEqualDeep_objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && lodash_es_isBuffer(object)) {
    if (!lodash_es_isBuffer(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new _Stack);
    return (objIsArr || lodash_es_isTypedArray(object))
      ? _equalArrays(object, other, bitmask, customizer, equalFunc, stack)
      : _equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & _baseIsEqualDeep_COMPARE_PARTIAL_FLAG)) {
    var objIsWrapped = objIsObj && _baseIsEqualDeep_hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && _baseIsEqualDeep_hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new _Stack);
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new _Stack);
  return _equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}

/* export default */ const _baseIsEqualDeep = (baseIsEqualDeep);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseIsEqual.js



/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Unordered comparison
 *  2 - Partial comparison
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!lodash_es_isObjectLike(value) && !lodash_es_isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return _baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
}

/* export default */ const _baseIsEqual = (baseIsEqual);

;// CONCATENATED MODULE: ../../node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isEqual.js


/**
 * Performs a deep comparison between two values to determine if they are
 * equivalent.
 *
 * **Note:** This method supports comparing arrays, array buffers, booleans,
 * date objects, error objects, maps, numbers, `Object` objects, regexes,
 * sets, strings, symbols, and typed arrays. `Object` objects are compared
 * by their own, not inherited, enumerable properties. Functions and DOM
 * nodes are compared by strict equality, i.e. `===`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.isEqual(object, other);
 * // => true
 *
 * object === other;
 * // => false
 */
function isEqual(value, other) {
  return _baseIsEqual(value, other);
}

/* export default */ const lodash_es_isEqual = (isEqual);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/utils/runtime.ts
// Generated by scripts/generate.mts. Do not edit.



const isRecord = (value)=>lodash_es_isObject(value) && !lodash_es_isFunction(value) && !Array.isArray(value);
const isPrimitiveBoolean = (value)=>lodash_es_isBoolean(value) && !lodash_es_isObject(value);
const isPrimitiveNumber = (value)=>lodash_es_isNumber(value) && !lodash_es_isObject(value);
const isPrimitiveString = (value)=>lodash_es_isString(value) && !lodash_es_isObject(value);
const resolveSchema = (schema)=>{
    if (isPrimitiveBoolean(schema) || !isPrimitiveString(schema.$ref)) {
        return schema;
    }
    const prefix = '#/$defs/';
    if (!schema.$ref.startsWith(prefix)) {
        throw new Error('Platform interface schema contains an unsupported reference');
    }
    const name = schema.$ref.slice(prefix.length);
    const resolved = schemaDefinitions[name];
    if (!resolved) {
        throw new Error(`Platform interface schema was not found: ${name}`);
    }
    return resolved;
};
const matchesSchema = (inputSchema, value)=>{
    const schema = resolveSchema(inputSchema);
    if (isPrimitiveBoolean(schema)) {
        return schema;
    }
    if ('const' in schema && !lodash_es_isEqual(schema.const, value)) {
        return false;
    }
    if (Array.isArray(schema.enum) && !schema.enum.some((candidate)=>lodash_es_isEqual(candidate, value))) {
        return false;
    }
    if (Array.isArray(schema.anyOf) && !schema.anyOf.some((candidate)=>matchesSchema(candidate, value))) {
        return false;
    }
    if (Array.isArray(schema.allOf) && !schema.allOf.every((candidate)=>matchesSchema(candidate, value))) {
        return false;
    }
    if ('not' in schema && matchesSchema(schema.not, value)) {
        return false;
    }
    if ('if' in schema) {
        let branch = schema.else;
        if (matchesSchema(schema.if, value)) {
            branch = schema.then;
        }
        if (branch !== undefined && !matchesSchema(branch, value)) {
            return false;
        }
    }
    if (schema.type === 'null') {
        return value === null;
    }
    if (schema.type === 'string') {
        if (!isPrimitiveString(value)) {
            return false;
        }
        if (!isPrimitiveString(schema.pattern)) {
            return true;
        }
        return new RegExp(schema.pattern).test(value);
    }
    if (schema.type === 'boolean') {
        return isPrimitiveBoolean(value);
    }
    if (schema.type === 'number' || schema.type === 'integer') {
        if (!isPrimitiveNumber(value) || !Number.isFinite(value) || schema.type === 'integer' && !Number.isInteger(value)) {
            return false;
        }
        if (isPrimitiveNumber(schema.minimum) && value < schema.minimum || isPrimitiveNumber(schema.exclusiveMinimum) && value <= schema.exclusiveMinimum) {
            return false;
        }
        if (!isPrimitiveNumber(schema.maximum)) {
            return true;
        }
        return value <= schema.maximum;
    }
    if (schema.type === 'array') {
        if (!Array.isArray(value)) {
            return false;
        }
        if (isPrimitiveNumber(schema.minItems) && value.length < schema.minItems) {
            return false;
        }
        if (isPrimitiveNumber(schema.maxItems) && value.length > schema.maxItems) {
            return false;
        }
        if (Array.isArray(schema.prefixItems)) {
            return schema.prefixItems.every((item, index)=>matchesSchema(item, value[index]));
        }
        return schema.items === undefined || value.every((item)=>matchesSchema(schema.items, item));
    }
    if (schema.type === 'object' || 'required' in schema || 'properties' in schema || 'additionalProperties' in schema) {
        if (!isRecord(value)) {
            return false;
        }
        let required = [];
        if (Array.isArray(schema.required)) {
            required = schema.required;
        }
        if (required.some((property)=>!isPrimitiveString(property) || !(property in value))) {
            return false;
        }
        let properties = {};
        if (isRecord(schema.properties)) {
            properties = schema.properties;
        }
        for (const [property, propertyValue] of Object.entries(value)){
            const propertySchema = properties[property];
            if (propertySchema !== undefined) {
                if (!matchesSchema(propertySchema, propertyValue)) {
                    return false;
                }
            } else if (schema.additionalProperties === false) {
                return false;
            } else if (schema.additionalProperties !== undefined && !matchesSchema(schema.additionalProperties, propertyValue)) {
                return false;
            }
        }
    }
    return true;
};
const runtime_assertContractValue = (schemaName, value)=>{
    const schema = schemaDefinitions[schemaName];
    if (!schema) {
        throw new Error(`Platform interface schema was not found: ${schemaName}`);
    }
    if (!matchesSchema(schema, value)) {
        const error = {
            code: (/* inlined export .InterfaceErrorCode.InvalidArgument */"INVALID_ARGUMENT"),
            message: `Value does not match platform interface schema: ${schemaName}`
        };
        throw error;
    }
};
const readInterfaceErrorData = (error)=>{
    try {
        if (!isRecord(error)) {
            return null;
        }
        const permissionId = error.permissionId;
        const data = {
            code: error.code,
            message: error.message
        };
        if (permissionId !== undefined) {
            data.permissionId = permissionId;
        }
        if (!matchesSchema({
            $ref: '#/$defs/InterfaceErrorData'
        }, data)) {
            return null;
        }
        return data;
    } catch  {
        // Error properties may be backed by hostile getters. Do not observe any
        // additional properties after a failed read.
        return null;
    }
};
const runtime_asInterfaceError = (error)=>{
    const data = readInterfaceErrorData(error);
    if (data) {
        return data;
    }
    return {
        code: (/* inlined export .InterfaceErrorCode.Internal */"INTERNAL"),
        message: 'Platform interface operation failed'
    };
};
const createInterfaceDescriptor = (kind, modules)=>{
    const descriptorModules = new Map();
    for (const moduleDefinition of Object.values(modules)){
        const existing = descriptorModules.get(moduleDefinition.descriptorName);
        if (existing && existing.version !== moduleDefinition.version) {
            throw new Error(`Platform interface namespace module versions disagree: ${moduleDefinition.descriptorName}`);
        }
        descriptorModules.set(moduleDefinition.descriptorName, {
            name: moduleDefinition.descriptorName,
            version: moduleDefinition.version,
            availability: (/* inlined export .ModuleAvailability.Available */"available")
        });
    }
    return {
        kind,
        contractVersion: '0.30.0',
        modules: [
            ...descriptorModules.values()
        ]
    };
};
const assertInterfaceDescriptor = (actual, expected)=>{
    runtime_assertContractValue('InterfaceDescriptor', actual);
    const descriptor = actual;
    if (descriptor.kind !== expected.kind || descriptor.contractVersion !== expected.contractVersion || descriptor.modules.length !== expected.modules.length) {
        throw new Error('Platform interface descriptor is incompatible');
    }
    const actualModules = new Map(descriptor.modules.map((module)=>[
            module.name,
            module
        ]));
    for (const expectedModule of expected.modules){
        const actualModule = actualModules.get(expectedModule.name);
        if (!actualModule || actualModule.version !== expectedModule.version || actualModule.availability !== expectedModule.availability) {
            throw new Error(`Platform interface module is incompatible: ${expectedModule.name}`);
        }
    }
};
const assertCrossPlatformInterfaceDescriptor = (actual, expected)=>{
    runtime_assertContractValue('InterfaceDescriptor', actual);
    const descriptor = actual;
    const expectedModules = new Map(expected.modules.map((module)=>[
            module.name,
            module
        ]));
    if (descriptor.kind !== expected.kind || descriptor.contractVersion !== expected.contractVersion || descriptor.modules.length !== expected.modules.length || descriptor.modules.some((module)=>expectedModules.get(module.name)?.version !== module.version)) {
        throw new Error('Cross-platform interface descriptor is incompatible');
    }
    const platformNames = new Set([
        'macos',
        'windows',
        'linux'
    ]);
    const optionalModuleNames = new Set([
        'audio',
        'deviceConnectors'
    ]);
    const platformModules = descriptor.modules.filter((module)=>platformNames.has(module.name));
    const commonModules = descriptor.modules.filter((module)=>!platformNames.has(module.name) && !optionalModuleNames.has(module.name));
    const optionalModules = descriptor.modules.filter((module)=>optionalModuleNames.has(module.name));
    if (commonModules.some((module)=>module.availability !== (/* inlined export .ModuleAvailability.Available */"available")) || optionalModules.some((module)=>module.availability !== (/* inlined export .ModuleAvailability.Available */"available") && module.availability !== (/* inlined export .ModuleAvailability.Unsupported */"unsupported")) || platformModules.filter((module)=>module.availability === (/* inlined export .ModuleAvailability.Available */"available")).length !== 1 || platformModules.filter((module)=>module.availability === (/* inlined export .ModuleAvailability.Unsupported */"unsupported")).length !== 2) {
        throw new Error('Cross-platform interface availability is incompatible');
    }
};
const assertWebExtendedInterfaceDescriptor = (actual, expected)=>{
    runtime_assertContractValue('InterfaceDescriptor', actual);
    const descriptor = actual;
    if (descriptor.kind !== expected.kind || descriptor.contractVersion !== expected.contractVersion || descriptor.modules.length !== expected.modules.length) {
        throw new Error('Web extended interface descriptor is incompatible');
    }
    const actualModules = new Map(descriptor.modules.map((moduleDescriptor)=>[
            moduleDescriptor.name,
            moduleDescriptor
        ]));
    const optionalModuleNames = new Set([
        'debug',
        'record'
    ]);
    for (const expectedModule of expected.modules){
        const actualModule = actualModules.get(expectedModule.name);
        const optionalModuleAvailability = optionalModuleNames.has(expectedModule.name) && (actualModule?.availability === (/* inlined export .ModuleAvailability.Available */"available") || actualModule?.availability === (/* inlined export .ModuleAvailability.Unsupported */"unsupported"));
        if (!actualModule || actualModule.version !== expectedModule.version || !optionalModuleAvailability && actualModule.availability !== expectedModule.availability) {
            throw new Error(`Web extended interface module is incompatible: ${expectedModule.name}`);
        }
    }
};
const getMethodDefinition = (interfaceDefinition, moduleName, methodName)=>{
    const definition = interfaceDefinition.modules[moduleName]?.methods[methodName];
    if (!definition) {
        throw new TypeError(`Unknown platform interface method: ${moduleName}.${methodName}`);
    }
    return definition;
};
const getEventDefinition = (interfaceDefinition, moduleName, eventName)=>{
    const definition = interfaceDefinition.modules[moduleName]?.events[eventName];
    if (!definition) {
        throw new TypeError(`Unknown platform interface event: ${moduleName}.${eventName}`);
    }
    return definition;
};


;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/utils/interface-impl.ts
// Generated by scripts/generate.mts. Do not edit.



const assertWireResult = (schemaName, value)=>{
    try {
        assertContractValue(schemaName, value);
    } catch  {
        const error = {
            code: (/* inlined export .InterfaceErrorCode.Internal */"INTERNAL"),
            message: 'Platform interface returned an invalid value'
        };
        throw error;
    }
};
const getImplModule = (impl, moduleName)=>{
    if (!isObject(impl) || isFunction(impl)) {
        throw new TypeError('Platform interface impl must be an object');
    }
    let moduleImpl = impl;
    for (const segment of moduleName.split('.')){
        if (!isObject(moduleImpl) || isFunction(moduleImpl)) {
            throw new TypeError(`Platform interface module impl was not found: ${moduleName}`);
        }
        moduleImpl = moduleImpl[segment];
    }
    if (!isObject(moduleImpl) || isFunction(moduleImpl)) {
        throw new TypeError(`Platform interface module impl was not found: ${moduleName}`);
    }
    return moduleImpl;
};

// EXTERNAL MODULE: ../../node_modules/.pnpm/vscode-jsonrpc@9.0.1/node_modules/vscode-jsonrpc/lib/common/api.js
var api = __webpack_require__(286);
;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/utils/json-rpc-interface.ts
// Generated by scripts/generate.mts. Do not edit.


const createBusinessResponseError = (error)=>{
    if (error instanceof ResponseError) {
        return error;
    }
    return createSanitizedBusinessResponseError(error);
};
const createSanitizedBusinessResponseError = (error)=>{
    const data = asInterfaceError(error);
    return new ResponseError(-32000, data.message, data);
};

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/utils/index.ts
// Generated by scripts/generate.mts. Do not edit.





;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/manager/consts.ts
// Generated by scripts/generate.mts. Do not edit.
const contextBridgeIdentifier = Symbol('ContextBridge');
const ipcRendererIdentifier = Symbol('IpcRenderer');

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/web-extended-rpc/consts.ts
// Generated by scripts/generate.mts. Do not edit.

const WEB_EXTENDED_DESCRIPTOR = createInterfaceDescriptor(interfaceDefinitions.wei.kind, interfaceDefinitions.wei.modules);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/web-extended-rpc/index.ts
// Generated by scripts/generate.mts. Do not edit.









class WebExtendedRpc {
    initialize() {
        this.descriptor = this.loadDescriptor();
        this.observeDescriptor(this.descriptor);
        this.ipcRenderer.on('wei.platform.event', (_event, value)=>{
            this.dispatchEvent(value);
        });
    }
    invoke(moduleName, methodName, params) {
        return this.invokeMethod(moduleName, methodName, params);
    }
    async subscribe(moduleName, eventName, listener) {
        let cleanupWireName;
        let listening = false;
        try {
            await this.descriptor;
            this.assertModuleAvailable(moduleName);
            const definition = getEventDefinition(interfaceDefinitions.wei, moduleName, eventName);
            const wireName = definition.wireName;
            const firstListener = this.events.listenerCount(wireName) === 0;
            cleanupWireName = wireName;
            this.events.on(wireName, listener);
            listening = true;
            if (firstListener) {
                await this.invokeChannel('wei.platform.subscribe', {
                    moduleName,
                    eventName
                });
            }
            let subscribed = true;
            return Object.freeze({
                unsubscribe: async ()=>{
                    try {
                        if (!subscribed) {
                            return;
                        }
                        subscribed = false;
                        this.events.off(wireName, listener);
                        if (this.events.listenerCount(wireName) === 0) {
                            await this.invokeChannel('wei.platform.unsubscribe', {
                                moduleName,
                                eventName
                            });
                        }
                    } catch (error) {
                        throw runtime_asInterfaceError(error);
                    }
                }
            });
        } catch (error) {
            if (listening && cleanupWireName !== undefined) {
                try {
                    this.events.off(cleanupWireName, listener);
                } catch (cleanupError) {
                    throw runtime_asInterfaceError(cleanupError);
                }
            }
            throw runtime_asInterfaceError(error);
        }
    }
    async invokeMethod(moduleName, methodName, params) {
        try {
            await this.descriptor;
            this.assertModuleAvailable(moduleName);
            const definition = getMethodDefinition(interfaceDefinitions.wei, moduleName, methodName);
            if (definition.paramsSchema) {
                runtime_assertContractValue(definition.paramsSchema, params);
            }
            const result = await this.invokeChannel(definition.wireName, params);
            runtime_assertContractValue(definition.resultSchema, result);
            if (definition.returnsVoid) {
                return undefined;
            }
            return result;
        } catch (error) {
            throw runtime_asInterfaceError(error);
        }
    }
    async loadDescriptor() {
        try {
            const value = await this.invokeChannel('wei.platform.descriptor');
            assertWebExtendedInterfaceDescriptor(value, WEB_EXTENDED_DESCRIPTOR);
            this.descriptorValue = value;
        } catch (error) {
            throw runtime_asInterfaceError(error);
        }
    }
    async observeDescriptor(descriptor) {
        try {
            await descriptor;
        } catch  {
        // Public operations still receive the descriptor failure from the original promise.
        }
    }
    assertModuleAvailable(moduleName) {
        const descriptorName = moduleName.split('.')[0];
        const moduleDescriptor = this.descriptorValue.modules.find((candidate)=>candidate.name === descriptorName);
        if (moduleDescriptor?.availability === (/* inlined export .ModuleAvailability.Available */"available")) {
            return;
        }
        const error = {
            code: (/* inlined export .InterfaceErrorCode.Unsupported */"UNSUPPORTED"),
            message: `Web extended interface module is unsupported: ${descriptorName}`
        };
        throw error;
    }
    async invokeChannel(channel, params) {
        try {
            let response;
            if (params === undefined) {
                response = await this.ipcRenderer.invoke(channel);
            } else {
                response = await this.ipcRenderer.invoke(channel, params);
            }
            if (!response.ok) {
                throw runtime_asInterfaceError(response.error);
            }
            return response.result;
        } catch (error) {
            throw runtime_asInterfaceError(error);
        }
    }
    dispatchEvent(value) {
        if (!lodash_es_isObject(value) || lodash_es_isFunction(value) || !('moduleName' in value) || !('eventName' in value) || !('payload' in value)) {
            return;
        }
        const moduleName = String(value.moduleName);
        const eventName = String(value.eventName);
        const definition = getEventDefinition(interfaceDefinitions.wei, moduleName, eventName);
        runtime_assertContractValue(definition.payloadSchema, value.payload);
        this.events.emit(definition.wireName, value.payload);
    }
    constructor(){
        this.events = new node_modules_eventemitter3();
    }
}
__decorate([
    inject(ipcRendererIdentifier),
    __metadata("design:type", typeof IpcRenderer === "undefined" ? Object : IpcRenderer)
], WebExtendedRpc.prototype, "ipcRenderer", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WebExtendedRpc.prototype, "initialize", null);
WebExtendedRpc = __decorate([
    injectable()
], WebExtendedRpc);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/account/index.ts


// Generated by scripts/generate.mts. Do not edit.


class AccountModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('account', eventName, listener);
        };
        this.signInWithOAuth = (params)=>{
            return this.runtime.invoke('account', 'signInWithOAuth', params);
        };
        this.requestEmailCode = (params)=>{
            return this.runtime.invoke('account', 'requestEmailCode', params);
        };
        this.verifyEmailCode = (params)=>{
            return this.runtime.invoke('account', 'verifyEmailCode', params);
        };
        this.requestPhoneCode = (params)=>{
            return this.runtime.invoke('account', 'requestPhoneCode', params);
        };
        this.verifyPhoneCode = (params)=>{
            return this.runtime.invoke('account', 'verifyPhoneCode', params);
        };
        this.getAccountSnapshot = ()=>{
            return this.runtime.invoke('account', 'getAccountSnapshot');
        };
        this.getFreshAccountSnapshot = ()=>{
            return this.runtime.invoke('account', 'getFreshAccountSnapshot');
        };
        this.listAccounts = ()=>{
            return this.runtime.invoke('account', 'listAccounts');
        };
        this.switchAccount = (params)=>{
            return this.runtime.invoke('account', 'switchAccount', params);
        };
        this.signOut = ()=>{
            return this.runtime.invoke('account', 'signOut');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], AccountModule.prototype, "runtime", void 0);
AccountModule = __decorate([
    injectable()
], AccountModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/debug-console/index.ts


// Generated by scripts/generate.mts. Do not edit.


class DebugConsoleModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('debug.console', eventName, listener);
        };
        this.open = ()=>{
            return this.runtime.invoke('debug.console', 'open');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], DebugConsoleModule.prototype, "runtime", void 0);
DebugConsoleModule = __decorate([
    injectable()
], DebugConsoleModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/debug-socket/index.ts


// Generated by scripts/generate.mts. Do not edit.


class DebugSocketModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('debug.socket', eventName, listener);
        };
        this.getState = ()=>{
            return this.runtime.invoke('debug.socket', 'getState');
        };
        this.setPreferredTransport = (params)=>{
            return this.runtime.invoke('debug.socket', 'setPreferredTransport', params);
        };
        this.setOffline = (params)=>{
            return this.runtime.invoke('debug.socket', 'setOffline', params);
        };
        this.setPacketLoss = (params)=>{
            return this.runtime.invoke('debug.socket', 'setPacketLoss', params);
        };
        this.disconnectWorker = ()=>{
            return this.runtime.invoke('debug.socket', 'disconnectWorker');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], DebugSocketModule.prototype, "runtime", void 0);
DebugSocketModule = __decorate([
    injectable()
], DebugSocketModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/features/index.ts


// Generated by scripts/generate.mts. Do not edit.


class FeaturesModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('features', eventName, listener);
        };
        this.listFeatures = ()=>{
            return this.runtime.invoke('features', 'listFeatures');
        };
        this.getFeature = (params)=>{
            return this.runtime.invoke('features', 'getFeature', params);
        };
        this.setOverrideValue = (params)=>{
            return this.runtime.invoke('features', 'setOverrideValue', params);
        };
        this.resetOverrides = ()=>{
            return this.runtime.invoke('features', 'resetOverrides');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], FeaturesModule.prototype, "runtime", void 0);
FeaturesModule = __decorate([
    injectable()
], FeaturesModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/logs/index.ts


// Generated by scripts/generate.mts. Do not edit.


class LogsModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('logs', eventName, listener);
        };
        this.push = (params)=>{
            return this.runtime.invoke('logs', 'push', params);
        };
        this.pushMetrics = (params)=>{
            return this.runtime.invoke('logs', 'pushMetrics', params);
        };
        this.uploadLocal = ()=>{
            return this.runtime.invoke('logs', 'uploadLocal');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], LogsModule.prototype, "runtime", void 0);
LogsModule = __decorate([
    injectable()
], LogsModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/permissions/index.ts


// Generated by scripts/generate.mts. Do not edit.


class PermissionsModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('permissions', eventName, listener);
        };
        this.listPermissions = ()=>{
            return this.runtime.invoke('permissions', 'listPermissions');
        };
        this.getPermissionInfo = (params)=>{
            return this.runtime.invoke('permissions', 'getPermissionInfo', params);
        };
        this.performPermissionAction = (params)=>{
            return this.runtime.invoke('permissions', 'performPermissionAction', params);
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], PermissionsModule.prototype, "runtime", void 0);
PermissionsModule = __decorate([
    injectable()
], PermissionsModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/preferences/index.ts


// Generated by scripts/generate.mts. Do not edit.


class PreferencesModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('preferences', eventName, listener);
        };
        this.listPreferences = ()=>{
            return this.runtime.invoke('preferences', 'listPreferences');
        };
        this.setPreferenceValue = (params)=>{
            return this.runtime.invoke('preferences', 'setPreferenceValue', params);
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], PreferencesModule.prototype, "runtime", void 0);
PreferencesModule = __decorate([
    injectable()
], PreferencesModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/record/index.ts


// Generated by scripts/generate.mts. Do not edit.


class RecordModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('record', eventName, listener);
        };
        this.getState = ()=>{
            return this.runtime.invoke('record', 'getState');
        };
        this.start = (params)=>{
            return this.runtime.invoke('record', 'start', params);
        };
        this.cancel = ()=>{
            return this.runtime.invoke('record', 'cancel');
        };
        this.setPaused = (params)=>{
            return this.runtime.invoke('record', 'setPaused', params);
        };
        this.stop = ()=>{
            return this.runtime.invoke('record', 'stop');
        };
        this.retry = ()=>{
            return this.runtime.invoke('record', 'retry');
        };
        this.exportAudio = ()=>{
            return this.runtime.invoke('record', 'exportAudio');
        };
        this.dismiss = ()=>{
            return this.runtime.invoke('record', 'dismiss');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], RecordModule.prototype, "runtime", void 0);
RecordModule = __decorate([
    injectable()
], RecordModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/runtime/index.ts


// Generated by scripts/generate.mts. Do not edit.


class RuntimeModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('runtime', eventName, listener);
        };
        this.getRuntimeInfo = ()=>{
            return this.runtime.invoke('runtime', 'getRuntimeInfo');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], RuntimeModule.prototype, "runtime", void 0);
RuntimeModule = __decorate([
    injectable()
], RuntimeModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/shell/index.ts


// Generated by scripts/generate.mts. Do not edit.


class ShellModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('shell', eventName, listener);
        };
        this.activate = ()=>{
            return this.runtime.invoke('shell', 'activate');
        };
        this.dismiss = ()=>{
            return this.runtime.invoke('shell', 'dismiss');
        };
        this.openExternal = (params)=>{
            return this.runtime.invoke('shell', 'openExternal', params);
        };
        this.openWebAuthenticationSession = (params)=>{
            return this.runtime.invoke('shell', 'openWebAuthenticationSession', params);
        };
        this.quitApplication = ()=>{
            return this.runtime.invoke('shell', 'quitApplication');
        };
        this.setSize = (params)=>{
            return this.runtime.invoke('shell', 'setSize', params);
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], ShellModule.prototype, "runtime", void 0);
ShellModule = __decorate([
    injectable()
], ShellModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/shortcuts/index.ts


// Generated by scripts/generate.mts. Do not edit.


class ShortcutsModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('shortcuts', eventName, listener);
        };
        this.listShortcuts = ()=>{
            return this.runtime.invoke('shortcuts', 'listShortcuts');
        };
        this.setShortcutBinding = (params)=>{
            return this.runtime.invoke('shortcuts', 'setShortcutBinding', params);
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], ShortcutsModule.prototype, "runtime", void 0);
ShortcutsModule = __decorate([
    injectable()
], ShortcutsModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/socket/index.ts


// Generated by scripts/generate.mts. Do not edit.


class SocketModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('socket', eventName, listener);
        };
        this.getSocketState = ()=>{
            return this.runtime.invoke('socket', 'getSocketState');
        };
        this.forceSync = ()=>{
            return this.runtime.invoke('socket', 'forceSync');
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], SocketModule.prototype, "runtime", void 0);
SocketModule = __decorate([
    injectable()
], SocketModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/tools/index.ts


// Generated by scripts/generate.mts. Do not edit.


class ToolsModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('tools', eventName, listener);
        };
        this.getAuthorization = ()=>{
            return this.runtime.invoke('tools', 'getAuthorization');
        };
        this.setAuthorization = (params)=>{
            return this.runtime.invoke('tools', 'setAuthorization', params);
        };
        this.scanFileInventory = ()=>{
            return this.runtime.invoke('tools', 'scanFileInventory');
        };
        this.uploadFileInventory = ()=>{
            return this.runtime.invoke('tools', 'uploadFileInventory');
        };
        this.listTools = ()=>{
            return this.runtime.invoke('tools', 'listTools');
        };
        this.getToolInfo = (params)=>{
            return this.runtime.invoke('tools', 'getToolInfo', params);
        };
        this.getRunningTasks = ()=>{
            return this.runtime.invoke('tools', 'getRunningTasks');
        };
        this.getTaskInfo = (params)=>{
            return this.runtime.invoke('tools', 'getTaskInfo', params);
        };
        this.cancelTask = (params)=>{
            return this.runtime.invoke('tools', 'cancelTask', params);
        };
        this.startTask = (params)=>{
            return this.runtime.invoke('tools', 'startTask', params);
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], ToolsModule.prototype, "runtime", void 0);
ToolsModule = __decorate([
    injectable()
], ToolsModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/modules/update/index.ts


// Generated by scripts/generate.mts. Do not edit.


class UpdateModule {
    constructor(){
        this.subscribe = (eventName, listener)=>{
            return this.runtime.subscribe('update', eventName, listener);
        };
        this.getVersionInfo = ()=>{
            return this.runtime.invoke('update', 'getVersionInfo');
        };
        this.getUpdateState = ()=>{
            return this.runtime.invoke('update', 'getUpdateState');
        };
        this.performUpdateAction = (params)=>{
            return this.runtime.invoke('update', 'performUpdateAction', params);
        };
    }
}
__decorate([
    inject(WebExtendedRpc),
    __metadata("design:type", typeof WebExtendedRpc === "undefined" ? Object : WebExtendedRpc)
], UpdateModule.prototype, "runtime", void 0);
UpdateModule = __decorate([
    injectable()
], UpdateModule);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/client/index.ts


// Generated by scripts/generate.mts. Do not edit.















class WebExtendedWebClient {
    get debug() {
        return Object.freeze({
            socket: this.debugSocket,
            console: this.debugConsole
        });
    }
}
__decorate([
    inject(RuntimeModule),
    __metadata("design:type", typeof IWebExtendedRuntimeModule === "undefined" ? Object : IWebExtendedRuntimeModule)
], WebExtendedWebClient.prototype, "runtime", void 0);
__decorate([
    inject(AccountModule),
    __metadata("design:type", typeof IWebExtendedAccountModule === "undefined" ? Object : IWebExtendedAccountModule)
], WebExtendedWebClient.prototype, "account", void 0);
__decorate([
    inject(ShellModule),
    __metadata("design:type", typeof IWebExtendedShellModule === "undefined" ? Object : IWebExtendedShellModule)
], WebExtendedWebClient.prototype, "shell", void 0);
__decorate([
    inject(ToolsModule),
    __metadata("design:type", typeof IWebExtendedToolsModule === "undefined" ? Object : IWebExtendedToolsModule)
], WebExtendedWebClient.prototype, "tools", void 0);
__decorate([
    inject(PermissionsModule),
    __metadata("design:type", typeof IWebExtendedPermissionsModule === "undefined" ? Object : IWebExtendedPermissionsModule)
], WebExtendedWebClient.prototype, "permissions", void 0);
__decorate([
    inject(SocketModule),
    __metadata("design:type", typeof IWebExtendedSocketModule === "undefined" ? Object : IWebExtendedSocketModule)
], WebExtendedWebClient.prototype, "socket", void 0);
__decorate([
    inject(PreferencesModule),
    __metadata("design:type", typeof IWebExtendedPreferencesModule === "undefined" ? Object : IWebExtendedPreferencesModule)
], WebExtendedWebClient.prototype, "preferences", void 0);
__decorate([
    inject(LogsModule),
    __metadata("design:type", typeof IWebExtendedLogsModule === "undefined" ? Object : IWebExtendedLogsModule)
], WebExtendedWebClient.prototype, "logs", void 0);
__decorate([
    inject(ShortcutsModule),
    __metadata("design:type", typeof IWebExtendedShortcutsModule === "undefined" ? Object : IWebExtendedShortcutsModule)
], WebExtendedWebClient.prototype, "shortcuts", void 0);
__decorate([
    inject(FeaturesModule),
    __metadata("design:type", typeof IWebExtendedFeaturesModule === "undefined" ? Object : IWebExtendedFeaturesModule)
], WebExtendedWebClient.prototype, "features", void 0);
__decorate([
    inject(RecordModule),
    __metadata("design:type", typeof IWebExtendedRecordModule === "undefined" ? Object : IWebExtendedRecordModule)
], WebExtendedWebClient.prototype, "record", void 0);
__decorate([
    inject(UpdateModule),
    __metadata("design:type", typeof IWebExtendedUpdateModule === "undefined" ? Object : IWebExtendedUpdateModule)
], WebExtendedWebClient.prototype, "update", void 0);
__decorate([
    inject(DebugSocketModule),
    __metadata("design:type", typeof IWebExtendedDebugSocketModule === "undefined" ? Object : IWebExtendedDebugSocketModule)
], WebExtendedWebClient.prototype, "debugSocket", void 0);
__decorate([
    inject(DebugConsoleModule),
    __metadata("design:type", typeof IWebExtendedDebugConsoleModule === "undefined" ? Object : IWebExtendedDebugConsoleModule)
], WebExtendedWebClient.prototype, "debugConsole", void 0);
WebExtendedWebClient = __decorate([
    injectable()
], WebExtendedWebClient);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/utils/web-extended-facade.ts
// Generated by scripts/generate.mts. Do not edit.


const web_extended_facade_getImplModule = (impl, moduleName)=>{
    let moduleImpl = impl;
    for (const segment of moduleName.split('.')){
        if (!lodash_es_isObject(moduleImpl) || lodash_es_isFunction(moduleImpl)) {
            throw new TypeError(`Web extended module impl was not found: ${moduleName}`);
        }
        moduleImpl = moduleImpl[segment];
    }
    if (!lodash_es_isObject(moduleImpl) || lodash_es_isFunction(moduleImpl)) {
        throw new TypeError(`Web extended module impl was not found: ${moduleName}`);
    }
    return moduleImpl;
};
const setFacadeModule = (facade, moduleName, moduleFacade)=>{
    const path = moduleName.split('.');
    const leafName = path.pop();
    if (!leafName) {
        throw new TypeError('Web extended module path is empty');
    }
    let parent = facade;
    for (const segment of path){
        const child = parent[segment];
        if (child === undefined) {
            const next = {};
            parent[segment] = next;
            parent = next;
            continue;
        }
        if (!lodash_es_isObject(child) || lodash_es_isFunction(child)) {
            throw new TypeError(`Web extended namespace module is invalid: ${segment}`);
        }
        parent = child;
    }
    parent[leafName] = moduleFacade;
};
const freezeFacade = (facade)=>{
    for (const [key, value] of Object.entries(facade)){
        if (lodash_es_isObject(value) && !lodash_es_isFunction(value) && !Object.isFrozen(value)) {
            facade[key] = freezeFacade(value);
        }
    }
    return Object.freeze(facade);
};
const createWebExtendedFacade = (impl)=>{
    const facade = {};
    for (const [moduleName, moduleDefinition] of Object.entries(interfaceDefinitions.wei.modules)){
        const moduleImpl = web_extended_facade_getImplModule(impl, moduleName);
        const subscribe = moduleImpl.subscribe;
        if (!lodash_es_isFunction(subscribe)) {
            throw new TypeError(`Web extended subscribe impl was not found: ${moduleName}`);
        }
        const moduleFacade = {
            subscribe: subscribe.bind(moduleImpl)
        };
        for (const methodName of Object.keys(moduleDefinition.methods)){
            const method = moduleImpl[methodName];
            if (!lodash_es_isFunction(method)) {
                throw new TypeError(`Web extended method impl was not found: ${moduleName}.${methodName}`);
            }
            moduleFacade[methodName] = method.bind(moduleImpl);
        }
        setFacadeModule(facade, moduleName, Object.freeze(moduleFacade));
    }
    return freezeFacade(facade);
};

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/utils/index.ts
// Generated by scripts/generate.mts. Do not edit.


;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/manager/index.ts
// Generated by scripts/generate.mts. Do not edit.






class WebPeerManager {
    static create(contextBridge, ipcRenderer) {
        const container = new Container({
            autobind: true,
            defaultScope: 'Singleton'
        });
        container.bind(contextBridgeIdentifier).toConstantValue(contextBridge);
        container.bind(ipcRendererIdentifier).toConstantValue(ipcRenderer);
        return container.get(WebPeerManager);
    }
    expose() {
        this.contextBridge.exposeInMainWorld('__DesktopWebExtendedAPI', createWebExtendedFacade(this.client));
    }
}
__decorate([
    inject(contextBridgeIdentifier),
    __metadata("design:type", typeof ContextBridge === "undefined" ? Object : ContextBridge)
], WebPeerManager.prototype, "contextBridge", void 0);
__decorate([
    inject(WebExtendedWebClient),
    __metadata("design:type", typeof WebExtendedWebClient === "undefined" ? Object : WebExtendedWebClient)
], WebPeerManager.prototype, "client", void 0);
WebPeerManager = __decorate([
    injectable()
], WebPeerManager);

;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/services/index.ts
// Generated by scripts/generate.mts. Do not edit.



;// CONCATENATED MODULE: ../../packages/platform-interface/generated/bridge/web-peer/index.ts
// Generated by scripts/generate.mts. Do not edit.



;// CONCATENATED MODULE: external "electron"
const external_electron_namespaceObject = require("electron");
;// CONCATENATED MODULE: ./src/consts/ipc.ts
const ERROR_PAGE_RESTART_CHANNEL = 'desktop-error-page:restart';

;// CONCATENATED MODULE: ./src/modules/error-page/consts.ts
const ERROR_PAGE_PATH_SUFFIX = '/pages/error-page/index.html';
const ERROR_PAGE_RESTART_LABEL = 'Restart app';
const ERROR_PAGE_RESTARTING_LABEL = 'Restarting…';
const ERROR_PAGE_TITLE = 'Application startup error';
const consts_UNKNOWN_STARTUP_ERROR = 'Unknown startup error';

;// CONCATENATED MODULE: ./src/modules/error-page/utils.ts

const describeStartupError = (error)=>{
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
        return error;
    }
    return UNKNOWN_STARTUP_ERROR;
};
const readErrorPageDescription = (search)=>{
    const description = new URLSearchParams(search).get('desc')?.trim();
    return description || UNKNOWN_STARTUP_ERROR;
};
const isDesktopErrorPageUrl = (value, expectedFileUrl)=>{
    try {
        const url = new URL(value);
        if (url.protocol !== 'file:') {
            return false;
        }
        url.hash = '';
        url.search = '';
        if (expectedFileUrl) {
            const expectedUrl = new URL(expectedFileUrl);
            expectedUrl.hash = '';
            expectedUrl.search = '';
            return url.href === expectedUrl.href;
        }
        const normalizedPath = decodeURIComponent(url.pathname).replaceAll('\\', '/');
        return normalizedPath.endsWith(ERROR_PAGE_PATH_SUFFIX);
    } catch  {
        return false;
    }
};

;// CONCATENATED MODULE: ./src/preload/desktop.ts




WebPeerManager.create(external_electron_namespaceObject.contextBridge, external_electron_namespaceObject.ipcRenderer).expose();
if (isDesktopErrorPageUrl(globalThis.location.href)) {
    const errorPageAPI = {
        restart: ()=>external_electron_namespaceObject.ipcRenderer.invoke(ERROR_PAGE_RESTART_CHANNEL)
    };
    external_electron_namespaceObject.contextBridge.exposeInMainWorld('ClientErrorPageAPI', Object.freeze(errorPageAPI));
}

})();

module.exports = __webpack_exports__;
})()
;