import { Module } from '@nestjs/common';

import { DATAVERSE_PROVIDERS } from './dataverse.providers';
import {
  AZURE_ACCESS_TOKEN_PROVIDER,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
} from './dataverse.tokens';

@Module({
  providers: DATAVERSE_PROVIDERS,
  exports: [AZURE_ACCESS_TOKEN_PROVIDER, DATAVERSE_ACCESS_TOKEN_PROVIDER],
})
export class DataverseModule {}
