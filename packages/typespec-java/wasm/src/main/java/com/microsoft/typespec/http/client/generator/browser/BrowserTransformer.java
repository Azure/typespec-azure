// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.microsoft.typespec.http.client.generator.browser;

import org.teavm.model.AccessLevel;
import org.teavm.model.ClassHolder;
import org.teavm.model.ClassHolderTransformer;
import org.teavm.model.ClassHolderTransformerContext;
import org.teavm.model.FieldHolder;
import org.teavm.model.MethodHolder;
import org.teavm.model.MethodReference;
import org.teavm.model.Program;
import org.teavm.model.ValueType;
import org.teavm.model.emit.ProgramEmitter;
import org.teavm.model.instructions.ClassConstantInstruction;
import org.teavm.model.instructions.InvokeInstruction;

/**
 * TeaVM-only adapters. The native generator JAR is never changed.
 */
public final class BrowserTransformer implements ClassHolderTransformer {
    private static final String GENERATOR = "com.microsoft.typespec.http.client.generator.";
    private static final String LOGGING = "io.clientcore.core.instrumentation.logging.";

    @Override
    public void transformClass(ClassHolder cls, ClassHolderTransformerContext context) {
        if (cls.getName().endsWith(".jackson.core.util.BufferRecycler")) {
            submitReferenceArray(context);
        }
        for (MethodHolder method : cls.getMethods()) {
            String name = method.getName();
            if ((cls.getName().equals(GENERATOR + "core.extension.plugin.NewPlugin") && name.equals("<init>"))
                || (cls.getName().equals(GENERATOR + "TypeSpecPlugin$MockConnection") && name.equals("<init>"))
                || (cls.getName().equals("org.slf4j.LoggerFactory") && name.equals("<clinit>"))
                || (cls.getName().equals(LOGGING + "ClientLogger") && name.equals("<init>"))) {
                method.setProgram(null);
                ProgramEmitter.create(method, context.getHierarchy()).exit();
            } else if (cls.getName().equals("org.slf4j.LoggerFactory") && name.equals("getLogger")) {
                method.setProgram(null);
                ProgramEmitter pe = ProgramEmitter.create(method, context.getHierarchy());
                pe.getField("org.slf4j.helpers.NOPLogger", "NOP_LOGGER",
                    ValueType.object("org.slf4j.helpers.NOPLogger")).returnValue();
            } else if (cls.getName().equals("org.slf4j.helpers.NOPLogger") && name.equals("error")) {
                method.setProgram(null);
                ProgramEmitter pe = ProgramEmitter.create(method, context.getHierarchy());
                pe.construct(IllegalStateException.class, pe.var(1, String.class)).raise();
            } else if (cls.getName().equals("org.slf4j.helpers.NOPLogger") && name.equals("isErrorEnabled")) {
                method.setProgram(null);
                ProgramEmitter.create(method, context.getHierarchy()).constant(1).returnValue();
            } else if (cls.getName().equals(LOGGING + "ClientLogger") && name.startsWith("at")) {
                method.setProgram(null);
                ProgramEmitter pe = ProgramEmitter.create(method, context.getHierarchy());
                pe.getField(LOGGING + "LoggingEvent", "NOOP", ValueType.object(LOGGING + "LoggingEvent")).returnValue();
            } else if (cls.getName().equals(LOGGING + "ClientLogger") && name.equals("canLogAtLevel")) {
                method.setProgram(null);
                ProgramEmitter.create(method, context.getHierarchy()).constant(0).returnValue();
            } else if (cls.getName().equals(LOGGING + "LoggingEvent")
                && (name.equals("log") || name.equals("performLogging") || name.equals("recordExceptionDetails"))) {
                method.setProgram(null);
                ProgramEmitter.create(method, context.getHierarchy()).exit();
            } else if (cls.getName().equals(GENERATOR + "core.model.projectmodel.Project")
                && name.equals("integrateWithSdk")) {
                method.setProgram(null);
                ProgramEmitter pe = ProgramEmitter.create(method, context.getHierarchy());
                pe.construct(UnsupportedOperationException.class,
                    pe.constant("SDK integration is not supported in the browser")).raise();
            }

            Program program = method.getProgram();
            if (program == null) {
                continue;
            }
            for (int i = 0; i < program.basicBlockCount(); i++) {
                for (var instruction : program.basicBlockAt(i)) {
                    if (instruction instanceof InvokeInstruction invoke) {
                        MethodReference ref = invoke.getMethod();
                        if ((ref.getClassName().equals("java.lang.String") && ref.getName().equals("lines"))
                            || (ref.getClassName().equals("java.util.regex.Pattern")
                                && ref.getName().equals("splitAsStream"))
                            || (ref.getClassName().equals("java.lang.Package")
                                && ref.getName().equals("getName")
                                && !cls.getName().equals(BrowserCompatibility.class.getName()))) {
                            var parameters = new ValueType[ref.parameterCount() + 2];
                            parameters[0] = ValueType.object(ref.getClassName());
                            for (int p = 0; p < ref.parameterCount(); p++) {
                                parameters[p + 1] = ref.parameterType(p);
                            }
                            parameters[parameters.length - 1] = ref.getReturnType();
                            invoke.setMethod(new MethodReference(BrowserCompatibility.class.getName(),
                                ref.getClassName().equals("java.lang.Package") ? "packageName" : ref.getName(),
                                parameters));
                            var args = new org.teavm.model.Variable[invoke.getArguments().size() + 1];
                            args[0] = invoke.getInstance();
                            for (int p = 1; p < args.length; p++) {
                                args[p] = invoke.getArguments().get(p - 1);
                            }
                            invoke.setArguments(args);
                            invoke.setInstance(null);
                        } else if (ref.getClassName().equals("java.lang.ClassLoader")
                            && ref.getName().equals("getResourceAsStream")) {
                            invoke.setMethod(new MethodReference(GENERATOR + "browser.BrowserResources", "open",
                                ValueType.object("java.lang.String"), ValueType.object("java.io.InputStream")));
                            invoke.setInstance(null);
                        }
                    } else if (instruction instanceof ClassConstantInstruction constant
                        && (constant.getConstant().equals(ValueType.object("javax.xml.namespace.QName"))
                            || constant.getConstant()
                                .equals(ValueType.object("javax.xml.stream.XMLStreamException")))) {
                        // These are used only for names of imports in generated XML code.
                        ClassHolder namedType
                            = new ClassHolder(((ValueType.Object) constant.getConstant()).getClassName());
                        namedType.setParent("java.lang.Object");
                        context.submit(namedType);
                    }
                }

            }
        }
    }

