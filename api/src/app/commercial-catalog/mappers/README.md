# Commercial Catalog response mappers

The mappers convert domain read models into deeply frozen HTTP responses.
Dates are serialized as ISO 8601 and absent optional fields remain absent.
Mapping contains no authorization, price calculation, or inventory logic.
