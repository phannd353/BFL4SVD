import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { DocumentBuilder, SwaggerModule, } from '@nestjs/swagger';
import { isErrorResult, merge } from 'openapi-merge'

import { INestApplication } from '@nestjs/common';
import * as AuthDto from '../dto';
import { AuthService } from '@/modules/auth/auth.service';

export async function initSwagger({
  app,
  name,
  isStartEndpoint = false,
  extraModels = [],
}: {
  app: INestApplication;
  name: string;
  isStartEndpoint?: boolean;
  extraModels?: any[];
}) {
  const auth = app.get(AuthService);


  const config = new DocumentBuilder()
    .setTitle(`PhanND - ${name} API`)
    .setDescription(`The ${name} API description`)
    .setVersion('1.0')
    .setOpenAPIVersion('3.1.1')
    .build();

  const appDocument = SwaggerModule.createDocument(app, config, {
    extraModels: [Object.values(AuthDto), extraModels].flat(),
  });

  // Generate Better Auth OpenAPI schema (contains all auth routes)
  const authDocument = await auth.api.generateOpenAPISchema();
  for (const path in authDocument.paths) {
    for (const method in authDocument.paths[path]) {
      const op = authDocument.paths[path][method];
      // rename operationId
      op.operationId = `${method}_${path.replace(/\W+/g, '_')}`;
    }
  }

  const mergedResult = merge([{ oas: appDocument as any }, { oas: authDocument as any }]);

  if (isErrorResult(mergedResult)) {
    // Oops, something went wrong
    throw new Error(`OpenAPI merge error: ${mergedResult.message} (${mergedResult.type})`);
  }

  // Save OpenAPI JSON into monorepo
  if (existsSync('api/openapi') === false) {
    // Create the directory if it does not exist
    mkdirSync('api/openapi', { recursive: true });
  }
  const mergedDocument = mergedResult.output as any;
  writeFileSync(
    `api/openapi/${name.split(' ').join('-').toLowerCase()}.json`,
    JSON.stringify(mergedDocument, null, 2),
  );


  if (isStartEndpoint) {
    // Setup Swagger endpoint
    SwaggerModule.setup('api', app, mergedDocument);
  }
}
