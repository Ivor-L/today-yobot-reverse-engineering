(() => {
var __webpack_modules__ = ({
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
__webpack_modules__[moduleId](module, module.exports, __webpack_require__);

// Return the exports of the module
return module.exports;

}

// webpack/runtime/compat_get_default_export
(() => {
// getDefaultExport function for compatibility with non-ESM modules
__webpack_require__.n = (module) => {
	var getter = module && module.__esModule ?
		() => (module['default']) :
		() => (module);
	__webpack_require__.d(getter, { a: getter });
	return getter;
};

})();
// webpack/runtime/define_property_getters
(() => {
__webpack_require__.d = (exports, getters, values) => {
	var define = (defs, kind) => {
		for(var key in defs) {
			if(__webpack_require__.o(defs, key) && !__webpack_require__.o(exports, key)) {
				Object.defineProperty(exports, key, { enumerable: true, [kind]: defs[key] });
			}
		}
	};
	define(getters, "get");
	define(values, "value");
};
})();
// webpack/runtime/has_own_property
(() => {
__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
})();
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";

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

// EXTERNAL MODULE: ../../node_modules/.pnpm/reflect-metadata@0.2.2/node_modules/reflect-metadata/Reflect.js
var reflect_metadata_Reflect = __webpack_require__(404);
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


function updateMaybeClassMetadataPostConstructor_updateMaybeClassMetadataPostConstructor(methodName) {
    return (metadata) => {
        if (metadata.lifecycle.postConstructMethodNames.has(methodName)) {
            throw new InversifyCoreError(InversifyCoreErrorKind.injectionDecoratorConflict, `Unexpected duplicated postConstruct method ${methodName.toString()}`);
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
            updateOwnReflectMetadata(target.constructor, classMetadataReflectKey, getDefaultClassMetadata, updateMaybeClassMetadataPostConstructor(propertyKey));
        }
        catch (error) {
            handleInjectionError(target, propertyKey, undefined, error);
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
;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/consts.ts
const DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT = Symbol('DesktopWebRuntimeHostParentPort');

;// CONCATENATED MODULE: external "node:diagnostics_channel"
const external_node_diagnostics_channel_namespaceObject = require("node:diagnostics_channel");
;// CONCATENATED MODULE: external "node:string_decoder"
const external_node_string_decoder_namespaceObject = require("node:string_decoder");
;// CONCATENATED MODULE: ./src/consts/web-runtime.ts

const DESKTOP_WEB_RUNTIME_ORIGINS = {
    [(/* inlined export .RuntimeEnvironment.Development */"dev")]: 'http://today-desktop-dev.localhost',
    [(/* inlined export .RuntimeEnvironment.Staging */"staging")]: 'http://today-desktop-staging.localhost',
    [(/* inlined export .RuntimeEnvironment.Production */"prod")]: 'http://today-desktop.localhost'
};

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/consts.ts


const consts_DESKTOP_WEB_RUNTIME_BIND_HOST = '127.0.0.1';
const DESKTOP_WEB_RUNTIME_AUTH_HEADER = 'x-today-desktop-runtime-token';
const consts_DESKTOP_WEB_RUNTIME_HEALTH_PATH = '/build-info.json';
const DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER = 'x-today-desktop-logical-origin';
const DESKTOP_WEB_RUNTIME_PROBE_HEADER = 'x-today-desktop-runtime-probe';
const DESKTOP_WEB_RUNTIME_PROBE_RESPONSE_HEADER = 'x-today-desktop-runtime-proof';
const DESKTOP_WEB_RUNTIME_START_TIMEOUT_MS = 15000;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_MESSAGE_TYPE = 'diagnostic';
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_CONTENT_TYPE_MAX_BYTES = 512;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_ERROR_CODE_MAX_BYTES = 128;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_LIMIT = 240;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS = 60000;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_METHOD_MAX_BYTES = 64;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES = 8 * 1024;
const DESKTOP_WEB_RUNTIME_DIAGNOSTIC_URL_MAX_BYTES = 4 * 1024;
const DESKTOP_WEB_RUNTIME_ENDPOINTS = {
    [(/* inlined export .RuntimeEnvironment.Development */"dev")]: {
        environment: (/* inlined export .RuntimeEnvironment.Development */"dev"),
        origin: DESKTOP_WEB_RUNTIME_ORIGINS[(/* inlined export .RuntimeEnvironment.Development */"dev")]
    },
    [(/* inlined export .RuntimeEnvironment.Staging */"staging")]: {
        environment: (/* inlined export .RuntimeEnvironment.Staging */"staging"),
        origin: DESKTOP_WEB_RUNTIME_ORIGINS[(/* inlined export .RuntimeEnvironment.Staging */"staging")]
    },
    [(/* inlined export .RuntimeEnvironment.Production */"prod")]: {
        environment: (/* inlined export .RuntimeEnvironment.Production */"prod"),
        origin: DESKTOP_WEB_RUNTIME_ORIGINS[(/* inlined export .RuntimeEnvironment.Production */"prod")]
    }
};

;// CONCATENATED MODULE: external "node:path"
const external_node_path_namespaceObject = require("node:path");
;// CONCATENATED MODULE: ./src/app/modules/web-runtime/utils.ts


const APP_ENVIRONMENTS = (/* unused pure expression or super */ null && ({
    dev: 'development',
    staging: 'staging',
    prod: 'production'
}));
const REQUIRED_NO_PROXY_HOSTS = (/* unused pure expression or super */ null && ([
    '127.0.0.1',
    'localhost',
    '.localhost',
    '::1'
]));
const WINDOWS_RUNTIME_ENVIRONMENT_KEYS = (/* unused pure expression or super */ null && ([
    'APPDATA',
    'LOCALAPPDATA',
    'SystemDrive',
    'SystemRoot',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'windir'
]));
const readEnvironmentValue = (environment, ...keys)=>{
    for (const key of keys){
        const value = environment[key]?.trim();
        if (value) {
            return value;
        }
    }
};
const buildNoProxyValue = (environment)=>{
    const configuredEntries = [
        environment.NO_PROXY,
        environment.no_proxy
    ].flatMap((value)=>value ? value.split(',').map((entry)=>entry.trim()).filter(Boolean) : []);
    return [
        ...new Set([
            ...configuredEntries,
            ...REQUIRED_NO_PROXY_HOSTS
        ])
    ].join(',');
};
const buildDesktopWebRuntimeProcessEnvironment = (httpProxy, environment)=>{
    const processEnvironment = {
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_ENV: 'production'
    };
    for (const key of WINDOWS_RUNTIME_ENVIRONMENT_KEYS){
        const value = environment[key]?.trim();
        if (value) {
            processEnvironment[key] = value;
        }
    }
    const extraCaCertificates = readEnvironmentValue(environment, 'NODE_EXTRA_CA_CERTS');
    if (extraCaCertificates) {
        if (!isAbsolute(extraCaCertificates)) {
            throw new Error('NODE_EXTRA_CA_CERTS must be an absolute file path');
        }
        processEnvironment.NODE_EXTRA_CA_CERTS = extraCaCertificates;
    }
    if (!httpProxy) {
        return processEnvironment;
    }
    const proxyUrl = `http://${httpProxy}`;
    return {
        ...processEnvironment,
        HTTP_PROXY: proxyUrl,
        HTTPS_PROXY: proxyUrl,
        NODE_USE_ENV_PROXY: '1',
        NO_PROXY: buildNoProxyValue(environment)
    };
};
const buildDesktopWebRuntimeEnvironment = (endpoint, profile)=>({
        APP_ENV: APP_ENVIRONMENTS[endpoint.environment],
        HOSTNAME: DESKTOP_WEB_RUNTIME_BIND_HOST,
        LOCALHOST_BFF: 'true',
        NEXT_PUBLIC_API_URL: profile.apiBaseUrl,
        NEXT_PUBLIC_APP_URL: profile.webOrigin,
        NEXT_PUBLIC_BASE_DOMAIN: profile.authCookieDomains[0] ?? new URL(profile.webOrigin).hostname,
        NEXT_PUBLIC_BETTER_AUTH_URL: profile.authBaseUrl,
        NEXT_PUBLIC_OIDC_AUTHORITY: profile.authBaseUrl,
        NEXT_PUBLIC_OIDC_CLIENT_ID: profile.oauthClientId,
        NEXT_PUBLIC_TOKEN_AUDIENCE: profile.audience,
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_ENV: 'production',
        OIDC_INTERNAL_AUTHORITY: profile.authBaseUrl,
        PORT: '0',
        VERCEL_ENV: endpoint.environment === 'prod' ? 'production' : 'preview'
    });
const buildDesktopWebRuntimeBackendOrigin = (port)=>{
    return `http://${DESKTOP_WEB_RUNTIME_BIND_HOST}:${port}`;
};
const buildDesktopWebRuntimeHealthUrl = (backendOrigin)=>{
    return `${backendOrigin}${DESKTOP_WEB_RUNTIME_HEALTH_PATH}`;
};
const takeDesktopWebRuntimeTextPrefix = (value, maxBytes = (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_TEXT_MAX_BYTES */8192))=>{
    const bytes = Buffer.from(value);
    if (bytes.byteLength <= maxBytes) {
        return {
            message: value,
            truncated: false
        };
    }
    let end = maxBytes;
    while(end > 0 && (bytes[end] ?? 0) >= 0x80 && (bytes[end] ?? 0) < 0xc0){
        end -= 1;
    }
    return {
        message: bytes.subarray(0, end).toString('utf8'),
        truncated: true
    };
};

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/modules/diagnostics/consts.ts
const DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS = Object.freeze({
    httpError: 'http.client.request.error',
    httpFinish: 'http.client.response.finish',
    httpStart: 'http.client.request.start',
    undiciCreate: 'undici:request:create',
    undiciError: 'undici:request:error',
    undiciHeaders: 'undici:request:headers',
    undiciTrailers: 'undici:request:trailers'
});
const DESKTOP_WEB_RUNTIME_HOST_ERROR_CODE_PATTERN = /^(?:E[A-Z0-9_]{1,63}|ABORT_ERR|CERT_[A-Z0-9_]{1,58}|HPE_[A-Z0-9_]{1,59}|UND_ERR_[A-Z0-9_]{1,55}|net::ERR_[A-Z0-9_]{1,55})$/u;
const DESKTOP_WEB_RUNTIME_HOST_ERROR_NAMES = Object.freeze([
    'AbortError',
    'Error',
    'SystemError',
    'TimeoutError',
    'TypeError'
]);
const DESKTOP_WEB_RUNTIME_HOST_TELEMETRY_SUFFIXES = Object.freeze([
    'posthog.com',
    'sentry.io'
]);

;// CONCATENATED MODULE: external "node:net"
const external_node_net_namespaceObject = require("node:net");
;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/modules/diagnostics/utils.ts




const CONTENT_TYPE_PATTERN = /^[A-Z0-9!#$&^_.+-]+\/[A-Z0-9!#$&^_.+-]+$/iu;
const sanitizeDesktopWebRuntimeHostUrl = (value)=>{
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return undefined;
        }
        const hostname = url.hostname.replace(/\.$/u, '').replace(/^\[|\]$/gu, '').toLowerCase();
        const ipVersion = (0,external_node_net_namespaceObject.isIP)(hostname);
        const isLoopbackIp = ipVersion === 4 && hostname.startsWith('127.') || ipVersion === 6 && (hostname === '::1' || /^::ffff:7f[0-9a-f]{2}:/u.test(hostname));
        if (hostname === 'localhost' || hostname.endsWith('.localhost') || isLoopbackIp) {
            return undefined;
        }
        url.username = '';
        url.password = '';
        url.search = '';
        url.hash = '';
        return takeDesktopWebRuntimeTextPrefix(url.href, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_URL_MAX_BYTES */4096)).message;
    } catch  {
        return undefined;
    }
};
const readHeaderPart = (value)=>{
    if (typeof value === 'string') {
        return value;
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return Buffer.from(value).toString('utf8');
    }
};
const sanitizeContentType = (value)=>{
    const mediaType = value.split(';', 1)[0]?.trim();
    if (!mediaType || !CONTENT_TYPE_PATTERN.test(mediaType)) {
        return undefined;
    }
    let result = '';
    for (const character of mediaType){
        const code = character.codePointAt(0) ?? 0;
        if (code >= 0x20 && code <= 0x7e) {
            result += character;
        }
    }
    if (!CONTENT_TYPE_PATTERN.test(result)) {
        return undefined;
    }
    return Buffer.from(result).subarray(0, (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_CONTENT_TYPE_MAX_BYTES */512)).toString('utf8');
};
const createDesktopWebRuntimeHostUrl = (origin, path)=>{
    if (typeof origin !== 'string' && !(origin instanceof URL) || typeof path !== 'string') {
        return undefined;
    }
    try {
        return sanitizeDesktopWebRuntimeHostNetworkUrl(new URL(path, origin).href);
    } catch  {
        return undefined;
    }
};
const isDesktopWebRuntimeHostTelemetryUrl = (value)=>{
    try {
        const url = new URL(value);
        const hostname = url.hostname.replace(/\.$/u, '').toLowerCase();
        if (url.pathname === '/monitoring' || url.pathname.startsWith('/monitoring/')) {
            return true;
        }
        return DESKTOP_WEB_RUNTIME_HOST_TELEMETRY_SUFFIXES.some((suffix)=>hostname === suffix || hostname.endsWith(`.${suffix}`));
    } catch  {
        return false;
    }
};
const readDesktopWebRuntimeHostContentType = (headers)=>{
    if (Array.isArray(headers)) {
        for(let index = 0; index + 1 < headers.length; index += 2){
            const name = readHeaderPart(headers[index]);
            if (name?.toLowerCase() !== 'content-type') {
                continue;
            }
            const value = readHeaderPart(headers[index + 1]);
            if (value === undefined) {
                return undefined;
            }
            return sanitizeContentType(value);
        }
        return undefined;
    }
    if (!headers || typeof headers !== 'object') {
        return undefined;
    }
    for (const [name, candidate] of Object.entries(headers)){
        if (name.toLowerCase() !== 'content-type') {
            continue;
        }
        const value = Array.isArray(candidate) ? readHeaderPart(candidate[0]) : readHeaderPart(candidate);
        if (value === undefined) {
            return undefined;
        }
        return sanitizeContentType(value);
    }
};
const readDesktopWebRuntimeHostErrorCode = (value)=>{
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    const error = value;
    const code = typeof error.code === 'string' ? error.code.trim() : undefined;
    if (code && DESKTOP_WEB_RUNTIME_HOST_ERROR_CODE_PATTERN.test(code)) {
        return code;
    }
    const name = typeof error.name === 'string' ? error.name.trim() : undefined;
    if (name && DESKTOP_WEB_RUNTIME_HOST_ERROR_NAMES.includes(name)) {
        return name;
    }
};
const readDesktopWebRuntimeHostStatusCode = (value)=>{
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 100 || value > 599) {
        return undefined;
    }
    return value;
};
const resolveDesktopWebRuntimeHostDuration = (startedAt)=>Math.max(0, Math.round(performance.now() - startedAt));
const resolveDesktopWebRuntimeHostLevel = (statusCode, failed)=>{
    if (failed || statusCode !== undefined && statusCode >= 500) {
        return 'error';
    }
    if (statusCode !== undefined && statusCode >= 400) {
        return 'warning';
    }
    return 'log';
};
const sanitizeDesktopWebRuntimeHostMethod = (value)=>{
    if (typeof value !== 'string') {
        return 'UNKNOWN';
    }
    const method = value.trim().toUpperCase();
    if (!/^[A-Z-]{1,32}$/u.test(method)) {
        return 'UNKNOWN';
    }
    if (Buffer.byteLength(method) > (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_METHOD_MAX_BYTES */64)) {
        return 'UNKNOWN';
    }
    return method;
};
const sanitizeDesktopWebRuntimeHostNetworkUrl = (value)=>{
    if (isDesktopWebRuntimeHostTelemetryUrl(value)) {
        return undefined;
    }
    return sanitizeDesktopWebRuntimeHostUrl(value);
};

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/modules/diagnostics/index.ts











const readHttpRequestHost = (request)=>{
    const header = request.getHeader('host');
    if (typeof header === 'string' || typeof header === 'number') {
        return String(header);
    }
    return request.host;
};
class DesktopWebRuntimeHostDiagnostics {
    start(nonce) {
        if (this.started) {
            return;
        }
        if (nonce.length === 0) {
            throw new Error('The packaged Web runtime diagnostics nonce is missing.');
        }
        this.nonce = nonce;
        this.started = true;
        let subscribed = 0;
        try {
            this.stderrInstallation = this.installStderrCapture();
            const consoleInstallations = [];
            this.consoleInstallations = consoleInstallations;
            consoleInstallations.push(this.installConsole('warn'));
            consoleInstallations.push(this.installConsole('error'));
            for (const [name, listener] of this.subscriptions){
                (0,external_node_diagnostics_channel_namespaceObject.subscribe)(name, listener);
                subscribed += 1;
            }
            process.on('uncaughtExceptionMonitor', this.handleUncaughtExceptionMonitor);
        } catch (error) {
            for (const [name, listener] of this.subscriptions.slice(0, subscribed)){
                (0,external_node_diagnostics_channel_namespaceObject.unsubscribe)(name, listener);
            }
            this.restoreConsole();
            this.restoreStderrCapture();
            this.nonce = undefined;
            this.started = false;
            throw error;
        }
    }
    dispose() {
        if (!this.started) {
            return;
        }
        this.started = false;
        process.removeListener('uncaughtExceptionMonitor', this.handleUncaughtExceptionMonitor);
        this.restoreConsole();
        this.restoreStderrCapture();
        this.consoleCaptures.length = 0;
        for (const [name, listener] of this.subscriptions){
            try {
                (0,external_node_diagnostics_channel_namespaceObject.unsubscribe)(name, listener);
            } catch  {
            // A diagnostics channel implementation must not block UtilityProcess shutdown.
            }
        }
        for (const installation of this.httpResponses){
            this.detachHttpResponse(installation);
        }
        this.httpRequests = new WeakMap();
        this.httpResponses.clear();
        this.undiciRequests = new WeakMap();
        this.rateWindows.clear();
        this.nonce = undefined;
    }
    get subscriptions() {
        return [
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.httpStart,
                this.handleHttpStart
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.httpFinish,
                this.handleHttpFinish
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.httpError,
                this.handleHttpError
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciCreate,
                this.handleUndiciCreate
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciHeaders,
                this.handleUndiciHeaders
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciTrailers,
                this.handleUndiciTrailers
            ],
            [
                DESKTOP_WEB_RUNTIME_HOST_DIAGNOSTIC_CHANNELS.undiciError,
                this.handleUndiciError
            ]
        ];
    }
    appendConsoleCapture(state, value) {
        state.byteLength += Buffer.byteLength(value);
        if (state.truncated || value.length === 0) {
            return;
        }
        const next = takeDesktopWebRuntimeTextPrefix(`${state.buffered}${value}`);
        state.buffered = next.message;
        state.truncated = next.truncated;
    }
    captureConsoleChunk(state, chunk) {
        let text;
        if (typeof chunk === 'string') {
            text = state.decoder.end() + chunk;
            state.decoder = new external_node_string_decoder_namespaceObject.StringDecoder('utf8');
        } else if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
            text = state.decoder.write(Buffer.from(chunk));
        } else {
            return;
        }
        this.appendConsoleCapture(state, text);
    }
    createConsoleCapture() {
        return {
            byteLength: 0,
            buffered: '',
            decoder: new external_node_string_decoder_namespaceObject.StringDecoder('utf8'),
            truncated: false
        };
    }
    detachHttpResponse(installation) {
        const { response } = installation;
        try {
            response.removeListener('aborted', installation.handleAborted);
            response.removeListener('close', installation.handleClose);
            response.removeListener('end', installation.handleEnd);
            response.removeListener('error', installation.handleError);
        } catch  {
        // Response observer cleanup is best effort.
        }
    }
    installConsole(method) {
        const descriptor = Object.getOwnPropertyDescriptor(console, method);
        const original = console[method];
        const diagnostics = this;
        const replacement = function(...arguments_) {
            return diagnostics.runWithConsoleCaptured(method, ()=>Reflect.apply(original, this, arguments_));
        };
        const installed = Reflect.defineProperty(console, method, {
            configurable: true,
            value: replacement,
            writable: true
        });
        if (!installed) {
            throw new Error(`Unable to observe Web runtime console.${method}.`);
        }
        return {
            ...descriptor === undefined ? {} : {
                descriptor
            },
            method,
            original,
            replacement
        };
    }
    installStderrCapture() {
        const stream = process.stderr;
        const descriptor = Object.getOwnPropertyDescriptor(stream, 'write');
        const originalWrite = stream.write;
        const diagnostics = this;
        const replacement = function(...args) {
            const result = Reflect.apply(originalWrite, this, args);
            if (diagnostics.started) {
                try {
                    const capture = diagnostics.consoleCaptures.at(-1);
                    if (capture) {
                        diagnostics.captureConsoleChunk(capture, args[0]);
                    }
                } catch  {
                // Console observation must never alter the original stderr write.
                }
            }
            return result;
        };
        const installed = Reflect.defineProperty(stream, 'write', {
            configurable: true,
            value: replacement,
            writable: true
        });
        if (!installed) {
            throw new Error('Unable to observe Web runtime stderr for console output.');
        }
        return {
            ...descriptor === undefined ? {} : {
                descriptor
            },
            originalWrite,
            replacement,
            stream
        };
    }
    finishUndici(request) {
        if (!request || typeof request !== 'object') {
            return;
        }
        const state = this.undiciRequests.get(request);
        if (!state) {
            return;
        }
        this.undiciRequests.delete(request);
        this.recordCompleted(state, state.statusCode, state.contentType);
    }
    finishHttpResponse(installation, completed, error) {
        if (!this.httpResponses.delete(installation)) {
            return;
        }
        this.detachHttpResponse(installation);
        try {
            if (!this.started) {
                return;
            }
            if (completed) {
                this.recordCompleted(installation.state, installation.statusCode, installation.contentType);
                return;
            }
            this.recordFailed(installation.state, error);
        } catch  {
        // A response observer must never alter the request or response stream.
        }
    }
    finishConsoleCapture(method, state) {
        try {
            this.appendConsoleCapture(state, state.decoder.end());
            if (state.byteLength === 0 && state.buffered.length === 0) {
                return;
            }
            const severity = method === 'error' ? 'error' : 'warning';
            if (!this.reserve('console-message', severity)) {
                return;
            }
            this.post({
                byteLength: state.byteLength,
                kind: 'console-message',
                message: state.buffered,
                severity,
                truncated: state.truncated
            });
        } catch  {
        // Console diagnostics must not change the original return value or thrown error.
        }
    }
    post(diagnostic) {
        const nonce = this.nonce;
        if (!this.started || nonce === undefined) {
            return;
        }
        const message = {
            diagnostic,
            nonce,
            type: 'diagnostic'
        };
        try {
            this.parentPort.postMessage(message);
        } catch  {
        // A closed parent port must not affect the observed operation or process semantics.
        }
    }
    recordCompleted(state, statusCode, contentType) {
        const diagnostic = {
            durationMs: resolveDesktopWebRuntimeHostDuration(state.startedAt),
            kind: 'network-request',
            method: state.method,
            outcome: 'completed',
            transport: state.transport,
            url: state.url,
            ...statusCode === undefined ? {} : {
                statusCode
            },
            ...contentType === undefined ? {} : {
                contentType
            }
        };
        this.recordNetwork(diagnostic, resolveDesktopWebRuntimeHostLevel(statusCode, false));
    }
    recordFailed(state, error) {
        const errorCode = readDesktopWebRuntimeHostErrorCode(error);
        const diagnostic = {
            durationMs: resolveDesktopWebRuntimeHostDuration(state.startedAt),
            kind: 'network-request',
            method: state.method,
            outcome: 'failed',
            transport: state.transport,
            url: state.url,
            ...errorCode === undefined ? {} : {
                errorCode
            }
        };
        this.recordNetwork(diagnostic, 'error');
    }
    recordNetwork(diagnostic, level) {
        if (this.started && this.reserve('network-request', level)) {
            this.post(diagnostic);
        }
    }
    observeHttpResponse(state, response, statusCode, contentType) {
        let installation;
        installation = {
            ...contentType === undefined ? {} : {
                contentType
            },
            handleAborted: ()=>{
                this.finishHttpResponse(installation, false);
            },
            handleClose: ()=>{
                this.finishHttpResponse(installation, response.complete);
            },
            handleEnd: ()=>{
                this.finishHttpResponse(installation, response.complete);
            },
            handleError: (error)=>{
                this.finishHttpResponse(installation, false, error);
            },
            response,
            state,
            ...statusCode === undefined ? {} : {
                statusCode
            }
        };
        this.httpResponses.add(installation);
        response.once('aborted', installation.handleAborted);
        response.once('close', installation.handleClose);
        response.once('end', installation.handleEnd);
        response.once('error', installation.handleError);
        if (response.readableEnded) {
            this.finishHttpResponse(installation, response.complete);
        }
    }
    reserve(source, level) {
        const key = `${source}:${level}`;
        const now = Date.now();
        let window = this.rateWindows.get(key);
        if (!window || now - window.startedAt >= (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS */60000)) {
            window = {
                count: 0,
                limited: false,
                startedAt: now
            };
            this.rateWindows.set(key, window);
        }
        if (window.count < (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_LIMIT */240)) {
            window.count += 1;
            return true;
        }
        if (!window.limited) {
            window.limited = true;
            this.post({
                kind: 'rate-limited',
                level,
                limit: (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_LIMIT */240),
                source,
                windowMs: (/* inlined export .DESKTOP_WEB_RUNTIME_DIAGNOSTIC_EVENT_WINDOW_MS */60000)
            });
        }
        return false;
    }
    restoreConsole() {
        for (const installation of [
            ...this.consoleInstallations
        ].reverse()){
            if (console[installation.method] !== installation.replacement) {
                continue;
            }
            if (installation.descriptor) {
                Reflect.defineProperty(console, installation.method, installation.descriptor);
            } else {
                Reflect.deleteProperty(console, installation.method);
            }
        }
        this.consoleInstallations = [];
    }
    restoreStderrCapture() {
        const installation = this.stderrInstallation;
        this.stderrInstallation = undefined;
        if (!installation || installation.stream.write !== installation.replacement) {
            return;
        }
        if (installation.descriptor) {
            Reflect.defineProperty(installation.stream, 'write', installation.descriptor);
            return;
        }
        Reflect.deleteProperty(installation.stream, 'write');
    }
    runWithConsoleCaptured(method, operation) {
        const state = this.createConsoleCapture();
        this.consoleCaptures.push(state);
        try {
            return operation();
        } finally{
            const index = this.consoleCaptures.lastIndexOf(state);
            if (index >= 0) {
                this.consoleCaptures.splice(index, 1);
            }
            this.finishConsoleCapture(method, state);
        }
    }
    constructor(){
        this.consoleCaptures = [];
        this.consoleInstallations = [];
        this.httpRequests = new WeakMap();
        this.httpResponses = new Set();
        this.rateWindows = new Map();
        this.started = false;
        this.undiciRequests = new WeakMap();
        this.handleHttpStart = (message)=>{
            try {
                const { request } = message;
                if (!request) {
                    return;
                }
                const url = sanitizeDesktopWebRuntimeHostNetworkUrl(new URL(request.path, `${request.protocol}//${readHttpRequestHost(request)}`).href);
                if (!url) {
                    return;
                }
                this.httpRequests.set(request, {
                    method: sanitizeDesktopWebRuntimeHostMethod(request.method),
                    startedAt: performance.now(),
                    transport: 'node_http',
                    url
                });
            } catch  {
            // Observing a Node request must never alter it.
            }
        };
        this.handleHttpFinish = (message)=>{
            try {
                const { request, response } = message;
                if (!request || !response) {
                    return;
                }
                const state = this.httpRequests.get(request);
                if (!state) {
                    return;
                }
                this.httpRequests.delete(request);
                this.observeHttpResponse(state, response, readDesktopWebRuntimeHostStatusCode(response.statusCode), readDesktopWebRuntimeHostContentType(response.headers));
            } catch  {
            // Observing a Node response must never alter it.
            }
        };
        this.handleHttpError = (message)=>{
            try {
                const { error, request } = message;
                if (!request) {
                    return;
                }
                const state = this.httpRequests.get(request);
                if (!state) {
                    return;
                }
                this.httpRequests.delete(request);
                this.recordFailed(state, error);
            } catch  {
            // Observing a Node request failure must never alter it.
            }
        };
        this.handleUndiciCreate = (message)=>{
            try {
                const { request } = message;
                if (!request || typeof request !== 'object') {
                    return;
                }
                const url = createDesktopWebRuntimeHostUrl(request.origin, request.path);
                if (!url) {
                    return;
                }
                this.undiciRequests.set(request, {
                    method: sanitizeDesktopWebRuntimeHostMethod(request.method),
                    startedAt: performance.now(),
                    transport: 'undici',
                    url
                });
            } catch  {
            // Observing an Undici request must never alter it.
            }
        };
        this.handleUndiciHeaders = (message)=>{
            try {
                const { request, response } = message;
                if (!request || typeof request !== 'object' || !response) {
                    return;
                }
                const state = this.undiciRequests.get(request);
                if (!state) {
                    return;
                }
                state.statusCode = readDesktopWebRuntimeHostStatusCode(response.statusCode);
                state.contentType = readDesktopWebRuntimeHostContentType(response.headers);
            } catch  {
            // Observing Undici response headers must never alter the request.
            }
        };
        this.handleUndiciTrailers = (message)=>{
            try {
                const { request } = message;
                this.finishUndici(request);
            } catch  {
            // Observing an Undici response completion must never alter the request.
            }
        };
        this.handleUndiciError = (message)=>{
            try {
                const { error, request } = message;
                if (!request || typeof request !== 'object') {
                    return;
                }
                const state = this.undiciRequests.get(request);
                if (!state) {
                    return;
                }
                this.undiciRequests.delete(request);
                this.recordFailed(state, error);
            } catch  {
            // Observing an Undici request failure must never alter it.
            }
        };
        this.handleUncaughtExceptionMonitor = (error)=>{
            try {
                if (!this.started) {
                    return;
                }
                const errorCode = readDesktopWebRuntimeHostErrorCode(error);
                this.post({
                    kind: 'process-failure',
                    reason: 'uncaught_exception',
                    ...errorCode === undefined ? {} : {
                        errorCode
                    }
                });
            } catch  {
            // A hostile thrown value must not replace the original fatal error.
            }
        };
    }
}
__decorate([
    inject(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT),
    __metadata("design:type", typeof DesktopWebRuntimeHostParentPort === "undefined" ? Object : DesktopWebRuntimeHostParentPort)
], DesktopWebRuntimeHostDiagnostics.prototype, "parentPort", void 0);
DesktopWebRuntimeHostDiagnostics = __decorate([
    injectable()
], DesktopWebRuntimeHostDiagnostics);

;// CONCATENATED MODULE: external "node:http"
const external_node_http_namespaceObject = require("node:http");
var external_node_http_default = /*#__PURE__*/__webpack_require__.n(external_node_http_namespaceObject);
;// CONCATENATED MODULE: external "node:module"
const external_node_module_namespaceObject = require("node:module");
;// CONCATENATED MODULE: external "node:fs/promises"
const promises_namespaceObject = require("node:fs/promises");
;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/modules/server/modules/configuration/index.ts




class DesktopWebRuntimeServerConfiguration {
    async read(runtimeDirectory) {
        const manifestPath = (0,external_node_path_namespaceObject.join)(runtimeDirectory, '.next', 'required-server-files.json');
        const manifest = JSON.parse(await (0,promises_namespaceObject.readFile)(manifestPath, 'utf8'));
        if (!manifest.config || typeof manifest.config !== 'object' || Array.isArray(manifest.config)) {
            throw new Error(`Packaged Next runtime configuration is invalid: ${manifestPath}`);
        }
        return manifest.config;
    }
}
DesktopWebRuntimeServerConfiguration = __decorate([
    injectable()
], DesktopWebRuntimeServerConfiguration);

;// CONCATENATED MODULE: external "node:crypto"
const external_node_crypto_namespaceObject = require("node:crypto");
;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/modules/server/consts.ts

const PRIVATE_RUNTIME_REQUEST_HEADERS = Object.freeze([
    DESKTOP_WEB_RUNTIME_AUTH_HEADER,
    DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER,
    DESKTOP_WEB_RUNTIME_PROBE_HEADER
]);
const ORIGIN_REQUEST_HEADERS = Object.freeze([
    'origin'
]);

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/modules/server/utils.ts



const hasMatchingDesktopWebRuntimeSecret = (provided, expected)=>{
    if (typeof provided !== 'string') {
        return false;
    }
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    return providedBuffer.length === expectedBuffer.length && (0,external_node_crypto_namespaceObject.timingSafeEqual)(providedBuffer, expectedBuffer);
};
const readDistinctHeaders = (request)=>{
    return request.headersDistinct;
};
const readHeaderValues = (request, name)=>{
    const distinctValues = readDistinctHeaders(request)?.[name];
    if (distinctValues !== undefined) {
        return distinctValues;
    }
    const value = request.headers[name];
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        return [
            value
        ];
    }
    const rawValues = [];
    for(let index = 0; index + 1 < request.rawHeaders.length; index += 2){
        if (request.rawHeaders[index]?.toLowerCase() === name) {
            rawValues.push(request.rawHeaders[index + 1] ?? '');
        }
    }
    if (rawValues.length > 0) {
        return rawValues;
    }
    return undefined;
};
const removeRawHeaders = (request, names)=>{
    for(let index = request.rawHeaders.length - 2; index >= 0; index -= 2){
        const name = request.rawHeaders[index]?.toLowerCase();
        if (name && names.includes(name)) {
            request.rawHeaders.splice(index, 2);
        }
    }
};
const removeRequestHeaders = (request, names)=>{
    const distinctHeaders = readDistinctHeaders(request);
    for (const name of names){
        delete request.headers[name];
        if (distinctHeaders) {
            delete distinctHeaders[name];
        }
    }
    removeRawHeaders(request, names);
};
const setRequestHeader = (request, name, value)=>{
    request.headers[name] = value;
    const distinctHeaders = readDistinctHeaders(request);
    if (distinctHeaders) {
        distinctHeaders[name] = [
            value
        ];
    }
    request.rawHeaders.push(name, value);
};
const hasValidLogicalOriginMarker = (request, expectedSurfaceOrigin)=>{
    const logicalOrigin = request.headers[DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER];
    const forwardedHost = request.headers['x-forwarded-host'];
    const forwardedProtocol = request.headers['x-forwarded-proto'];
    const logicalOrigins = readHeaderValues(request, DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER);
    if (logicalOrigins === undefined) {
        return true;
    }
    const expectedOrigin = new URL(expectedSurfaceOrigin);
    const forwardedHosts = readHeaderValues(request, 'x-forwarded-host');
    const forwardedProtocols = readHeaderValues(request, 'x-forwarded-proto');
    const directOrigins = readHeaderValues(request, 'origin');
    const method = request.method?.toUpperCase();
    return method !== undefined && method !== 'GET' && method !== 'HEAD' && directOrigins === undefined && typeof logicalOrigin === 'string' && logicalOrigins.length === 1 && logicalOrigin === expectedSurfaceOrigin && logicalOrigins[0] === logicalOrigin && typeof forwardedHost === 'string' && forwardedHosts?.length === 1 && forwardedHost === expectedOrigin.host && forwardedHosts[0] === forwardedHost && typeof forwardedProtocol === 'string' && forwardedProtocols?.length === 1 && forwardedProtocol === expectedOrigin.protocol.slice(0, -1) && forwardedProtocols[0] === forwardedProtocol;
};
const rejectInvalidLogicalOrigin = (response)=>{
    response.statusCode = 400;
    response.setHeader('cache-control', 'no-store');
    response.end('Bad Request');
};
const createAuthenticatedRequestListener = (listener, token, nonce, expectedSurfaceOrigin)=>{
    let readinessNonce = nonce;
    return (request, response)=>{
        if (!hasMatchingDesktopWebRuntimeSecret(request.headers[DESKTOP_WEB_RUNTIME_AUTH_HEADER], token)) {
            response.statusCode = 403;
            response.setHeader('cache-control', 'no-store');
            response.end('Forbidden');
            return;
        }
        const logicalOrigin = readHeaderValues(request, DESKTOP_WEB_RUNTIME_LOGICAL_ORIGIN_HEADER)?.[0];
        const hasValidMarker = hasValidLogicalOriginMarker(request, expectedSurfaceOrigin);
        const provesReadiness = readinessNonce !== undefined && hasMatchingDesktopWebRuntimeSecret(request.headers[DESKTOP_WEB_RUNTIME_PROBE_HEADER], readinessNonce);
        removeRequestHeaders(request, PRIVATE_RUNTIME_REQUEST_HEADERS);
        removeRequestHeaders(request, ORIGIN_REQUEST_HEADERS);
        if (!hasValidMarker) {
            rejectInvalidLogicalOrigin(response);
            return;
        }
        if (logicalOrigin !== undefined) {
            setRequestHeader(request, 'origin', logicalOrigin);
        }
        if (provesReadiness && readinessNonce) {
            response.setHeader(DESKTOP_WEB_RUNTIME_PROBE_RESPONSE_HEADER, readinessNonce);
            readinessNonce = undefined;
        }
        listener(request, response);
    };
};

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/modules/server/index.ts










