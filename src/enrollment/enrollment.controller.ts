/**
 * Enrollment Controller
 * 
 * Quản lý các API endpoints liên quan đến việc đăng ký khóa học.
 * Controller này xử lý các yêu cầu liên quan đến việc tạo, truy vấn, 
 * cập nhật trạng thái đăng ký và quản lý chứng chỉ.
 */
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
  Headers
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentStatus } from '@prisma/client';

@Controller('enrollment')
export class EnrollmentController {
  private readonly logger = new Logger(EnrollmentController.name);

  constructor(private readonly enrollmentService: EnrollmentService) {}

  /**
   * Xử lý webhook khi có bài học mới được thêm vào khóa học
   * 
   * @param data - Dữ liệu về khóa học và bài học mới
   * @returns Kết quả cập nhật enrollment cho bài học mới
   */
  @Post('webhook/new-lesson')
  @HttpCode(HttpStatus.OK)
  async handleNewLesson(
    @Body() data: { courseId: string; lessonData: any },
  ) {
    this.logger.log(`Received new lesson webhook for course ${data.courseId}`);
    return this.enrollmentService.addNewLessonToAllEnrollments(data.lessonData);
  }

  /**
   * Xử lý webhook từ payment service khi có cập nhật về thanh toán
   * 
   * @param data - Dữ liệu thanh toán từ payment service
   * @returns Kết quả xử lý webhook thanh toán
   */
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
    return this.enrollmentService.processPaymentUpdate(data);
  }

  /**
   * Lấy danh sách tất cả các enrollment với bộ lọc tùy chọn
   * 
   * @param userId - ID của người dùng (từ header)
   * @param status - Trạng thái enrollment cần lọc
   * @returns Danh sách các enrollment thỏa mãn điều kiện lọc
   */
  @Get()
  async findAll(
    @Headers('X-User-Id') userId?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    this.logger.log(`Getting all enrollments with filters: userId=${userId}, status=${status}`);
    return this.enrollmentService.findAll({ userId, status });
  }

  /**
   * Lấy thông tin chi tiết của một enrollment theo ID
   * 
   * @param id - ID của enrollment cần lấy thông tin
   * @param userId - ID của người dùng (từ header)
   * @returns Thông tin chi tiết của enrollment
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('X-User-Id') userId?: string,
  ) {
    this.logger.log(`Getting enrollment with ID ${id}`);
    return this.enrollmentService.findOneByEnrollmentID(id);
  }

  /**
   * Cập nhật trạng thái của một enrollment
   * 
   * @param id - ID của enrollment cần cập nhật
   * @param status - Trạng thái mới của enrollment
   * @param userId - ID của người dùng (từ header)
   * @returns Enrollment đã được cập nhật
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: EnrollmentStatus,
    @Headers('X-User-Id') userId?: string,
  ) {
    this.logger.log(`Updating enrollment ${id} status to ${status}`);
    return this.enrollmentService.updateStatus(id, status);
  }

  /**
   * Lấy danh sách các khóa học mà một người dùng đã đăng ký
   * 
   * @param userId - ID của người dùng cần lấy danh sách khóa học
   * @param requestUserId - ID của người dùng thực hiện request (từ header)
   * @returns Danh sách các enrollment của người dùng
   */
  @Get('user/:userId/courses')
  async getUserEnrollments(
    @Param('userId') userId: string,
    @Headers('X-User-Id') requestUserId?: string,
  ) {
    this.logger.log(`Getting enrollments for user ${userId}`);
    return this.enrollmentService.findByUserId(userId);
  }

  /**
   * Kiểm tra xem một người dùng đã đăng ký một khóa học cụ thể chưa
   * 
   * @param userId - ID của người dùng cần kiểm tra
   * @param courseId - ID của khóa học cần kiểm tra
   * @param requestUserId - ID của người dùng thực hiện request (từ header)
   * @returns Đối tượng chứa kết quả kiểm tra (enrolled: true/false)
   */
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

  /**
   * Tạo chứng chỉ cho một enrollment
   * 
   * @param id - ID của enrollment cần tạo chứng chỉ
   * @param certificateUrl - URL của chứng chỉ
   * @param userId - ID của người dùng thực hiện request (từ header)
   * @returns Chứng chỉ đã được tạo
   */
  @Post(':id/certificate')
  async createCertificate(
    @Param('id') id: string,
    @Body('certificateUrl') certificateUrl: string,
    @Headers('X-User-Id') userId?: string,
  ) {
    this.logger.log(`Creating certificate for enrollment ${id}`);
    return this.enrollmentService.createCertificate(id, certificateUrl);
  }

  /**
   * Tạo enrollment mới cho một người dùng và khóa học
   * 
   * @param data - Dữ liệu để tạo enrollment mới
   * @param requestUserId - ID của người dùng thực hiện request (từ header)
   * @returns Enrollment đã được tạo
   */
  @Post('')
  async createEnrollment(
    @Body() data: {
      courseId: string;
      userId: string;
      userName?: string;
      courseName?: string;
      isFree?: boolean;
      lessonId?: string;
      lessonTitle?: string;
    },
    @Headers('X-User-Id') requestUserId?: string,
  ) {
    this.logger.log(`Creating enrollment for user ${data.userId} in course ${data.courseId}`);
    return this.enrollmentService.create({
      courseId: data.courseId,
      userId: data.userId,
      userName: data.userName,
      courseName: data.courseName,
      isFree: data.isFree,
      lessonId: data.lessonId,
      lessonTitle: data.lessonTitle,
    });
  }

  /**
   * Lấy thông tin enrollment theo userId và courseId
   * 
   * @param courseId - ID của khóa học (từ path parameter)
   * @param userId - ID của người dùng (từ header)
   * @returns Thông tin chi tiết của enrollment
   */
  @Get('find/:courseId')
  async findByUserAndCourse(
    @Param('courseId') courseId: string,
    @Headers('X-User-Id') userId: string,
  ) {
    this.logger.log(`Getting enrollment for user ${userId} in course ${courseId}`);
    return this.enrollmentService.findByUserAndCourse(userId, courseId);
  }
  }
