import type {
  NotificationRequest,
  PreparedNotification,
} from './notification.types';

const NOTIFICATION_PREPARED_REASON = 'Notification prepared';
const MISSING_VARIABLE_REASON = 'Missing template variable';
const MISSING_RECIPIENT_REASON = 'At least one recipient is required';
const EMPTY_RECIPIENT_ADDRESS_REASON = 'Recipient address is required';
const VARIABLE_PATTERN = /{{([^{}]+)}}/g;

interface RenderedText {
  readonly value: string;
  readonly valid: boolean;
}

function renderText(
  text: string,
  variables: Readonly<Record<string, string>>
): RenderedText {
  let valid = true;

  // Opti ChatGPT: una sola llamada a replace combina la detección y sustitución de variables en cada texto.
  const value = text.replace(VARIABLE_PATTERN, (placeholder, variableName) => {
    if (!Object.prototype.hasOwnProperty.call(variables, variableName)) {
      valid = false;
      return placeholder;
    }

    return variables[variableName];
  });

  return { value, valid };
}

function createPreparedNotification(
  request: NotificationRequest,
  subject: string,
  body: string,
  valid: boolean,
  reason: string
): PreparedNotification {
  return {
    templateId: request.template.templateId,
    channel: request.template.channel,
    recipients: request.recipients,
    subject,
    body,
    valid,
    reason,
  };
}

export function prepareNotification(
  request: NotificationRequest
): PreparedNotification {
  if (request.recipients.length === 0) {
    return createPreparedNotification(
      request,
      request.template.subject,
      request.template.body,
      false,
      MISSING_RECIPIENT_REASON
    );
  }

  for (const recipient of request.recipients) {
    if (recipient.address.trim().length === 0) {
      return createPreparedNotification(
        request,
        request.template.subject,
        request.template.body,
        false,
        EMPTY_RECIPIENT_ADDRESS_REASON
      );
    }
  }

  const subject = renderText(request.template.subject, request.variables);
  if (!subject.valid) {
    return createPreparedNotification(
      request,
      subject.value,
      request.template.body,
      false,
      MISSING_VARIABLE_REASON
    );
  }

  const body = renderText(request.template.body, request.variables);
  if (!body.valid) {
    return createPreparedNotification(
      request,
      subject.value,
      body.value,
      false,
      MISSING_VARIABLE_REASON
    );
  }

  return createPreparedNotification(
    request,
    subject.value,
    body.value,
    true,
    NOTIFICATION_PREPARED_REASON
  );
}
