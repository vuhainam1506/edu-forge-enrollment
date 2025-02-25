import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { PrismaClient } from '@prisma/client';
import { EnrollmentController } from './enrollment/enrollment.controller';
import { EnrollmentService } from './enrollment/enrollment.service';
import { EmailService } from './email/email.service';

@Module({
  imports: [EnrollmentModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, PrismaClient, EmailService],
})
export class AppModule {}
