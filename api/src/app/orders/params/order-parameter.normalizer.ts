import { BadRequestException } from '@nestjs/common';

function normalize(value: string, label: string): string {
  if (typeof value !== 'string' || value.trim() === '')
    throw new BadRequestException(`Invalid ${label}`);
  return value.trim();
}
export const normalizeOrderId = (value: string): string =>
  normalize(value, 'order id');
export const normalizeOrderLineId = (value: string): string =>
  normalize(value, 'order line id');
export const normalizeOrderProductId = (value: string): string =>
  normalize(value, 'product id');
