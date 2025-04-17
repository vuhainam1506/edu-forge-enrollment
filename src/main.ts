import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add global prefix
  app.setGlobalPrefix('');

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://eduforge.io.vn', "https://kong.eduforge.io.vn"],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