class DesktopWebRuntimeHostServer {
    async launch(message) {
        for (const [key, value] of Object.entries(message.environment)){
            process.env[key] = value;
        }
        const runtimeDirectory = (0,external_node_path_namespaceObject.dirname)(message.serverPath);
        const nextConfig = await this.configuration.read(runtimeDirectory);
        const requireRuntime = (0,external_node_module_namespaceObject.createRequire)(message.serverPath);
        process.env.BUILD_INFO_FILE_PATH = (0,external_node_path_namespaceObject.join)(runtimeDirectory, 'public', 'build-info.json');
        process.env.DESKTOP_WEB_RUNTIME_ROOT = runtimeDirectory;
        process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
        this.installServerGuard(message);
        requireRuntime('next');
        const { startServer } = requireRuntime('next/dist/server/lib/start-server');
        await startServer({
            allowRetry: false,
            config: nextConfig,
            dir: runtimeDirectory,
            hostname: consts_DESKTOP_WEB_RUNTIME_BIND_HOST,
            isDev: false,
            keepAliveTimeout: this.readKeepAliveTimeout(),
            port: 0
        });
    }
    installServerGuard(message) {
        const originalCreateServer = (external_node_http_default()).createServer;
        (external_node_http_default()).createServer = (...arguments_)=>{
            const requestListenerIndex = arguments_.findIndex((argument)=>typeof argument === 'function');
            const requestListener = arguments_[requestListenerIndex];
            if (!requestListener) {
                throw new Error('The packaged Next runtime did not provide an HTTP request listener.');
            }
            arguments_[requestListenerIndex] = createAuthenticatedRequestListener(requestListener, message.token, message.nonce, message.surfaceOrigin);
            const server = Reflect.apply(originalCreateServer, (external_node_http_default()), arguments_);
            const originalListen = server.listen.bind(server);
            process.title = 'Today Web Runtime';
            server.listen = (..._arguments)=>{
                return originalListen(0, consts_DESKTOP_WEB_RUNTIME_BIND_HOST);
            };
            server.prependListener('upgrade', (request, socket)=>{
                if (!hasMatchingDesktopWebRuntimeSecret(request.headers[DESKTOP_WEB_RUNTIME_AUTH_HEADER], message.token)) {
                    socket.destroy();
                }
            });
            server.once('listening', ()=>{
                const address = server.address();
                if (!address || typeof address === 'string') {
                    throw new Error('The packaged Next runtime did not bind a private TCP endpoint.');
                }
                const listeningMessage = {
                    type: 'listening',
                    nonce: message.nonce,
                    port: address.port
                };
                this.parentPort.postMessage(listeningMessage);
            });
            (external_node_http_default()).createServer = originalCreateServer;
            return server;
        };
    }
    readKeepAliveTimeout() {
        const keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT);
        if (!Number.isFinite(keepAliveTimeout) || keepAliveTimeout < 0) {
            return undefined;
        }
        return keepAliveTimeout;
    }
}
__decorate([
    inject(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT),
    __metadata("design:type", typeof DesktopWebRuntimeHostParentPort === "undefined" ? Object : DesktopWebRuntimeHostParentPort)
], DesktopWebRuntimeHostServer.prototype, "parentPort", void 0);
__decorate([
    inject(DesktopWebRuntimeServerConfiguration),
    __metadata("design:type", typeof DesktopWebRuntimeServerConfiguration === "undefined" ? Object : DesktopWebRuntimeServerConfiguration)
], DesktopWebRuntimeHostServer.prototype, "configuration", void 0);
DesktopWebRuntimeHostServer = __decorate([
    injectable()
], DesktopWebRuntimeHostServer);

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/utils.ts
const isLogicalLocalhostOrigin = (value)=>{
    try {
        const origin = new URL(value);
        return origin.protocol === 'http:' && origin.hostname.length > '.localhost'.length && origin.hostname.endsWith('.localhost') && origin.port === '' && value === origin.origin;
    } catch  {
        return false;
    }
};
const isDesktopWebRuntimeLaunchMessage = (value)=>{
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return candidate.type === 'launch' && typeof candidate.environment === 'object' && typeof candidate.nonce === 'string' && candidate.nonce.length > 0 && typeof candidate.serverPath === 'string' && candidate.serverPath.length > 0 && typeof candidate.surfaceOrigin === 'string' && isLogicalLocalhostOrigin(candidate.surfaceOrigin) && typeof candidate.token === 'string' && candidate.token.length > 0;
};

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/modules/runtime-host/index.ts








