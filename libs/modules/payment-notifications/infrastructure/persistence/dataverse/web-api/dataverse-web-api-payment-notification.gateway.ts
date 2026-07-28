import type {
  PaymentNotificationInvoiceRecord,
  PaymentNotificationRecord,
} from '../../payment-notification.persistence.types';
import type { PaymentNotificationPersistence } from '../../mappers';
import type { DataversePaymentNotificationGateway } from '../dataverse-payment-notification.gateway';
import type { DataverseClient, DataverseOperation } from './dataverse-client';
import type { DataversePaymentNotificationSchema } from './dataverse-payment-notification.schema';

type PhysicalRecord = Readonly<Record<string, unknown>>;

function invalidRecord(recordType: string, field: string): never {
  throw new Error(
    `Invalid Dataverse ${recordType} record: missing or invalid field "${field}"`,
  );
}

function readString(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): string {
  const value = record[field];

  if (typeof value !== 'string' || value.length === 0) {
    return invalidRecord(recordType, field);
  }

  return value;
}

function readIsoDate(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): string {
  const value = readString(record, field, recordType);

  if (Number.isNaN(Date.parse(value))) {
    return invalidRecord(recordType, field);
  }

  return value;
}

function readNumber(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): number {
  const value = record[field];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalidRecord(recordType, field);
  }

  return value;
}

function readOptionalString(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): string | undefined {
  const value = record[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return invalidRecord(recordType, field);
  }

  return value;
}

