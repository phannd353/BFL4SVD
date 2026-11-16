import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '@/common/decorators/auth/user.decorator';
import { RATE_LIMIT } from '@/config';
import { VerifyWalletDto } from './dto';
import { AuthService } from './auth.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  @ApiOperation({ summary: 'Create a one-time wallet ownership challenge' })
  @ApiOkResponse({ description: 'Wallet signature message' })
  @Throttle(RATE_LIMIT.INTERNAL)
  async createWalletChallenge(@CurrentUser('id') userId: string) {
    return this.authService.createWalletChallenge(userId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify and link the signed wallet address' })
  @ApiOkResponse({ description: 'Updated wallet address' })
  @Throttle(RATE_LIMIT.INTERNAL)
  async verifyWallet(
    @CurrentUser('id') userId: string,
    @Body() input: VerifyWalletDto,
  ) {
    return this.authService.verifyWalletSignature(
      userId,
      input.walletAddress,
      input.signature,
    );
  }
}
