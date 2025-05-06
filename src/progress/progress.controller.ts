// src/progress/progress.controller.ts
import { Controller, Get, Param, Put, Body, Logger } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  private readonly logger = new Logger(ProgressController.name);

  constructor(private readonly progressService: ProgressService) {}

  @Get('completion/:enrollmentId')
  async checkEnrollmentCompletion(
    @Param('enrollmentId') enrollmentId: string,
  ) {
    this.logger.log(`Checking completion for enrollment ${enrollmentId}`);
    return {
      completed: await this.progressService.checkEnrollmentCompletion(enrollmentId)
    };
  }

  @Get('overall/:enrollmentId')
  async getOverallProgressByEnrollment(
    @Param('enrollmentId') enrollmentId: string,
  ) {
    this.logger.log(`Getting overall progress for enrollment ${enrollmentId}`);
    return this.progressService.getOverallProgressByEnrollmentId(enrollmentId);
  }

  @Get(':enrollmentId')
  async getProgressByEnrollment(
    @Param('enrollmentId') enrollmentId: string,
  ) {
    this.logger.log(`Getting progress for enrollment ${enrollmentId}`);
    return this.progressService.getProgressByEnrollmentId(enrollmentId);
  }

  @Put(':enrollmentId')
  async updateProgressByEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Body() updateDto: {
      progress?: number;
      currentLesson?: string;
      lessonId?: string;
      isLessonCompleted?: boolean;
    }
  ) {
    this.logger.log(`Updating progress for enrollment ${enrollmentId}`);
    return this.progressService.updateProgressByEnrollmentId(enrollmentId, updateDto);
  }
}
