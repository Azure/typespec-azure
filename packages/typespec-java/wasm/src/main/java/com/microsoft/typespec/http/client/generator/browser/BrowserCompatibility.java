// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public final class BrowserCompatibility {
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
