import { Controller, Get, Param, Post, Body, Put } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get(':userId/:courseId')
  async getProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.progressService.getProgress(userId, courseId);
  }

  @Post()
  async createProgress(@Body() createProgressDto: any) {
    return this.progressService.createProgress(createProgressDto);
  }

  @Put(':userId/:courseId')
  async updateProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
    @Body() updateProgressDto: any,
  ) {
    return this.progressService.updateProgress(userId, courseId, updateProgressDto);
  }
}
