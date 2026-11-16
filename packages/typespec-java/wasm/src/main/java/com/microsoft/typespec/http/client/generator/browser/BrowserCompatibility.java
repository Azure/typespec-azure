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
        // TeaVM lacks SourceVersion; parse the name without accepting normalized whitespace or comments.
        String name = value.toString();
        var parsed = new JavaParser().parseName(name);
        return parsed.isSuccessful() && parsed.getResult().orElseThrow().asString().equals(name);
    }

    public static String packageName(Package value) {
        // TeaVM can report a trailing dot, which would produce invalid generated imports.
        String name = value.getName();
        return name.endsWith(".") ? name.substring(0, name.length() - 1) : name;
    }

    public static Stream<String> lines(String value) {
        // TeaVM 0.16.0 lacks String.lines(), but implements BufferedReader.lines().
        return new BufferedReader(new StringReader(value)).lines();
    }

    public static Stream<String> splitAsStream(Pattern pattern, CharSequence value) {
        // TeaVM 0.16.0 lacks Pattern.splitAsStream(); use its supported array-based split.
        return Arrays.stream(pattern.split(value));
    }

    public static <T> Stream<T> distinct(Stream<T> stream) {
        // TeaVM's distinct() resets its visited set between concatenated stream batches.
        Set<T> visited = new HashSet<>();
        return stream.filter(visited::add);
    }

    public static List<String> unformattedCode(Map<String, String> files) {
        // Native formatting needs javac/Eclipse internals; browser import cleanup runs after generation.
        return new ArrayList<>(files.values());
    }

    public static <T> Set<T> newKeySet() {
        // TeaVM lacks ConcurrentHashMap.newKeySet(); one generator per worker needs no concurrency.
        return new HashSet<>();
    }

    public static String normalizeEolInTextBlock(String value, String separator) {
        // JavaParser uses unsupported regex \R; preserve its newline handling, including CRLF as one break.
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
