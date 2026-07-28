import { prepareNotification } from './notification-engine';
import type {
  NotificationChannel,
  NotificationRequest,
  NotificationTemplate,
} from './notification.types';

const recipients = [
  {
    recipientId: 'user-1',
    address: 'user@example.com',
    displayName: 'Example User',
  },
] as const;

function createRequest(
  channel: NotificationChannel,
  template: Partial<NotificationTemplate> = {}
): NotificationRequest {
  return {
    template: {
      templateId: `${channel}-template`,
      channel,
      subject: 'Hello {{name}}',
      body: 'Welcome, {{name}}.',
      ...template,
    },
    recipients,
    variables: { name: 'Alex' },
  };
}

describe('prepareNotification', () => {
  it('prepares a valid email notification', () => {
    expect(prepareNotification(createRequest('email'))).toEqual({
      templateId: 'email-template',
      channel: 'email',
      recipients,
      subject: 'Hello Alex',
      body: 'Welcome, Alex.',
      valid: true,
      reason: 'Notification prepared',
    });
  });

  it('prepares a valid Teams notification', () => {
    expect(prepareNotification(createRequest('teams'))).toMatchObject({
      channel: 'teams',
      valid: true,
      reason: 'Notification prepared',
    });
  });

  it('prepares a valid portal notification', () => {
    expect(prepareNotification(createRequest('portal'))).toMatchObject({
      channel: 'portal',
      valid: true,
      reason: 'Notification prepared',
    });
  });

  it('replaces multiple variables in subject and body', () => {
    const request: NotificationRequest = {
      template: {
        templateId: 'order-template',
        channel: 'email',
        subject: 'Order {{orderId}} for {{customer}}',
        body: '{{customer}}, order {{orderId}} is ready.',
      },
      recipients,
      variables: {
        orderId: 'NEXUS-42',
        customer: 'Contoso',
      },
    };

    expect(prepareNotification(request)).toMatchObject({
      subject: 'Order NEXUS-42 for Contoso',
      body: 'Contoso, order NEXUS-42 is ready.',
      valid: true,
    });
  });

  it('invalidates a notification with a missing variable', () => {
    const request = createRequest('email', {
      body: 'Welcome, {{missing}}.',
    });

    expect(prepareNotification(request)).toMatchObject({
      valid: false,
      reason: 'Missing template variable',
    });
  });

  it('invalidates a notification without recipients', () => {
    const request: NotificationRequest = {
      ...createRequest('email'),
      recipients: [],
    };

    expect(prepareNotification(request)).toMatchObject({
      valid: false,
      reason: 'At least one recipient is required',
    });
  });

  it('invalidates a notification with an empty recipient address', () => {
    const request: NotificationRequest = {
      ...createRequest('email'),
      recipients: [{ recipientId: 'user-1', address: '   ' }],
    };

    expect(prepareNotification(request)).toMatchObject({
      valid: false,
      reason: 'Recipient address is required',
    });
  });

  it('supports a subject without variables', () => {
    const request = createRequest('email', {
      subject: 'NEXUS notification',
    });

    expect(prepareNotification(request)).toMatchObject({
      subject: 'NEXUS notification',
      body: 'Welcome, Alex.',
      valid: true,
    });
  });

  it('does not modify its inputs', () => {
    const request: NotificationRequest = Object.freeze({
      template: Object.freeze({
        templateId: 'immutable-template',
        channel: 'email' as const,
        subject: 'Hello {{name}}',
        body: 'Welcome, {{name}}.',
      }),
      recipients: Object.freeze(
        recipients.map((recipient) => Object.freeze({ ...recipient }))
      ),
      variables: Object.freeze({ name: 'Alex' }),
    });
    const originalRequest = {
      template: { ...request.template },
      recipients: request.recipients.map((recipient) => ({ ...recipient })),
      variables: { ...request.variables },
    };

    prepareNotification(request);

    expect(request).toEqual(originalRequest);
  });
});
