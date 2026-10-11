import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { middleware } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const logger = app.get(Logger);

  middleware(app);

  app.setGlobalPrefix('/api/v1');
  // await initSwagger({
  //    app,
  //    name: 'phannd.me API Documentation',
  //    isStartEndpoint: true,
  //    extraModels: [OperationMetadataDto, PaginationMetadataDto],
  //  });

  app.enableShutdownHooks();
  const port = process.env.NODE_PORT ?? 3000;
  await app.listen(port);
  logger.log(`Server is running on port ${process.env.NODE_PORT ?? 3000}`);
}

bootstrap().catch((error) => {
  console.error('Error occurred while starting the server:', error);
});
