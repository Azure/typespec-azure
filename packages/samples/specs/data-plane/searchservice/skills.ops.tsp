import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";
import "./skills.models.tsp";

using TypeSpec.Http;

namespace Azure.SearchService;

@tag("Skillsets")
interface Skillsets {
  @route("/skillsets")
  @doc("List all skillsets in a search service.")
  @get
  list(...SelectParameter, ...ClientRequestIdParameter, ...ApiVersionParameter): CollectionResult<
    SearchIndexerSkillset,
    "Skillsets"
  > | SearchError;

  @route("/skillsets")
  @doc("Creates a new skillset in a search service.")
  @post
  create(
    @doc("The skillset containing one or more skills to create in a search service.")
    @body
    body: SearchIndexerSkillset,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchCreatedResponse<SearchIndexerSkillset> | SearchError;

  @doc("Retrieves a skillset in a search service.")
  @route("/skillsets('{skillsetName}')")
  @get
  get(
    @doc("The name of the skillset to retrieve.")
    @path
    skillsetName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchIndexerSkillset | SearchError;

  @doc("Creates a new skillset in a search service or updates the skillset if it already exists.")
  @route("/skillsets('{skillsetName}')")
  @put
  createOrUpdate(
    @doc("The name of the skillset to create or update.")
    @path
    skillsetName: string,

    @doc("The skillset containing one or more skills to create or update in a search service.")
    @body
    body: SearchIndexerSkillset,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchIndexerSkillset | SearchError;

  @doc("Deletes a skillset in a search service.")
  @route("/skillsets('{skillsetName}')")
  @delete
  delete(
    @doc("The name of the skillset to delete.")
    @path
    skillsetName: string,

    ...ClientRequestIdParameter,
    ...IfMatchParameter,
    ...IfNoneMatchParameter,
    ...ApiVersionParameter,
  ): NoContentResponse | SearchError;

  @doc("Reset an existing skillset in a search service")
  @route("/skillsets('{skillsetName}')")
  @post
  resetSkills(
    @doc("The name of the skillset to reset.")
    @path
    skillsetName: string,

    @body
    body: SkillNames,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): NoContentResponse | SearchError;
}
