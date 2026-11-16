import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
// import { MailModule, MailService } from '@auth/mail';
import { AuthController } from './auth.controller';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    // MailModule,
  ],
  controllers: [WalletController, AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
