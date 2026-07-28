import type {
  NotificationChannel,
  NotificationRecipient,
  NotificationTemplate,
} from '../../engines/notifications';
import type {
  NotificationConfiguration,
  NotificationEvent,
  NotificationRecipientGroup,
  ResolvedNotificationConfiguration,
} from './notification-configuration.types';

const CONFIGURATION_RESOLVED_REASON = 'Notification configuration resolved';
const ROUTE_NOT_FOUND_REASON = 'Notification route not found';
const ROUTE_DISABLED_REASON = 'Notification route disabled';
const TEMPLATE_NOT_FOUND_REASON = 'Notification template not found';
const RECIPIENT_GROUP_NOT_FOUND_REASON =
  'Notification recipient group not found';
const TEMPLATE_CHANNEL_NOT_CONFIGURED_REASON =
  'Notification template channel not configured';

function createResolution(
  enabled: boolean,
  valid: boolean,
  reason: string
): ResolvedNotificationConfiguration {
  return {
    enabled,
    templates: [],
    recipientsByChannel: {},
    valid,
    reason,
  };
}

export function resolveNotificationConfiguration(
  configuration: NotificationConfiguration,
  event: NotificationEvent
): ResolvedNotificationConfiguration {
  const route = configuration.routes.find(
    (candidate) => candidate.eventId === event.eventId
  );

  if (!route) {
    return createResolution(false, false, ROUTE_NOT_FOUND_REASON);
  }

  if (!route.enabled) {
    return createResolution(false, true, ROUTE_DISABLED_REASON);
  }

  const templatesById = new Map<string, NotificationTemplate>();
  const recipientGroupsById = new Map<string, NotificationRecipientGroup>();

  // Opti ChatGPT: índices construidos en una pasada evitan búsquedas repetidas por cada referencia de la ruta.
  for (const template of configuration.templates) {
    templatesById.set(template.templateId, template);
  }
  for (const group of configuration.recipientGroups) {
    recipientGroupsById.set(group.groupId, group);
  }

  const channels = new Set<NotificationChannel>(route.channels);
  const templates: NotificationTemplate[] = [];

  for (const templateId of route.templateIds) {
    const template = templatesById.get(templateId);

    if (!template) {
      return createResolution(true, false, TEMPLATE_NOT_FOUND_REASON);
    }

    if (!channels.has(template.channel)) {
      return createResolution(
        true,
        false,
        TEMPLATE_CHANNEL_NOT_CONFIGURED_REASON
      );
    }

    templates.push(template);
  }

  const recipientsByAddress = new Map<string, NotificationRecipient>();

  for (const groupId of route.recipientGroups) {
    const group = recipientGroupsById.get(groupId);

    if (!group) {
      return createResolution(
        true,
        false,
        RECIPIENT_GROUP_NOT_FOUND_REASON
      );
    }

    for (const recipient of group.recipients) {
      if (!recipientsByAddress.has(recipient.address)) {
        recipientsByAddress.set(recipient.address, recipient);
      }
    }
  }

  const recipients = [...recipientsByAddress.values()];
  const recipientsByChannel: Partial<
    Record<NotificationChannel, readonly NotificationRecipient[]>
  > = {};

  for (const channel of channels) {
    recipientsByChannel[channel] = recipients;
  }

  return {
    enabled: true,
    templates,
    recipientsByChannel,
    valid: true,
    reason: CONFIGURATION_RESOLVED_REASON,
  };
}
