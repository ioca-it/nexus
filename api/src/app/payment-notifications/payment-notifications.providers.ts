import type { FactoryProvider, Provider } from '@nestjs/common';
import { getAppConfig } from '@nexus/config';
import {
  CreateDraftPaymentNotificationUseCase,
  RejectPaymentNotificationUseCase,
  RequestChangesPaymentNotificationUseCase,
  ResubmitPaymentNotificationUseCase,
  StartReviewPaymentNotificationUseCase,
  SubmitPaymentNotificationUseCase,
  UpdatePaymentNotificationUseCase,
  ValidatePaymentNotificationUseCase,
  type Clock,
  type PaymentNotification,
  type PaymentNotificationRepository,
} from '@nexus/modules/payment-notifications';
import { createDataversePaymentNotificationRepository } from '@nexus/modules/payment-notifications/infrastructure';
import {
  createStateTransition,
  type DataverseAccessTokenProvider,
  type StateTransition,
} from '@nexus/platform';

import {
  createDataverseBaseUrl,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
} from '../dataverse';
import {
  CREATE_DRAFT_PAYMENT_NOTIFICATION_USE_CASE,
  PAYMENT_NOTIFICATION_CLOCK,
  PAYMENT_NOTIFICATION_REPOSITORY,
  PAYMENT_NOTIFICATION_STATE_TRANSITION,
  REJECT_PAYMENT_NOTIFICATION_USE_CASE,
  REQUEST_CHANGES_PAYMENT_NOTIFICATION_USE_CASE,
  RESUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
  START_REVIEW_PAYMENT_NOTIFICATION_USE_CASE,
  SUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
  UPDATE_PAYMENT_NOTIFICATION_USE_CASE,
  VALIDATE_PAYMENT_NOTIFICATION_USE_CASE,
} from './payment-notifications.tokens';

export const paymentNotificationRepositoryProviderDefinition: FactoryProvider<PaymentNotificationRepository> =
  {
    provide: PAYMENT_NOTIFICATION_REPOSITORY,
    inject: [DATAVERSE_ACCESS_TOKEN_PROVIDER],
    useFactory: (
      dataverseAccessTokenProvider: DataverseAccessTokenProvider,
    ) => {
      const { environmentUrl, apiVersion, paymentNotifications } =
        getAppConfig().dataverse;

      return createDataversePaymentNotificationRepository({
        baseUrl: createDataverseBaseUrl(environmentUrl, apiVersion),
        getAccessToken: () => dataverseAccessTokenProvider.getAccessToken(),
        schema: paymentNotifications.schema,
      });
    },
  };

export const paymentNotificationClockProviderDefinition: FactoryProvider<Clock> =
  {
    provide: PAYMENT_NOTIFICATION_CLOCK,
    useFactory: (): Clock => () => new Date(),
  };

export const paymentNotificationStateTransitionProviderDefinition: FactoryProvider<
  StateTransition<PaymentNotification>
> = {
  provide: PAYMENT_NOTIFICATION_STATE_TRANSITION,
  useFactory: () => createStateTransition<PaymentNotification>(),
};

export const createDraftPaymentNotificationUseCaseProviderDefinition: FactoryProvider<CreateDraftPaymentNotificationUseCase> =
  {
    provide: CREATE_DRAFT_PAYMENT_NOTIFICATION_USE_CASE,
    inject: [PAYMENT_NOTIFICATION_REPOSITORY, PAYMENT_NOTIFICATION_CLOCK],
    useFactory: (repository: PaymentNotificationRepository, clock: Clock) =>
      new CreateDraftPaymentNotificationUseCase({
        repository,
        clock,
      }),
  };

export const updatePaymentNotificationUseCaseProviderDefinition: FactoryProvider<UpdatePaymentNotificationUseCase> =
  {
    provide: UPDATE_PAYMENT_NOTIFICATION_USE_CASE,
    inject: [PAYMENT_NOTIFICATION_REPOSITORY, PAYMENT_NOTIFICATION_CLOCK],
    useFactory: (repository: PaymentNotificationRepository, clock: Clock) =>
      new UpdatePaymentNotificationUseCase({
        repository,
        clock,
      }),
  };

type TransitionUseCaseDependencies = readonly [
  PaymentNotificationRepository,
  StateTransition<PaymentNotification>,
  Clock,
];

const TRANSITION_USE_CASE_INJECTIONS = [
  PAYMENT_NOTIFICATION_REPOSITORY,
  PAYMENT_NOTIFICATION_STATE_TRANSITION,
  PAYMENT_NOTIFICATION_CLOCK,
];

function getApprovalGroupIds(
  action: 'validate' | 'reject' | 'requestChanges',
): readonly string[] {
  const approvals = getAppConfig().paymentNotifications?.approvals;

  if (!approvals) {
    throw new Error(
      'Payment Notifications approval configuration is incomplete',
    );
  }

  return approvals[action].approvalGroupIds;
}

