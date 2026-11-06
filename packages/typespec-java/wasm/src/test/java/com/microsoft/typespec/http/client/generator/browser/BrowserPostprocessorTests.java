// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.javaparser.utils.Utils;
import com.google.googlejavaformat.java.RemoveUnusedImports;
import org.junit.jupiter.api.Test;

class BrowserPostprocessorTests {
    private final BrowserPostprocessor postprocessor = new BrowserPostprocessor();

    @Test
    void removesUnavailableImportsWithoutResolvingDependencies() throws Exception {
        String source = """
            package sample;
            import missing.dependency.Unused;
            import missing.dependency.OnlyInString;
            import missing.dependency.OnlyInComment;
            import missing.dependency.OnlyInProse;
            import static missing.dependency.Methods.trim;
            import java.util.List;
            import static java.util.Collections.emptyList;
            /** OnlyInProse is not a Java reference. */
            class Example {
                // OnlyInComment
                String value = "OnlyInString";
                String trimmed = value.trim();
                List<String> values = emptyList();
            }
            """;
        String cleaned = postprocessor.removeUnusedImports("Example.java", source);
        assertEquals(RemoveUnusedImports.removeUnusedImports(source), cleaned);
        assertTrue(cleaned.contains("import java.util.List;"));
        assertTrue(cleaned.contains("import static java.util.Collections.emptyList;"));
    }

    @Test
    void preservesNestedTypesAnnotationsAndJavadocReferences() throws Exception {
        String source = """
            package sample;
            import java.util.Map;
            import missing.dependency.Entry;
            import java.util.Set;
            import java.time.Instant;
            import java.net.URI;
            import java.io.IOException;
            import java.lang.Deprecated;
            /**
             * {@link Instant#compareTo(Instant) description}
             * @see URI
             * @throws IOException when reading fails.
             */
            @Deprecated
            class Example<T extends Set<String>> {
                Map.Entry<String, T> entry;
            }
            """;
        assertEquals(RemoveUnusedImports.removeUnusedImports(source),
            postprocessor.removeUnusedImports("Example.java", source));
    }

    @Test
    void preservesWrappedJavadocReferences() throws Exception {
        String source = """
            package sample;
            import java.time.Instant;
            import java.util.List;
            import java.net.URI;
            import missing.dependency.OnlyInProse;
            import missing.dependency.OnlyInCode;
            class Example {
                /**
                 * {@link
                 * Instant}
                 * {@code OnlyInCode}
                 * @see java.util.Collections#unmodifiableList(
                 *     List)
                 * @param value OnlyInProse is not a reference.
                 *     {@linkplain URI}
                 */
                void example(String value) {}
            }
            """;
        String cleaned = postprocessor.removeUnusedImports("Example.java", source);
        assertEquals(RemoveUnusedImports.removeUnusedImports(source), cleaned);
        assertTrue(cleaned.contains("import java.time.Instant;"));
        assertTrue(cleaned.contains("import java.util.List;"));
        assertTrue(cleaned.contains("import java.net.URI;"));
    }

    @Test
    void preservesLineEndingsAndRemovesImplicitImports() throws Exception {
        String source = "package sample;\r\nimport missing.dependency.Unused;\r\nimport java.lang.String;\r\n"
            + "import sample.Example;\r\nimport sample.*;\r\nimport java.util.*;\r\n"
            + "class Example {\r\n\tString value;\r\n}\r\n";
        assertEquals(RemoveUnusedImports.removeUnusedImports(source),
            postprocessor.removeUnusedImports("Example.java", source));
    }

    @Test
    void normalizesJavadocLineBreaksWithoutRegex() {
        String source = "a\r\nb\rc\nd\u000Be\ff\u0085g\u2028h\u2029";
        for (String separator : new String[] { "\n", "\r\n" }) {
            assertEquals(Utils.normalizeEolInTextBlock(source, separator),
                BrowserCompatibility.normalizeEolInTextBlock(source, separator));
        }
    }

    @Test
    void rejectsMalformedSourceBeforeReturningFiles() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
            () -> postprocessor.removeUnusedImports("Broken.java", "class Broken {"));
        assertTrue(error.getMessage().contains("Broken.java"));
    }
}
