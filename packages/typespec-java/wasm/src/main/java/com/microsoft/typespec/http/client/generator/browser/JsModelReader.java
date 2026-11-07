// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.teavm.jso.JSBody;
import org.teavm.jso.JSObject;

abstract class JsModelReader {
    private final JSObject identities = newIdentities();
    private final Map<Integer, Object> objects = new HashMap<>();

    abstract Object readTyped(JSObject value, int type);

    final Object read(JSObject value, int type) {
        if (isNull(value)) {
            return null;
        }
        int id = identity(identities, value);
        Object existing = objects.get(id);
        return existing != null ? existing : readTyped(value, type);
    }

    final void remember(JSObject value, Object object) {
        objects.put(identity(identities, value), object);
    }

    final Object untyped(JSObject value) {
        if (isNull(value))
            return null;
        Object existing = objects.get(identity(identities, value));
        if (existing != null)
            return existing;
        switch (kind(value)) {
            case "string":
                return text(value);

            case "boolean":
                return bool(value);

            case "number": {
                double scalar = number(value);
                if (scalar == (int) scalar)
                    return (int) scalar;
                if (scalar == (long) scalar)
                    return (long) scalar;
                return scalar;
            }

            case "array": {
                var result = new ArrayList<Object>();
                remember(value, result);
                for (int i = 0; i < length(value); i++)
                    result.add(untyped(at(value, i)));
                return result;
            }

            default: {
                var result = new LinkedHashMap<String, Object>();
                remember(value, result);
                for (String key : keys(value))
                    result.put(key, untyped(get(value, key)));
                return result;
            }
        }
    }

    @JSBody(script = "return { map: new WeakMap(), next: 0 };")
    private static native JSObject newIdentities();

    @JSBody(params = { "ids", "value" }, script = """
        if (value === null || typeof value !== 'object') return -1;
        if (!ids.map.has(value)) ids.map.set(value, ids.next++);
        return ids.map.get(value);
        """)
    private static native int identity(JSObject ids, JSObject value);

    @JSBody(params = "value", script = "return value == null;")
    static native boolean isNull(JSObject value);

    @JSBody(params = { "value", "key" }, script = "return value[key] != null;")
    static native boolean has(JSObject value, String key);

    @JSBody(params = { "value", "key" }, script = "return value[key];")
    static native JSObject get(JSObject value, String key);

    @JSBody(params = "value", script = "return String(value);")
    static native String text(JSObject value);

    @JSBody(params = "value", script = "return Boolean(value);")
    static native boolean bool(JSObject value);

    @JSBody(params = "value", script = "return Number(value);")
    static native double number(JSObject value);

    @JSBody(params = "value", script = "return Array.isArray(value) ? 'array' : typeof value;")
    private static native String kind(JSObject value);

    @JSBody(params = "value", script = "return Object.keys(value);")
    static native String[] keys(JSObject value);

    @JSBody(params = "value", script = "return value.length;")
    static native int length(JSObject value);

    @JSBody(params = { "value", "index" }, script = "return value[index];")
    static native JSObject at(JSObject value, int index);
}
