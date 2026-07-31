export interface OrderActionApprovalConfig {
  readonly approvalGroupIds: readonly string[];
}
export interface OrdersApprovalConfig {
  readonly requestChanges: OrderActionApprovalConfig;
  readonly reject: OrderActionApprovalConfig;
  readonly approve: OrderActionApprovalConfig;
}
export interface OrdersConfig {
  readonly approvals: OrdersApprovalConfig;
}
