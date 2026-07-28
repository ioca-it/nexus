export type NotificationChannel = 'email' | 'teams' | 'portal';

export interface NotificationTemplate {
  readonly templateId: string;
  readonly channel: NotificationChannel;
  readonly subject: string;
  readonly body: string;
}

export interface NotificationRecipient {
  readonly recipientId: string;
  readonly address: string;
  readonly displayName?: string;
}

export interface NotificationRequest {
  readonly template: NotificationTemplate;
  readonly recipients: readonly NotificationRecipient[];
  readonly variables: Readonly<Record<string, string>>;
}

export interface PreparedNotification {
  readonly templateId: string;
  readonly channel: NotificationChannel;
  readonly recipients: readonly NotificationRecipient[];
  readonly subject: string;
  readonly body: string;
  readonly valid: boolean;
  readonly reason: string;
}
