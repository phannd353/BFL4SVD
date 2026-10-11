import type { INestApplication } from '@nestjs/common';
import compression from 'compression';
// import session from 'express-session';
import helmet from 'helmet';
// import { doubleCsrf } from 'csrf-csrf';
import { json } from 'body-parser';
import { NextFunction, Request, Response } from 'express';

export function middleware(app: INestApplication): INestApplication {
  const isProduction = process.env.NODE_ENV === 'production';

  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip JSON body parsing for raw body required routes
    if (['/api/v1/auth'].some((path) => req.path.startsWith(path))) {
      next();
    } else {
      json()(req, res, next);
    }
  });

  app.use(compression());
  // app.use(
  //   session({
  //     // Requires 'store' setup for production
  //     secret: 'tEsTeD',
  //     resave: false,
  //     saveUninitialized: true,
  //     cookie: { secure: isProduction },
  //   }),
  // );
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction ? undefined : false,
    }),
  );

  // // Configure CSRF protection
  // const {
  //   invalidCsrfTokenError, // This is just for convenience if you plan on making your own middleware.
  //   generateCsrfToken, // Use this in your routes to provide a CSRF token
  //   validateRequest, // Also a convenience if you plan on making your own middleware.
  //   doubleCsrfProtection, // This is the default CSRF protection middleware.
  // } = doubleCsrf({
  //   getSecret: () =>
  //     process.env.CSRF_SECRET || 'your-csrf-secret-key-change-in-production', // A function that optionally takes the request and returns a secret
  //   getSessionIdentifier: (req) =>
  //     (req.headers['x-session-id'] as string) || (req as any).sessionID || '', // A function to get session identifier
  //   cookieName: '__Host-psifi.x-csrf-token', // The name of the cookie to be used, recommend using Host prefix
  //   cookieOptions: {
  //     sameSite: 'lax', // Recommend you make this strict if possible
  //     path: '/',
  //     secure: isProduction, // Only send cookie over HTTPS in production
  //     httpOnly: true, // Prevent client-side access to the cookie
  //   },
  //   size: 64, // The size of the generated token
  //   ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Methods to ignore
  //   getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string, // A function that returns the token from the request
  // });

  // app.use((req: any, res:any, next:any) => {
  //   // Expose the generateCsrfToken function to requests
  //   validateRequest(req)
  //   next();
  // })
  // // Apply CSRF protection middleware
  // app.use(doubleCsrfProtection);

  // Enable CORS
  app.enableCors({
    origin: function (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || process.env.ALLOWED_ORIGINS?.split(',').includes(origin)) {
        callback(null, true);
      } else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-client-id',
      'x-refresh-token',
      'x-csrf-token',
      'x-session-id',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  return app;
}
