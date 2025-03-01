import { Controller, Post, Body, Get, Query, Param, Put } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentStatus } from '@prisma/client';

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('webhook/new-lesson')
  async handleNewLesson(
    @Body() data: { courseId: string; lessonData: any },
  ) {
    return this.enrollmentService.updateEnrollmentForNewLesson(
      data.courseId,
      data.lessonData,
    );
  }

  @Post()
  async create(
    @Body() data: { courseId: string; userId: string; isFree?: boolean },
  ) {
    return this.enrollmentService.create(data);
  }

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentService.findAll({ userId, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.enrollmentService.findOneByEnrollmentID(id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: EnrollmentStatus,
  ) {
    return this.enrollmentService.updateStatus(id, status);
  }

  @Get('user/:userId/courses')
  async getUserEnrollments(@Param('userId') userId: string) {
    return this.enrollmentService.findByUserId(userId);
  }

  @Get('check/:userId/:courseId')
  async checkEnrollment(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.enrollmentService.checkEnrollment(userId, courseId);
  }
}
