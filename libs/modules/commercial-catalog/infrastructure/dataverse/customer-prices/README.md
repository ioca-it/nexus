# Dataverse customer prices

`DataverseCustomerPriceGateway` issues one equality-filtered query for the
requested customer, active state, and product when applicable. Optional
validity bounds are evaluated in memory over that one validated collection
because the injected client cannot express the required OR conditions.

The repository maps records through `createCustomerPrice()`. It does not
recalculate validity, infer prices, calculate discounts, convert currencies, or
expose writes.
