import "./storage-queue-main.tsp";

using Storage.Queues;

// Azurite overlay: real, documented emulator-specific customizations layered on top of the
// unchanged, vendored Storage Queue TypeSpec (see PROVENANCE.md). Source of truth for what
// Azurite documents customizing: https://github.com/Azure/Azurite/blob/main/swagger/queue.md
// ("Changes Made to Client Swagger"), which lists exactly two changes as of this writing:
//
//   1. "Remove minimum/maximum limitation for 'VisibilityTimeout' and
//      'VisibilityTimeoutRequired'."
//   2. "Remove 'required' section from definition 'AccessPolicy' to align with server
//      behavior."
//
// What's demonstrated/found below, working from the real vendored TypeSpec:
//
// - (1), partial/first use site -- WORKS: VisibilityTimeoutParameter (models.tsp) is the shared
//   alias sendMessage (routes.tsp) spreads in via ...VisibilityTimeoutParameter. Its
//   visibilityTimeout property carries @maxValue(604800) (7 days) in the real spec -- note the
//   real spec has already dropped the @minValue half of this constraint pair upstream, so only
//   the max remains to relax. Re-applying @@maxValue with a larger bound here measurably changes
//   what getMaxValue() resolves for sendMessage's parameter (verified directly against the
//   compiled program: 604800 -> 2147483647), proving augment-decorator overlays can relax (not
//   just add) a numeric constraint from the shared base spec without editing it.
//
// - (1), second use site -- GAP, not resolved here: Azurite's wording ("...and
//   'VisibilityTimeoutRequired'") refers to a second, independently-declared visibilityTimeout
//   parameter on Queue.updateMessage (routes.tsp) -- a required param with its own identical
//   @maxValue(604800), not spread from the shared alias. Attempting the same pattern
//   (@@maxValue(Storage.Queues.Queue.updateMessage::parameters.visibilityTimeout, ...)) fails to
//   compile with "invalid-ref: Model doesn't have member visibilityTimeout", because
//   updateMessage is declared as `op updateMessage is StorageOperationNoBody<{...}, {...}>` (an
//   operation-signature template instantiation, not a plain operation body), and the
//   ::parameters reflection accessor resolves against the template's own declared parameter
//   list rather than the fully-substituted member set a dispatcher/handler actually sees. Left
//   unresolved pending further TypeSpec reflection investigation -- see this package's README
//   "real-spec compatibility" section.
//
// - (2) -- ALREADY SATISFIED UPSTREAM, nothing to demonstrate: the current vendored
//   models.tsp's AccessPolicy model already declares start, expiry, and permission as optional
//   (?) -- the specific Swagger "required" section Azurite's note refers to appears to have
//   already been relaxed in the TypeSpec conversion of this spec, independent of Azurite's own
//   fork. No overlay is needed or added for this one.
@@maxValue(Storage.Queues.VisibilityTimeoutParameter.visibilityTimeout, 2147483647);

// A second, independent overlay mechanism demonstration (not from Azurite's documented Swagger
// changes, but illustrating the same "separate file layers non-breaking metadata onto an
// unchanged base" pattern with a real operation from the vendored spec): an @@doc override
// adding an Azurite-specific implementation note, the same augment-decorator pattern the toy
// queue-pilot fixture (test/fixtures/queue-pilot/azurite.tsp) demonstrates on a synthetic
// service.
@@doc(
  Storage.Queues.Queue.sendMessage,
  "Adds a new message to the back of the message queue. Azurite note: the emulator enforces the same relaxed visibility-timeout bound as the real service override above, rather than the base spec's documented 7-day maximum."
);
