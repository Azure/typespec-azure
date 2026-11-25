// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.github.javaparser.utils.Utils;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class BrowserCompatibilityTests {
    @Test
    void normalizesJavadocLineBreaksWithoutRegex() {
        String source = "a\r\nb\rc\nd\u000Be\ff\u0085g\u2028h\u2029";
        for (String separator : new String[] { "\n", "\r\n" }) {
            assertEquals(Utils.normalizeEolInTextBlock(source, separator),
                BrowserCompatibility.normalizeEolInTextBlock(source, separator));
        }
    }

    @Test
    void deduplicatesAcrossConcatenatedStreamsInEncounterOrder() {
        Object widget = new Object();
        Object analytics = new Object();
        Stream<Object> models = Stream.concat(Stream.of(widget, analytics, null, "name"),
            Stream.of(widget, analytics, null, new String("name")));

        assertEquals(Arrays.asList(widget, analytics, null, "name"),
            BrowserCompatibility.distinct(models).collect(Collectors.toList()));
    }
}