class DesktopWebRuntimeHost {
    static create(parentPort) {
        const container = new Container({
            autobind: true,
            defaultScope: 'Singleton'
        });
        container.bind(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT).toConstantValue(parentPort);
        return container.get(DesktopWebRuntimeHost);
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.parentPort.once('message', this.handleLaunchMessage);
    }
    dispose() {
        if (this.started) {
            this.started = false;
            this.parentPort.removeListener('message', this.handleLaunchMessage);
        }
        this.diagnostics.dispose();
    }
    async launch(value) {
        try {
            if (!isDesktopWebRuntimeLaunchMessage(value)) {
                throw new Error('The packaged Next runtime received an invalid launch request.');
            }
            try {
                this.diagnostics.start(value.nonce);
            } catch  {
            // Diagnostics are best effort and must not block the packaged runtime.
            }
            await this.server.launch(value);
        } catch (error) {
            try {
                console.error(error);
            } catch  {
            // A replaced console implementation must not prevent process exit.
            }
            this.exitAfterDiagnosticsFlush();
        }
    }
    exitAfterDiagnosticsFlush() {
        process.exitCode = 1;
        const exit = ()=>{
            try {
                this.dispose();
            } catch  {
            // Diagnostics cleanup must not prevent process exit.
            }
            process.exit(1);
        };
        try {
            process.stderr.write('', ()=>{
                setImmediate(exit);
            });
        } catch  {
            setImmediate(exit);
        }
    }
    constructor(){
        this.started = false;
        this.handleLaunchMessage = (event)=>{
            this.started = false;
            this.launch(event.data);
        };
    }
}
__decorate([
    inject(DESKTOP_WEB_RUNTIME_HOST_PARENT_PORT),
    __metadata("design:type", typeof DesktopWebRuntimeHostParentPort === "undefined" ? Object : DesktopWebRuntimeHostParentPort)
], DesktopWebRuntimeHost.prototype, "parentPort", void 0);
__decorate([
    inject(DesktopWebRuntimeHostDiagnostics),
    __metadata("design:type", typeof DesktopWebRuntimeHostDiagnostics === "undefined" ? Object : DesktopWebRuntimeHostDiagnostics)
], DesktopWebRuntimeHost.prototype, "diagnostics", void 0);
__decorate([
    inject(DesktopWebRuntimeHostServer),
    __metadata("design:type", typeof DesktopWebRuntimeHostServer === "undefined" ? Object : DesktopWebRuntimeHostServer)
], DesktopWebRuntimeHost.prototype, "server", void 0);
DesktopWebRuntimeHost = __decorate([
    injectable()
], DesktopWebRuntimeHost);

;// CONCATENATED MODULE: ./src/app/modules/web-runtime/runtime-host.ts

const runtime_host_parentPort = process.parentPort;
if (runtime_host_parentPort) {
    DesktopWebRuntimeHost.create(runtime_host_parentPort).start();
}

})();

module.exports = __webpack_exports__;
})()
;