export class DataverseWebApiPaymentNotificationGateway
  implements DataversePaymentNotificationGateway
{
  private readonly client: DataverseClient;
  private readonly schema: DataversePaymentNotificationSchema;

  constructor(dependencies: {
    readonly client: DataverseClient;
    readonly schema: DataversePaymentNotificationSchema;
  }) {
    this.client = dependencies.client;
    this.schema = dependencies.schema;
  }

  async create(persistence: PaymentNotificationPersistence): Promise<void> {
    const operations: readonly DataverseOperation[] = Object.freeze([
      this.createNotificationOperation(persistence.notification),
      ...persistence.invoices.map((invoice) =>
        this.createInvoiceOperation(invoice),
      ),
    ]);

    await this.client.executeAtomic(operations);
  }

  async replace(persistence: PaymentNotificationPersistence): Promise<void> {
    const operations: readonly DataverseOperation[] = Object.freeze([
      Object.freeze({
        type: 'update',
        entitySet: this.schema.notificationEntitySet,
        id: persistence.notification.id,
        record: this.toPhysicalNotification(persistence.notification),
      }),
      Object.freeze({
        type: 'deleteWhere',
        entitySet: this.schema.invoiceEntitySet,
        filter: Object.freeze({
          [this.schema.invoiceFields.paymentNotificationId]:
            persistence.notification.id,
        }),
      }),
      ...persistence.invoices.map((invoice) =>
        this.createInvoiceOperation(invoice),
      ),
    ]);

    await this.client.executeAtomic(operations);
  }

  async findById(id: string): Promise<PaymentNotificationPersistence | null> {
    const physicalNotification = await this.client.findOne(
      this.schema.notificationEntitySet,
      id,
    );

    if (!physicalNotification) {
      return null;
    }

    const notification = this.toNotificationRecord(physicalNotification);
    const physicalInvoices = await this.client.query(
      this.schema.invoiceEntitySet,
      Object.freeze({
        [this.schema.invoiceFields.paymentNotificationId]: id,
      }),
    );
    const invoices = Object.freeze(
      physicalInvoices.map((record) => this.toInvoiceRecord(record)),
    );

    return Object.freeze({ notification, invoices });
  }

  async exists(id: string): Promise<boolean> {
    const notification = await this.client.findOne(
      this.schema.notificationEntitySet,
      id,
    );

    return notification !== null;
  }

  async findByBankReference(
    customerId: string,
    bankReference: string,
  ): Promise<readonly PaymentNotificationPersistence[]> {
    const notifications = await this.client.query(
      this.schema.notificationEntitySet,
      Object.freeze({
        [this.schema.notificationFields.customerId]: customerId,
        [this.schema.notificationFields.bankReference]: bankReference,
      }),
    );

    return this.loadPersistence(notifications);
  }

  async findByCustomer(
    customerId: string,
  ): Promise<readonly PaymentNotificationPersistence[]> {
    const notifications = await this.client.query(
      this.schema.notificationEntitySet,
      Object.freeze({
        [this.schema.notificationFields.customerId]: customerId,
      }),
    );

    return this.loadPersistence(notifications);
  }

  private async loadPersistence(
    physicalNotifications: readonly PhysicalRecord[],
  ): Promise<readonly PaymentNotificationPersistence[]> {
    if (physicalNotifications.length === 0) {
      return Object.freeze([]);
    }

    const notifications: PaymentNotificationRecord[] = [];
    const notificationIds: string[] = [];
    const invoicesByNotificationId = new Map<
      string,
      PaymentNotificationInvoiceRecord[]
    >();

    for (const physicalNotification of physicalNotifications) {
      const notification = this.toNotificationRecord(physicalNotification);
      notifications.push(notification);
      notificationIds.push(notification.id);
      invoicesByNotificationId.set(notification.id, []);
    }

    // Opti ChatGPT: carga agrupada de relaciones para evitar consultas N+1.
    const physicalInvoices = await this.client.query(
      this.schema.invoiceEntitySet,
      Object.freeze({
        [this.schema.invoiceFields.paymentNotificationId]:
          Object.freeze(notificationIds),
      }),
    );

    for (const physicalInvoice of physicalInvoices) {
      const invoice = this.toInvoiceRecord(physicalInvoice);
      invoicesByNotificationId
        .get(invoice.paymentNotificationId)
        ?.push(invoice);
    }

    return Object.freeze(
      notifications.map((notification) =>
        Object.freeze({
          notification,
          invoices: Object.freeze([
            ...(invoicesByNotificationId.get(notification.id) ?? []),
          ]),
        }),
      ),
    );
  }

  private createNotificationOperation(
    notification: PaymentNotificationRecord,
  ): DataverseOperation {
    return Object.freeze({
      type: 'create',
      entitySet: this.schema.notificationEntitySet,
      record: this.toPhysicalNotification(notification),
    });
  }

  private createInvoiceOperation(
    invoice: PaymentNotificationInvoiceRecord,
  ): DataverseOperation {
    return Object.freeze({
      type: 'create',
      entitySet: this.schema.invoiceEntitySet,
      record: this.toPhysicalInvoice(invoice),
    });
  }

  private toPhysicalNotification(
    notification: PaymentNotificationRecord,
  ): PhysicalRecord {
    const fields = this.schema.notificationFields;
    const record = {
      [fields.id]: notification.id,
      [fields.customerId]: notification.customerId,
      [fields.status]: notification.status,
      [fields.paymentDate]: notification.paymentDate,
      [fields.amount]: notification.amount,
      [fields.currency]: notification.currency,
      [fields.bankReference]: notification.bankReference,
      [fields.createdAt]: notification.createdAt,
      [fields.updatedAt]: notification.updatedAt,
    };

    if (notification.receiptFileId === undefined) {
      return Object.freeze(record);
    }

    return Object.freeze({
      ...record,
      [fields.receiptFileId]: notification.receiptFileId,
    });
  }

  private toPhysicalInvoice(
    invoice: PaymentNotificationInvoiceRecord,
  ): PhysicalRecord {
    const fields = this.schema.invoiceFields;

    return Object.freeze({
      [fields.id]: invoice.id,
      [fields.paymentNotificationId]: invoice.paymentNotificationId,
      [fields.invoiceId]: invoice.invoiceId,
      [fields.createdAt]: invoice.createdAt,
    });
  }

  private toNotificationRecord(
    record: PhysicalRecord,
  ): PaymentNotificationRecord {
    const fields = this.schema.notificationFields;

    return Object.freeze({
      id: readString(record, fields.id, 'payment notification'),
      customerId: readString(record, fields.customerId, 'payment notification'),
      status: readString(record, fields.status, 'payment notification'),
      paymentDate: readIsoDate(
        record,
        fields.paymentDate,
        'payment notification',
      ),
      amount: readNumber(record, fields.amount, 'payment notification'),
      currency: readString(record, fields.currency, 'payment notification'),
      bankReference: readString(
        record,
        fields.bankReference,
        'payment notification',
      ),
      receiptFileId: readOptionalString(
        record,
        fields.receiptFileId,
        'payment notification',
      ),
      createdAt: readIsoDate(record, fields.createdAt, 'payment notification'),
      updatedAt: readIsoDate(record, fields.updatedAt, 'payment notification'),
    });
  }

  private toInvoiceRecord(
    record: PhysicalRecord,
  ): PaymentNotificationInvoiceRecord {
    const fields = this.schema.invoiceFields;

    return Object.freeze({
      id: readString(record, fields.id, 'payment notification invoice'),
      paymentNotificationId: readString(
        record,
        fields.paymentNotificationId,
        'payment notification invoice',
      ),
      invoiceId: readString(
        record,
        fields.invoiceId,
        'payment notification invoice',
      ),
      createdAt: readIsoDate(
        record,
        fields.createdAt,
        'payment notification invoice',
      ),
    });
  }
}
