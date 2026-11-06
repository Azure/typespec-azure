// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.ImportDeclaration;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.PackageDeclaration;
import com.github.javaparser.ast.comments.JavadocComment;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.expr.Name;
import com.github.javaparser.ast.expr.NameExpr;
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import com.github.javaparser.javadoc.description.JavadocDescription;
import com.github.javaparser.javadoc.description.JavadocInlineTag;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

final class BrowserPostprocessor {
    // RAW skips reflection-dependent validation, but still reports Java grammar errors.
    private final JavaParser parser = new JavaParser(new ParserConfiguration()
        .setLanguageLevel(ParserConfiguration.LanguageLevel.RAW)
        .setAttributeComments(false)
        .setTabSize(1));

    String removeUnusedImports(String fileName, String source) {
        var parsed = parser.parse(source);
        if (!parsed.isSuccessful()) {
            throw new IllegalArgumentException("Failed to parse generated Java file " + fileName + ": "
                + parsed.getProblems().get(0).getMessage());
        }
        var unit = parsed.getResult().orElseThrow();
        Set<String> used = new HashSet<>();
        collectNames(unit, used);
        parsed.getCommentsCollection().ifPresent(comments -> {
            for (var comment : comments.getComments()) {
                if (comment instanceof JavadocComment javadocComment) {
                    var javadoc = javadocComment.parse();
                    collectJavadocNames(javadoc.getDescription(), used);
                    for (var tag : javadoc.getBlockTags()) {
                        collectJavadocNames(tag.getContent(), used);
                        switch (tag.getTagName()) {
                            case "see", "throws", "exception", "uses", "provides" ->
                                collectReferenceNames(tag.getName().orElse(tag.getContent().toText()), used);
                        }
                    }
                }
            }
        });
        String packageName = unit.getPackageDeclaration().map(declaration -> declaration.getNameAsString()).orElse("");
        List<Integer> lineStarts = new ArrayList<>();
        lineStarts.add(0);
        for (int i = 0; i < source.length(); i++) {
            char value = source.charAt(i);
            if (value == '\r' || value == '\n') {
                if (value == '\r' && i + 1 < source.length() && source.charAt(i + 1) == '\n') {
                    i++;
                }
                lineStarts.add(i + 1);
            }
        }
        StringBuilder result = new StringBuilder(source);
        for (int i = unit.getImports().size() - 1; i >= 0; i--) {
            ImportDeclaration declaration = unit.getImports().get(i);
            String qualifier = declaration.isAsterisk() ? declaration.getNameAsString()
                : declaration.getName().getQualifier().map(Name::asString).orElse("");
            if (!qualifier.equals("java.lang") && !qualifier.equals(packageName)
                && (declaration.isAsterisk() || used.contains(declaration.getName().getIdentifier()))) {
                continue;
            }
            var range = declaration.getRange().orElseThrow();
            int start = lineStarts.get(range.begin.line - 1) + range.begin.column - 1;
            int end = lineStarts.get(range.end.line - 1) + range.end.column;
            while (end < source.length() && source.charAt(end) == ' ') {
                end++;
            }
            if (end < source.length() && source.charAt(end) == '\r') {
                end++;
            }
            if (end < source.length() && source.charAt(end) == '\n') {
                end++;
            }
            result.delete(start, end);
        }
        return result.toString();
    }

    private static void collectJavadocNames(JavadocDescription description, Set<String> used) {
        for (var element : description.getElements()) {
            if (element instanceof JavadocInlineTag tag) {
                switch (tag.getType()) {
                    case LINK, LINKPLAIN, VALUE -> collectReferenceNames(tag.getContent(), used);
                }
            }
        }
    }

    private static void collectNames(Node node, Set<String> used) {
        if (node instanceof ImportDeclaration || node instanceof PackageDeclaration) {
            return;
        }
        if (node instanceof NameExpr name) {
            used.add(name.getNameAsString());
        } else if (node instanceof ClassOrInterfaceType type && type.getScope().isEmpty()) {
            used.add(type.getNameAsString());
        } else if (node instanceof MethodCallExpr call && call.getScope().isEmpty()) {
            used.add(call.getNameAsString());
        } else if (node instanceof Name name && name.getQualifier().isEmpty()) {
            used.add(name.getIdentifier());
        }
        for (Node child : node.getChildNodes()) {
            collectNames(child, used);
        }
    }

    private static void collectReferenceNames(String reference, Set<String> used) {
        reference = reference.stripLeading();
        if (reference.startsWith("\"") || reference.startsWith("<")) {
            return;
        }
        int parentheses = 0;
        for (int i = 0; i < reference.length();) {
            char value = reference.charAt(i);
            if (Character.isWhitespace(value) && parentheses == 0) {
                break;
            }
            if (value == '(') {
                parentheses++;
            } else if (value == ')') {
                parentheses--;
            }
            if (Character.isJavaIdentifierStart(value)) {
                int start = i++;
                while (i < reference.length() && Character.isJavaIdentifierPart(reference.charAt(i))) {
                    i++;
                }
                if (start == 0 || (reference.charAt(start - 1) != '.' && reference.charAt(start - 1) != '#')) {
                    used.add(reference.substring(start, i));
                }
            } else {
                i++;
            }
        }
    }
}
