# Orders infrastructure reservation

Concrete persistence is deliberately absent. A future Dataverse adapter may
implement `OrderRepository` after its physical schema is approved. It must
remain an adapter: Domain owns invariants and Application owns authorization.

Business Central inventory belongs to a separate future integration after its
custom API and `availableQuantity` formula are approved. No inventory adapter,
external client, framework provider, or real system access is included here.
