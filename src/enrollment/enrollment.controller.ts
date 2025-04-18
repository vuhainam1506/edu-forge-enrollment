// src/enrollment/enrollment.controller.ts
import { 
    Controller, 
    Post, 
    Body, 
    Get, 
    Query, 
    Param, 
    Put,
    Logger,
    HttpCode,
    HttpStatus,
    Header,
    Headers
  } from '@nestjs/common';
  import { EnrollmentService } from './enrollment.service';
  import { EnrollmentStatus } from '@prisma/client';
  
  @Controller('api/v1')
  export class EnrollmentController {
    private readonly logger = new Logger(EnrollmentController.name);
  
    constructor(private readonly enrollmentService: EnrollmentService) {}
  
    @Post('webhook/new-lesson')
    @HttpCode(HttpStatus.OK)
    async handleNewLesson(
      @Body() data: { courseId: string; lessonData: any },
    ) {
      this.logger.log(`Received new lesson webhook for course ${data.courseId}`);
      return this.enrollmentService.updateEnrollmentForNewLesson(
        data.courseId,
        data.lessonData,
      );
    }
  
    @Post('webhook/payment')
    @HttpCode(HttpStatus.OK)
    async handlePaymentWebhook(
      @Body() data: {
        serviceId: string;
        serviceType: string;
        status: string;
        paymentId: string;
      },
    ) {
      this.logger.log(`Received payment webhook for ${data.serviceType} ${data.serviceId} with status ${data.status}`);
      return this.enrollmentService.handlePaymentWebhook(data);
    }
  
    @Get()
    async findAll(
      @Headers('X-User-Id') userId?: string,
      @Query('status') status?: EnrollmentStatus,
    ) {
      this.logger.log(`Getting all enrollments with filters: userId=${userId}, status=${status}`);
      return this.enrollmentService.findAll({ userId, status });
    }
  
    @Get(':id')
    async findOne(
      @Param('id') id: string,
      @Headers('X-User-Id') userId?: string,
    ) {
      this.logger.log(`Getting enrollment with ID ${id}`);
      return this.enrollmentService.findOneByEnrollmentID(id);
    }
  
    @Put(':id/status')
    async updateStatus(
      @Param('id') id: string,
      @Body('status') status: EnrollmentStatus,
      @Headers('X-User-Id') userId?: string,
    ) {
      this.logger.log(`Updating enrollment ${id} status to ${status}`);
      return this.enrollmentService.updateStatus(id, status);
    }
  
    @Get('user/:userId/courses')
    async getUserEnrollments(
      @Param('userId') userId: string,
      @Headers('X-User-Id') requestUserId?: string,
    ) {
      this.logger.log(`Getting enrollments for user ${userId}`);
      return this.enrollmentService.findByUserId(userId);
    }
  
    @Get('check/:userId/:courseId')
    async checkEnrollment(
      @Param('userId') userId: string,
      @Param('courseId') courseId: string,
      @Headers('X-User-Id') requestUserId?: string,
    ) {
      this.logger.log(`Checking enrollment for user ${userId} in course ${courseId}`);
      return {
        enrolled: await this.enrollmentService.checkEnrollment(userId, courseId)
      };
    }
  
    @Post(':id/certificate')
    async createCertificate(
      @Param('id') id: string,
      @Body('certificateUrl') certificateUrl: string,
      @Headers('X-User-Id') userId?: string,
    ) {
      this.logger.log(`Creating certificate for enrollment ${id}`);
      return this.enrollmentService.createCertificate(id, certificateUrl);
    }
  }
