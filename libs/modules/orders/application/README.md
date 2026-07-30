# Orders application

Application cases authorize through the actor's explicit permissions and derive
customer identity only from `actor.customerId`. The catalog resolver receives
the complete actor and returns the only product and price data accepted for a
line snapshot.

Create persists an empty draft. Update replaces all lines atomically after all
catalog resolutions succeed. Read cases enforce permission and ownership.
There is no inventory, workflow, HTTP, framework, or concrete persistence code.
