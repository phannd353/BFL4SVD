import { Config } from '@/config';
import { AuthService } from '@/modules/auth/auth.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@/common';
import { roles } from '@/lib/permissions';
import { sign } from 'jsonwebtoken';
import { createHmac } from 'node:crypto';

@Injectable()
export class AuthHelper {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Config>,
  ) {}

  async registerUser(credentials: {
    email: string;
    password: string;
    role: keyof typeof roles;
  }) {
    return this.authService.api.createUser({
      body: {
        name: 'Test User',
        email: credentials.email,
        password: credentials.password,
        role: credentials.role,
      },
    });
  }

  async getAuthHeaders(credentials: { email: string; password: string }) {
    return this.authService.api
      .signInEmail({
        body: {
          email: credentials.email,
          password: credentials.password,
        },
      })
      .then(async (res) => {
        const sessionToken = [
          res.token,
          createHmac('sha256', this.configService.get('betterAuth.secret'))
            .update(res.token)
            .digest('base64')
            .toString(),
        ].join('.');
        const session = await this.authService.api.getSession({
          headers: {
            cookie: `phannd-auth.session_token=${sessionToken}`,
          },
        });
        if (!session) {
          throw new Error('Session not found');
        }

        const sessionData = sign(
          session,
          this.configService.get('betterAuth.secret'),
          {
            algorithm: 'HS256',
            expiresIn: '1h',
          },
        );

        return {
          cookie: `phannd-auth.session_data=${sessionData}; phannd-auth.session_token=${sessionToken}`,
        };
      });
  }
}
