export interface ActionApprovalConfig {
  readonly approvalGroupIds: readonly string[];
}

export interface PaymentNotificationApprovalConfig {
  readonly validate: ActionApprovalConfig;
  readonly reject: ActionApprovalConfig;
  readonly requestChanges: ActionApprovalConfig;
}

export interface PaymentNotificationsConfig {
  readonly approvals: PaymentNotificationApprovalConfig;
}