export const submitPaymentNotificationUseCaseProviderDefinition: FactoryProvider<SubmitPaymentNotificationUseCase> =
  {
    provide: SUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
    inject: TRANSITION_USE_CASE_INJECTIONS,
    useFactory: (
      repository: TransitionUseCaseDependencies[0],
      stateTransition: TransitionUseCaseDependencies[1],
      clock: TransitionUseCaseDependencies[2],
    ) =>
      new SubmitPaymentNotificationUseCase({
        repository,
        stateTransition,
        clock,
      }),
  };

export const startReviewPaymentNotificationUseCaseProviderDefinition: FactoryProvider<StartReviewPaymentNotificationUseCase> =
  {
    provide: START_REVIEW_PAYMENT_NOTIFICATION_USE_CASE,
    inject: TRANSITION_USE_CASE_INJECTIONS,
    useFactory: (
      repository: TransitionUseCaseDependencies[0],
      stateTransition: TransitionUseCaseDependencies[1],
      clock: TransitionUseCaseDependencies[2],
    ) =>
      new StartReviewPaymentNotificationUseCase({
        repository,
        stateTransition,
        clock,
      }),
  };

export const validatePaymentNotificationUseCaseProviderDefinition: FactoryProvider<ValidatePaymentNotificationUseCase> =
  {
    provide: VALIDATE_PAYMENT_NOTIFICATION_USE_CASE,
    inject: TRANSITION_USE_CASE_INJECTIONS,
    useFactory: (
      repository: TransitionUseCaseDependencies[0],
      stateTransition: TransitionUseCaseDependencies[1],
      clock: TransitionUseCaseDependencies[2],
    ) =>
      new ValidatePaymentNotificationUseCase({
        repository,
        stateTransition,
        clock,
        approvalGroupIds: getApprovalGroupIds('validate'),
      }),
  };

export const rejectPaymentNotificationUseCaseProviderDefinition: FactoryProvider<RejectPaymentNotificationUseCase> =
  {
    provide: REJECT_PAYMENT_NOTIFICATION_USE_CASE,
    inject: TRANSITION_USE_CASE_INJECTIONS,
    useFactory: (
      repository: TransitionUseCaseDependencies[0],
      stateTransition: TransitionUseCaseDependencies[1],
      clock: TransitionUseCaseDependencies[2],
    ) =>
      new RejectPaymentNotificationUseCase({
        repository,
        stateTransition,
        clock,
        approvalGroupIds: getApprovalGroupIds('reject'),
      }),
  };

export const requestChangesPaymentNotificationUseCaseProviderDefinition: FactoryProvider<RequestChangesPaymentNotificationUseCase> =
  {
    provide: REQUEST_CHANGES_PAYMENT_NOTIFICATION_USE_CASE,
    inject: TRANSITION_USE_CASE_INJECTIONS,
    useFactory: (
      repository: TransitionUseCaseDependencies[0],
      stateTransition: TransitionUseCaseDependencies[1],
      clock: TransitionUseCaseDependencies[2],
    ) =>
      new RequestChangesPaymentNotificationUseCase({
        repository,
        stateTransition,
        clock,
        approvalGroupIds: getApprovalGroupIds('requestChanges'),
      }),
  };

export const resubmitPaymentNotificationUseCaseProviderDefinition: FactoryProvider<ResubmitPaymentNotificationUseCase> =
  {
    provide: RESUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
    inject: TRANSITION_USE_CASE_INJECTIONS,
    useFactory: (
      repository: TransitionUseCaseDependencies[0],
      stateTransition: TransitionUseCaseDependencies[1],
      clock: TransitionUseCaseDependencies[2],
    ) =>
      new ResubmitPaymentNotificationUseCase({
        repository,
        stateTransition,
        clock,
      }),
  };

// Opti ChatGPT: dependencias compartidas por los casos de uso para evitar instancias redundantes.
export const PAYMENT_NOTIFICATION_PROVIDERS: Provider[] = [
  paymentNotificationRepositoryProviderDefinition,
  paymentNotificationClockProviderDefinition,
  paymentNotificationStateTransitionProviderDefinition,
  createDraftPaymentNotificationUseCaseProviderDefinition,
  updatePaymentNotificationUseCaseProviderDefinition,
  submitPaymentNotificationUseCaseProviderDefinition,
  startReviewPaymentNotificationUseCaseProviderDefinition,
  validatePaymentNotificationUseCaseProviderDefinition,
  rejectPaymentNotificationUseCaseProviderDefinition,
  requestChangesPaymentNotificationUseCaseProviderDefinition,
  resubmitPaymentNotificationUseCaseProviderDefinition,
];
