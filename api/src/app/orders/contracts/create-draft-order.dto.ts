import { IsDefined, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateDraftOrderDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  readonly currencyCode!: string;
}
