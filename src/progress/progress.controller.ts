// src/progress/progress.controller.ts
import { Controller, Get, Param, Post, Body, Put, Logger } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  private readonly logger = new Logger(ProgressController.name);

  constructor(private readonly progressService: ProgressService) {}

  @Get(':userId/:courseId')
  async getProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    this.logger.log(`Getting progress for user ${userId} in course ${courseId}`);
    return this.progressService.getProgress(userId, courseId);
  }

  @Post()
  async createProgress(
    @Body() createProgressDto: {
      enrollmentId: string;
      lessonId: string;
      isCompleted?: boolean;
      progress?: number;
    }
  ) {
    this.logger.log(`Creating progress for enrollment ${createProgressDto.enrollmentId}`);
    return this.progressService.createProgress(createProgressDto);
  }

  @Put(':userId/:courseId')
  async updateProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
    @Body() updateProgressDto: {
      lessonId: string;
      isCompleted?: boolean;
      progress?: number;
    }
  ) {
    this.logger.log(`Updating progress for user ${userId} in course ${courseId}`);
    return this.progressService.updateProgress(userId, courseId, updateProgressDto);
  }

  @Get(':userId/:courseId/check-completion')
  async checkCourseCompletion(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    this.logger.log(`Checking course completion for user ${userId} in course ${courseId}`);
    return {
      completed: await this.progressService.checkCourseCompletion(userId, courseId)
    };
  }

  @Get(':userId/:courseId/overall')
  async getOverallProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    this.logger.log(`Getting overall progress for user ${userId} in course ${courseId}`);
    return this.progressService.getOverallProgress(userId, courseId);
  }
}