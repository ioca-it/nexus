# Fetch Dataverse Client

`FetchDataverseClient` implements the generic `DataverseClient` contract using
native `fetch`. It receives an already composed Dataverse Web API base URL and
an injected asynchronous access-token provider. Existing workspace Dataverse
configuration can supply the environment URL and API version at composition
time; this client does not read environment variables or acquire Azure tokens.

Public operations request one token and reuse it for every HTTP request needed
by that operation. JSON requests include the required Dataverse OData headers.
Queries support scalar filters, grouped string-array filters, escaped string
literals, and `@odata.nextLink` pagination.

Atomic execution resolves `deleteWhere` matches before constructing one
multipart `$batch` request containing a single changeset. Final create, update,
and delete writes are never issued individually during atomic execution.

`DataverseHttpError` preserves the HTTP status and optional response body
without including or logging access tokens.
