import { resolveNotificationConfiguration } from './notification-configuration-resolver';
import type {
  NotificationConfiguration,
  NotificationEvent,
  NotificationRoute,
} from './notification-configuration.types';

const event: NotificationEvent = {
  eventId: 'order.created',
  module: 'orders',
  action: 'create',
};

const baseRoute: NotificationRoute = {
  eventId: event.eventId,
  enabled: true,
  channels: ['email'],
  templateIds: ['email-template'],
  recipientGroups: ['operations'],
};

function createConfiguration(
  route: NotificationRoute = baseRoute
): NotificationConfiguration {
  return {
    templates: [
      {
        templateId: 'email-template',
        channel: 'email',
        subject: 'Order {{orderId}}',
        body: 'Order {{orderId}} was created.',
      },
      {
        templateId: 'teams-template',
        channel: 'teams',
        subject: 'Order {{orderId}}',
        body: 'Order {{orderId}} was created.',
      },
    ],
    routes: [route],
    recipientGroups: [
      {
        groupId: 'operations',
        recipients: [
          {
            recipientId: 'user-1',
            address: 'user@example.com',
          },
        ],
      },
      {
        groupId: 'management',
        recipients: [
          {
            recipientId: 'user-1-duplicate',
            address: 'user@example.com',
          },
          {
            recipientId: 'user-2',
            address: 'manager@example.com',
          },
        ],
      },
    ],
  };
}

describe('resolveNotificationConfiguration', () => {
  it('resolves a valid route', () => {
    expect(
      resolveNotificationConfiguration(createConfiguration(), event)
    ).toEqual({
      enabled: true,
      templates: [createConfiguration().templates[0]],
      recipientsByChannel: {
        email: [createConfiguration().recipientGroups[0].recipients[0]],
      },
      valid: true,
      reason: 'Notification configuration resolved',
    });
  });

  it('invalidates a missing route', () => {
    expect(
      resolveNotificationConfiguration(createConfiguration(), {
        ...event,
        eventId: 'order.deleted',
      })
    ).toEqual({
      enabled: false,
      templates: [],
      recipientsByChannel: {},
      valid: false,
      reason: 'Notification route not found',
    });
  });

  it('resolves a disabled route without an error', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      enabled: false,
      templateIds: ['missing-template'],
      recipientGroups: ['missing-group'],
    });

    expect(resolveNotificationConfiguration(configuration, event)).toEqual({
      enabled: false,
      templates: [],
      recipientsByChannel: {},
      valid: true,
      reason: 'Notification route disabled',
    });
  });

  it('invalidates a missing template', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      templateIds: ['missing-template'],
    });

    expect(
      resolveNotificationConfiguration(configuration, event)
    ).toMatchObject({
      enabled: true,
      valid: false,
      reason: 'Notification template not found',
    });
  });

  it('invalidates a missing recipient group', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      recipientGroups: ['missing-group'],
    });

    expect(
      resolveNotificationConfiguration(configuration, event)
    ).toMatchObject({
      enabled: true,
      valid: false,
      reason: 'Notification recipient group not found',
    });
  });

  it('invalidates a template whose channel is not configured', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      templateIds: ['teams-template'],
    });

    expect(
      resolveNotificationConfiguration(configuration, event)
    ).toMatchObject({
      enabled: true,
      valid: false,
      reason: 'Notification template channel not configured',
    });
  });

  it('resolves multiple channels', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      channels: ['email', 'teams'],
      templateIds: ['email-template', 'teams-template'],
    });

    expect(
      resolveNotificationConfiguration(configuration, event)
    ).toMatchObject({
      enabled: true,
      templates: configuration.templates,
      recipientsByChannel: {
        email: configuration.recipientGroups[0].recipients,
        teams: configuration.recipientGroups[0].recipients,
      },
      valid: true,
    });
  });

  it('removes duplicate recipient addresses within a channel', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      recipientGroups: ['operations', 'management'],
    });

    const resolution = resolveNotificationConfiguration(configuration, event);

    expect(resolution.recipientsByChannel.email).toEqual([
      configuration.recipientGroups[0].recipients[0],
      configuration.recipientGroups[1].recipients[1],
    ]);
  });

  it('does not modify its inputs', () => {
    const source = createConfiguration();
    const configuration: NotificationConfiguration = Object.freeze({
      templates: Object.freeze(
        source.templates.map((template) => Object.freeze({ ...template }))
      ),
      routes: Object.freeze(
        source.routes.map((route) =>
          Object.freeze({
            ...route,
            channels: Object.freeze([...route.channels]),
            templateIds: Object.freeze([...route.templateIds]),
            recipientGroups: Object.freeze([...route.recipientGroups]),
          })
        )
      ),
      recipientGroups: Object.freeze(
        source.recipientGroups.map((group) =>
          Object.freeze({
            ...group,
            recipients: Object.freeze(
              group.recipients.map((recipient) =>
                Object.freeze({ ...recipient })
              )
            ),
          })
        )
      ),
    });
    const immutableEvent = Object.freeze({ ...event });
    const originalConfiguration = createConfiguration();
    const originalEvent = { ...event };

    resolveNotificationConfiguration(configuration, immutableEvent);

    expect(configuration).toEqual(originalConfiguration);
    expect(immutableEvent).toEqual(originalEvent);
  });
});
