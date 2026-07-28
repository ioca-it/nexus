# Authenticated Actor

This package defines the stable, infrastructure-independent representation of an
authenticated and authorized NEXUS actor.

`userId` is exclusively the authenticated Microsoft Entra ID `oid`. The actor's
`customerId`, roles, explicit permissions, approval groups, and active status
must come from an authorized source. No value is inferred from JWT profile
claims, email addresses, domains, names, or roles.

Use `createAuthenticatedActor` to validate identifiers and create an immutable
snapshot. Client actors require a `customerId`; an authorized resolver may
produce an administrative actor with `customerId` set to `null`.

`AuthenticatedActorResolver.resolveByOid` returns the actor only when the user
exists and is active. It returns `null` for both missing and inactive users so
those states are not disclosed publicly. A future resolver implementation must
propagate technical data-source failures.

This package contains no JWT parsing, NestJS integration, persistence, or
business-module behavior.
