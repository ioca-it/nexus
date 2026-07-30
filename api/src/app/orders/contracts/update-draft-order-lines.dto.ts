import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class UpdateDraftOrderLineDto {
  @IsDefined() @IsString() @IsNotEmpty() @Matches(/\S/) readonly id!: string;
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  readonly productId!: string;
  @IsDefined()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  readonly quantity!: number;
}

export class UpdateDraftOrderLinesDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDraftOrderLineDto)
  readonly lines!: readonly UpdateDraftOrderLineDto[];
}
