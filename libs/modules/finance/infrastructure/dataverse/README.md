# Dataverse Finance customer reference

The gateway uses the existing structural Dataverse `query(entitySet, filter)`
surface and configured physical names to load one customer reference. Missing
or inactive links return `null`; duplicates and invalid physical records fail
safely.

The current query contract has no projection option, so this adapter cannot
request `$select`. It only reads the three configured fields and performs one
query. The resolver converts the returned Business Central reference to the
nominal Finance identifier without equality fallback or inference.
