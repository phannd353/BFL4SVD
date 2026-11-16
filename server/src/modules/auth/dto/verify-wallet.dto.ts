import { IsEthereumAddress, IsString } from 'class-validator';

export class VerifyWalletDto {
  @IsEthereumAddress()
  walletAddress!: string;

  @IsString()
  signature!: string;
}
