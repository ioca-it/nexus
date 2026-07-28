import type {
  NotificationChannel,
  NotificationRecipient,
  NotificationTemplate,
} from '../../engines/notifications';

export interface NotificationEvent {
  readonly eventId: string;
  readonly module: string;
  readonly action: string;
}

export interface NotificationRoute {
  readonly eventId: string;
  readonly enabled: boolean;
  readonly channels: readonly NotificationChannel[];
  readonly templateIds: readonly string[];
  readonly recipientGroups: readonly string[];
}

export interface NotificationRecipientGroup {
  readonly groupId: string;
  readonly recipients: readonly NotificationRecipient[];
}

export interface NotificationConfiguration {
  readonly templates: readonly NotificationTemplate[];
  readonly routes: readonly NotificationRoute[];
  readonly recipientGroups: readonly NotificationRecipientGroup[];
}

export type NotificationRecipientsByChannel = Readonly<
  Partial<Record<NotificationChannel, readonly NotificationRecipient[]>>
>;

export interface ResolvedNotificationConfiguration {
  readonly enabled: boolean;
  readonly templates: readonly NotificationTemplate[];
  readonly recipientsByChannel: NotificationRecipientsByChannel;
  readonly valid: boolean;
  readonly reason: string;
}
