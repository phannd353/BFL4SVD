import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEthereumAddress, IsOptional } from 'class-validator';

export class RegisterClientDto {
  @ApiPropertyOptional({
    description: 'Optional Ethereum-compatible wallet address for traceability',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  @IsOptional()
  @IsEthereumAddress()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  walletAddress?: string;
}
