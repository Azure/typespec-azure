import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @clientLocation decorator - moving operations between client operation groups")
@scenarioService("/azure/client-generator-core/client-location")
namespace _Specs_.Azure.ClientGenerator.Core.ClientLocation;

// Scenario 1: Move an operation to another operation group (existing interface)
@scenarioDoc("""
  Test moving an operation from one operation group to another existing operation group.
  
  Operation `a2` from interface `A` should be moved to interface `B` using @clientLocation(B).
  
  Expected client structure:
  - Interface A should contain only operation `a1`
  - Interface B should contain operations `b` and `a2` (moved from A)
  """)
@scenario
namespace MoveToExistingGroup {
  interface A {
    @route("/a1")
    @get
    op a1(): void;

    @route("/a2")
    @get
    @clientLocation(B)
    op a2(): void;
  }

  interface B {
    @route("/b")
    @get
    op b(): void;
  }
}

// Scenario 2: Move an operation to a new operation group (string name)
@scenarioDoc("""
  Test moving an operation to a new operation group specified by string name.
  
  Operation `a2` from interface `A` should be moved to a new group named "NewGroup" using @clientLocation("NewGroup").
  
  Expected client structure:
  - Interface A should contain only operation `a1`  
  - A new group "NewGroup" should be created containing operation `a2`
  """)
@scenario
namespace MoveToNewGroup {
  interface A {
    @route("/move-to-new/a1")
    @get
    op a1(): void;

    @route("/move-to-new/a2")
    @get
    @clientLocation("NewGroup")
    op a2(): void;
  }
}

// Scenario 3: Move an operation to root client
@scenarioDoc("""
  Test moving an operation to the root client.
  
  Operation `a2` from interface `A` should be moved to the root client using @clientLocation(service namespace).
  
  Expected client structure:
  - Interface A should contain only operation `a1`
  - Root client should contain operation `a2` (moved from A)
  """)
@scenario
namespace MoveToRootClient {
  interface A {
    @route("/move-to-root/a1")
    @get
    op a1(): void;

    @route("/move-to-root/a2")
    @get
    @clientLocation(_Specs_.Azure.ClientGenerator.Core.ClientLocation)
    op a2(): void;
  }
}