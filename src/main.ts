import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000', // Allow requests from this origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const apiKey = process.env.RESEND_API_KEY; // Use environment variable for API key
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not defined');
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
