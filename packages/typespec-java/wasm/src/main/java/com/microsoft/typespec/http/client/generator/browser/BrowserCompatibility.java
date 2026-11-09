// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import com.github.javaparser.JavaParser;
import java.io.BufferedReader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public final class BrowserCompatibility {
    public static boolean isJavaName(CharSequence value) {
        String name = value.toString();
        var parsed = new JavaParser().parseName(name);
        return parsed.isSuccessful() && parsed.getResult().orElseThrow().asString().equals(name);
    }

    public static String packageName(Package value) {
        String name = value.getName();
        return name.endsWith(".") ? name.substring(0, name.length() - 1) : name;
    }

    public static Stream<String> lines(String value) {
        return new BufferedReader(new StringReader(value)).lines();
    }

    public static Stream<String> splitAsStream(Pattern pattern, CharSequence value) {
        return Arrays.stream(pattern.split(value));
    }

    public static <T> Stream<T> distinct(Stream<T> stream) {
        // TeaVM's distinct() resets its visited set between concatenated stream batches.
        Set<T> visited = new HashSet<>();
        return stream.filter(visited::add);
    }

    public static List<String> unformattedCode(Map<String, String> files) {
        // Full Java files are cleaned after template generation, without native formatting.
        return new ArrayList<>(files.values());
    }

    public static <T> Set<T> newKeySet() {
        // Each worker runs one generator, so management mapper sets do not need concurrency.
        return new HashSet<>();
    }

    public static String normalizeEolInTextBlock(String value, String separator) {
        StringBuilder result = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char character = value.charAt(i);
            if (character == '\r' || character == '\n' || character == '\u000B' || character == '\f'
                || character == '\u0085' || character == '\u2028' || character == '\u2029') {
                if (character == '\r' && i + 1 < value.length() && value.charAt(i + 1) == '\n') {
                    i++;
                }
                result.append(separator);
            } else {
                result.append(character);
            }
        }
        return result.toString();
    }
}
