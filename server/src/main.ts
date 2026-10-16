import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService, middleware } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const logger = app.get(Logger);
  const configService: ConfigService = app.get(ConfigService);

  middleware(app);

  app.setGlobalPrefix('/api/v1');
  // await initSwagger({
  //    app,
  //    name: 'phannd.me API Documentation',
  //    isStartEndpoint: true,
  //    extraModels: [OperationMetadataDto, PaginationMetadataDto],
  //  });

  app.enableShutdownHooks();
  const port = configService.get('port') || 3000;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`);
}

bootstrap().catch((error) => {
  console.error('Error occurred while starting the server:', error);
});
