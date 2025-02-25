import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { PrismaClient } from '@prisma/client';
import { EnrollmentService } from './enrollment.service';
import { PrismaModule } from 'src/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentController],
  providers: [PrismaClient, EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
