import { All, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { ApiOkSerializedResponse, Serialize } from '@/common';
import { UserBriefResponseDto } from './dto';
import { RATE_LIMIT } from '@/config';
import { Public } from '@/common/decorators/auth/public.decorator';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('auth')
@Public() // Let Better Auth handle auth internally
export class AuthController {
  private readonly nodeHandler: ReturnType<typeof toNodeHandler>;

  constructor(private readonly authService: AuthService) {
    this.nodeHandler = toNodeHandler(this.authService.instance);
  }

  @Get('users/:id')
  @Serialize(UserBriefResponseDto)
  @ApiOkSerializedResponse(UserBriefResponseDto)
  @Throttle(RATE_LIMIT.INTERNAL)
  async getUserInfo(@Param('id') userId: string) {
    const res = await this.authService.userInfo(userId);

    return res;
  }

  // Forward specific auth routes for better rate limiting, and documentation
  @Post('sign-in/email')
  @Throttle(RATE_LIMIT.AUTH)
  async forwardSignInEmail(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('sign-in/social')
  @Throttle(RATE_LIMIT.AUTH)
  async forwardSignInSocial(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('sign-out')
  @Throttle(RATE_LIMIT.AUTH)
  async forwardSignOut(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('sign-up/email')
  @Throttle(RATE_LIMIT.AUTH)
  async forwardSignUpEmail(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('reset-password')
  @Throttle(RATE_LIMIT.AUTH)
  async forwardResetPassword(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('send-verification-email')
  @Throttle(RATE_LIMIT.AUTH)
  async forwardSendVerificationEmail(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.nodeHandler(req, res);
  }

  @Post('change-email')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardChangeEmail(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('change-password')
  @Throttle(RATE_LIMIT.AUTH)
  async forwardChangePassword(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('update-user')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardUpdateUser(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('delete-user')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardDeleteUser(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('revoke-session')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardRevokeSession(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('revoke-sessions')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardRevokeSessions(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('link-social')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardLinkSocial(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('unlink-social')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardUnlinkSocial(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('refresh-token')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardRefreshToken(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @Post('get-refresh-token')
  @Throttle(RATE_LIMIT.INTERNAL)
  async forwardGetRefreshToken(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
  }

  @All('*splat')
  @Throttle(RATE_LIMIT.INTERNAL)
  async handleAuthRequests(@Req() req: Request, @Res() res: Response) {
    await this.nodeHandler(req, res);
    return;
  }
}
