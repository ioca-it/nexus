# Payment Notification Repository

Defines the domain persistence contract used by Payment Notifications use
cases.

```ts
import type { PaymentNotificationRepository } from '@nexus/modules/payment-notifications';
```

The contract provides asynchronous create, update, existence, and query
operations. Query collections are readonly.

This package contains no repository implementation, storage logic,
infrastructure adapter, framework dependency, or Dataverse dependency.
