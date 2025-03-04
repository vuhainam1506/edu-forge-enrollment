import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { PrismaClient } from '@prisma/client';
import { EnrollmentService } from './enrollment.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, HttpModule, ConfigModule],
  controllers: [EnrollmentController],
  providers: [PrismaClient, EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
