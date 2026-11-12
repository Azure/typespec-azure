// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import com.microsoft.typespec.http.client.generator.core.extension.model.codemodel.YamlProperty;
import java.beans.Introspector;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.jar.JarFile;

/**
 * Reflection runs at build time, never in the browser. The generated setters preserve the native code-model contract.
 */
class GenerateModelReader {
    private static final String MODELS = "com.microsoft.typespec.http.client.generator.core.extension.model.";
    private static final Map<Type, Integer> TYPES = new LinkedHashMap<>();

    private static int typeId(Type type) {
        return TYPES.computeIfAbsent(type, ignored -> TYPES.size());
    }

    public static void main(String[] args) throws Exception {
        StringBuilder resources = new StringBuilder();
        try (JarFile jar = new JarFile(args[0])) {
            for (var entry : jar.stream().filter(e -> !e.isDirectory() && !e.getName().contains("/")).toList()) {
                String base64 = java.util.Base64.getEncoder().encodeToString(jar.getInputStream(entry).readAllBytes());
                resources.append("case \"")
                    .append(entry.getName())
                    .append("\": return new java.io.ByteArrayInputStream(")
                    .append("java.util.Base64.getDecoder().decode(\"")
                    .append(base64)
                    .append("\"));\n");
            }
            for (var entry : jar.stream().filter(e -> e.getName().endsWith(".class")).toList()) {
                String name = entry.getName().replace('/', '.').replace(".class", "");
                if (name.startsWith(MODELS)
                    && !name.contains("$")
                    && !name.endsWith("package-info")
                    && !name.endsWith("AnnotatedPropertyUtils")) {
                    Class<?> type = Class.forName(name, false, GenerateModelReader.class.getClassLoader());
                    try {
                        if (!Modifier.isAbstract(type.getModifiers())) {
                            type.getConstructor();
                            typeId(type);
                        }
                    } catch (NoSuchMethodException ignored) {
                    }
                }
            }
        }
        StringBuilder cases = new StringBuilder();
        for (int i = 0; i < TYPES.size(); i++) {
            Type type = new ArrayList<>(TYPES.keySet()).get(i);
            cases.append("case ").append(i).append(": {\n");
            if (type instanceof ParameterizedType generic) {
                Class<?> raw = (Class<?>) generic.getRawType();
                if (Map.class.isAssignableFrom(raw)) {
                    int element = typeId(generic.getActualTypeArguments()[1]);
                    cases.append("var result = new java.util.LinkedHashMap<String,Object>(); remember(value,result);\n")
                        .append("for (String key : keys(value)) result.put(key, read(get(value,key),")
                        .append(element)
                        .append(")); return result;\n");
                } else if (java.util.Collection.class.isAssignableFrom(raw)) {
                    int element = typeId(generic.getActualTypeArguments()[0]);
                    cases.append("var result = new java.util.")
                        .append(java.util.Set.class.isAssignableFrom(raw) ? "LinkedHashSet" : "ArrayList")
                        .append("<Object>(); remember(value,result);\n")
                        .append("for (int p=0; p<length(value); p++) result.add(read(at(value,p),")
                        .append(element)
                        .append(")); return result;\n");
                } else {
                    throw new IllegalStateException("Unsupported generic type: " + type);
                }
            } else if (type instanceof Class<?> cls) {
                if (cls == String.class) {
                    cases.append("return text(value);\n");
                } else if (cls == boolean.class || cls == Boolean.class) {
                    cases.append("return bool(value);\n");
                } else if (cls == int.class || cls == Integer.class) {
                    cases.append("return (int) number(value);\n");
                } else if (cls == long.class || cls == Long.class) {
                    cases.append("return (long) number(value);\n");
                } else if (cls == double.class || cls == Double.class) {
                    cases.append("return number(value);\n");
                } else if (cls == float.class || cls == Float.class) {
                    cases.append("return (float) number(value);\n");
                } else if (cls == Object.class) {
                    cases.append("return untyped(value);\n");
                } else if (cls.isEnum()) {
                    String parser;
                    try {
                        cls.getMethod("fromValue", String.class);
                        parser = "fromValue";
                    } catch (NoSuchMethodException ignored) {
                        parser = "valueOf";
                    }
                    cases.append("return ")
                        .append(cls.getCanonicalName())
                        .append(".")
                        .append(parser)
                        .append("(text(value));\n");
                } else {
                    String className = cls.getCanonicalName();
                    if (cls.getSimpleName().equals("Schema") || Modifier.isAbstract(cls.getModifiers())) {
                        cases.append("return read(value, schemaType(text(get(value,\"type\"))));\n");
                    } else {
                        cases.append("var result = new ").append(className).append("(); remember(value,result);\n");
                        if (cls.getSimpleName().equals("XmsExamples")) {
                            cases.append("var examples = new java.util.LinkedHashMap<String,Object>();\n")
                                .append("for (String key : keys(value)) examples.put(key, untyped(get(value,key)));\n")
                                .append("result.setExamples(examples); return result;\n");
                        } else {
                            for (var property : Introspector.getBeanInfo(cls).getPropertyDescriptors()) {
                                var setter = property.getWriteMethod();
                                if (setter == null) {
                                    continue;
                                }
                                String key = property.getName();
                                var getter = property.getReadMethod();
                                var annotation = getter == null ? null : getter.getAnnotation(YamlProperty.class);
                                if (annotation != null) {
                                    key = annotation.value();
                                } else if (cls.getSimpleName().equals("XmsExtensions") && key.startsWith("xms")) {
                                    key = "x-ms-"
                                        + key.substring(3).replaceAll("([a-z])([A-Z])", "$1-$2").toLowerCase();
                                } else if (cls.getSimpleName().equals("XmsLongRunningOperationOptions")) {
                                    key = key.replaceAll("([a-z])([A-Z])", "$1-$2").toLowerCase();
                                }
                                if (key.equals("x-ms-internal-autorest-anonymous-schema")) {
                                    key = "x-internal-autorest-anonymous-schema";
                                }
                                Type parameter = setter.getGenericParameterTypes()[0];
                                int fieldType = typeId(parameter);
                                Class<?> cast = setter.getParameterTypes()[0];
                                String castName = cast.isPrimitive()
                                    ? Map
                                        .of(boolean.class, "Boolean", int.class, "Integer", long.class, "Long",
                                            double.class, "Double", float.class, "Float")
                                        .get(cast)
                                    : cast.getCanonicalName();
                                cases.append("if (has(value,\"")
                                    .append(key)
                                    .append("\")) result.")
                                    .append(setter.getName())
                                    .append("((")
                                    .append(castName)
                                    .append(")read(get(value,\"")
                                    .append(key)
                                    .append("\"),")
                                    .append(fieldType)
                                    .append("));\n");
                            }
                            cases.append("return result;\n");
                        }
                    }
                }
            } else {
                throw new IllegalStateException("Unsupported type: " + type);
            }
            cases.append("}\n");
        }
        StringBuilder schemas = new StringBuilder();
        for (var entry : TYPES.entrySet()) {
            if (entry.getKey()instanceof Class<?> cls
                && cls.getSimpleName().endsWith("Schema")
                && !Modifier.isAbstract(cls.getModifiers())) {
                String key
                    = cls.getSimpleName().replace("Schema", "").replaceAll("([a-z])([A-Z])", "$1-$2").toLowerCase();
                schemas.append("case \"").append(key).append("\": return ").append(entry.getValue()).append(";\n");
                if (key.equals("number")) {
                    schemas.append("case \"integer\": return ").append(entry.getValue()).append(";\n");
                } else if (key.equals("object")) {
                    schemas.append("case \"group\": return ").append(entry.getValue()).append(";\n");
                } else if (key.equals("any")) {
                    schemas.append("case \"any-object\": return ").append(entry.getValue()).append(";\n");
                } else if (key.equals("unix-time")) {
                    schemas.append("case \"unixtime\": return ").append(entry.getValue()).append(";\n");
                } else if (key.equals("o-data-query")) {
                    schemas.append("case \"odata-query\": return ").append(entry.getValue()).append(";\n");
                }
            }
        }
        String source = """
            package com.microsoft.typespec.http.client.generator.browser;
            import org.teavm.jso.JSObject;
            @SuppressWarnings({"unchecked", "rawtypes"})
            final class ModelReader extends JsModelReader {
                Object readTyped(JSObject value, int type) {
                    switch (type) {
            """ + cases + """
                    default: throw new IllegalArgumentException("Unknown model type: " + type);
                    }
                }
                int schemaType(String name) {
                    switch (name) {
            """ + schemas + """
                    default: throw new IllegalArgumentException("Unsupported schema: " + name);
                    }
                }
                Object readRoot(JSObject value) { return read(value,
            """ + TYPES.get(Class.forName(MODELS + "codemodel.CodeModel")) + "); }\n}\n";
        Path output = Path.of(args[1]);
        Files.createDirectories(output.getParent());
        Files.writeString(output, source);
        Files.writeString(output.resolveSibling("BrowserResources.java"), """
            package com.microsoft.typespec.http.client.generator.browser;
            final class BrowserResources {
                public static java.io.InputStream open(String name) {
                    switch (name) {
            """ + resources + """
                    default: return null;
                    }
                }
            }
            """);
        System.out.println("Generated reference-preserving readers for " + TYPES.size() + " model types.");
    }
}
