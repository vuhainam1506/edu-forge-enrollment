import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentStatus } from '@prisma/client';

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

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
}
