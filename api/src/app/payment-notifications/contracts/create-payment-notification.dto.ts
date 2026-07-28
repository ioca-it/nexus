import {
  IsArray,
  IsDefined,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

export class CreatePaymentNotificationDto {
  @IsDefined()
  @IsISO8601()
  readonly paymentDate!: string;

  @IsDefined()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  readonly amount!: number;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  readonly currency!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  readonly bankReference!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly receiptFileId?: string;

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  readonly invoiceIds!: readonly string[];
}
