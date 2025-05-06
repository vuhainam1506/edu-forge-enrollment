import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Thêm global prefix
  app.setGlobalPrefix('api/v1');
  
  // Enable CORS
  app.enableCors({
    origin: ['*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    credentials: true,
  });
  
  // Đã bỏ dòng app.useGlobalPipes(new ValidationPipe());
  
  await app.listen(process.env.PORT ?? 3003);
}
bootstrap();
