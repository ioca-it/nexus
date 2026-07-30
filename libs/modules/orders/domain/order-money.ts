const ORDER_AMOUNT_DECIMAL_PLACES = 2;
const ORDER_AMOUNT_SCALE = 10 ** ORDER_AMOUNT_DECIMAL_PLACES;

export function roundOrderAmount(value: number, fieldName: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite amount`);
  }

  return (
    Math.round((value + Number.EPSILON) * ORDER_AMOUNT_SCALE) /
    ORDER_AMOUNT_SCALE
  );
}
