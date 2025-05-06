import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PrismaClient } from '@prisma/client';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, , HttpModule, ConfigModule],
  controllers: [ProgressController],
  providers: [PrismaClient, ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
