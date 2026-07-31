import { loadOrdersConfig } from './orders-config.loader';
import { validateOrdersApprovalEnvironment } from './orders-config.validator';
const environment = {
  ORDERS_REQUEST_CHANGES_APPROVAL_GROUP_IDS: ' changes,changes,review ',
  ORDERS_REJECT_APPROVAL_GROUP_IDS: 'reject',
  ORDERS_APPROVE_APPROVAL_GROUP_IDS: 'approve',
};
describe('Orders config', () => {
  it('loads and normalizes groups', () => {
    const config = loadOrdersConfig(environment);
    expect(config.approvals.requestChanges.approvalGroupIds).toEqual([
      'changes',
      'review',
    ]);
    expect(Object.isFrozen(config)).toBe(true);
  });
  it('rejects empty values', () => {
    expect(() =>
      validateOrdersApprovalEnvironment({
        ...environment,
        ORDERS_REJECT_APPROVAL_GROUP_IDS: ' , ',
      }),
    ).toThrow('ORDERS_REJECT_APPROVAL_GROUP_IDS');
  });
});