    private static void submitReferenceArray(ClassHolderTransformerContext context) {
        // Jackson's buffer recycler is confined to a single worker, so atomicity is unnecessary.
        ClassHolder array = new ClassHolder("java.util.concurrent.atomic.AtomicReferenceArray");
        array.setParent("java.lang.Object");
        array.setLevel(AccessLevel.PUBLIC);
        FieldHolder values = new FieldHolder("values");
        values.setType(ValueType.arrayOf(ValueType.object("java.lang.Object")));
        array.addField(values);
        for (String name : new String[] { "<init>", "get", "set", "getAndSet" }) {
            boolean write = name.equals("set") || name.equals("getAndSet");
            ValueType result
                = name.equals("<init>") || name.equals("set") ? ValueType.VOID : ValueType.object("java.lang.Object");
            MethodHolder method = write
                ? new MethodHolder(name, ValueType.INTEGER, ValueType.object("java.lang.Object"), result)
                : new MethodHolder(name, ValueType.INTEGER, result);
            method.setLevel(AccessLevel.PUBLIC);
            array.addMethod(method);
            ProgramEmitter pe = ProgramEmitter.create(method, context.getHierarchy());
            var self = pe.var(0, ValueType.object(array.getName()));
            if (name.equals("<init>")) {
                self.setField("values", pe.constructArray(Object.class, pe.var(1, int.class)));
                pe.exit();
            } else {
                var storage = self.getField("values", values.getType());
                var index = pe.var(1, int.class);
                var previous = storage.getElement(index);
                if (write) {
                    storage.setElement(index, pe.var(2, Object.class));
                }
                if (result == ValueType.VOID) {
                    pe.exit();
                } else {
                    previous.returnValue();
                }
            }
        }
        context.submit(array);
    }
}
