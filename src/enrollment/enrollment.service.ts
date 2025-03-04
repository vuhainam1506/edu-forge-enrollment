// src/enrollment/enrollment.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaClient, EnrollmentStatus } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private prisma: PrismaClient, 
    private mailerService: MailerService,
    private httpService: HttpService,
    private configService: ConfigService
  ) {}

  // Tạo enrollment mới
  async create(data: {
    courseId: string;
    userId: string;
    isFree?: boolean;
    courseName?: string;
    userName?: string;
  }) {
    try {
      const enrollment = await this.prisma.enrollment.create({
        data: {
          courseId: data.courseId,
          userId: data.userId,
          isFree: data.isFree || false,
          status: data.isFree ? EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING,
          updatedAt: new Date(),
          courseName: data.courseName,
          userName: data.userName,
        },
      });

      // Nếu không phải khóa học miễn phí, tạo payment thông qua Payment Service
      if (!data.isFree) {
        try {
          // Gọi đến Payment Service để tạo payment
          const paymentServiceUrl = this.configService.get<string>('PAYMENT_SERVICE_URL');
          const response = await firstValueFrom(
            this.httpService.post(`${paymentServiceUrl}/payments`, {
              serviceId: enrollment.id,
              serviceType: 'COURSE_ENROLLMENT',
              amount: 0, // Giá trị này sẽ được lấy từ Course Service
              description: `Thanh toán khóa học: ${data.courseName || data.courseId}`,
              returnUrl: `${this.configService.get<string>('APP_URL')}/courses/${data.courseId}/payment-success`,
              cancelUrl: `${this.configService.get<string>('APP_URL')}/courses/${data.courseId}/payment-cancel`,
            })
          );
          
          // Cập nhật paymentId vào enrollment
          await this.prisma.enrollment.update({
            where: { id: enrollment.id },
            data: {
              paymentId: response.data.id,
              updatedAt: new Date(),
            },
          });

          this.logger.log(`Created payment for enrollment ${enrollment.id}: ${response.data.id}`);
        } catch (error) {
          this.logger.error(`Failed to create payment for enrollment ${enrollment.id}`, error.stack);
          // Không throw error ở đây, vẫn trả về enrollment
        }
      }

      // Send enrollment email
      await this.sendEnrollmentEmail(data.userId, data.courseId);

      return enrollment;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User is already enrolled in this course');
      }
      this.logger.error(`Failed to create enrollment`, error.stack);
      throw error;
    }
  }

  // Lấy enrollments theo user id (tất cả các khóa học mà user đã đăng ký)
  async findByUserId(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId: userId },
      include: {
        Certificate: true,
      },
    });
  }

  // Lấy chi tiết một enrollment (theo id của enrollment)
  async findOneByEnrollmentID(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        Certificate: true,
        UserProgress: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  // Cập nhật trạng thái enrollment
  async updateStatus(id: string, status: EnrollmentStatus) {
    const enrollment = await this.findOneByEnrollmentID(id);

    return this.prisma.enrollment.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === EnrollmentStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });
  }

  // Kiểm tra xem user đã đăng ký khóa học chưa
  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
        status: {
          in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
        },
      },
    });
    return !!enrollment;
  }

  async findAll(filters?: {
    userId?: string;
    status?: EnrollmentStatus;
  }) {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.enrollment.findMany({
      where,
      include: {
        Certificate: true,
      },
    });
  }

  // Gửi email khi user đăng ký khóa học
  async sendEnrollmentEmail(userId: string, courseId: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: this.configService.get<string>('ENROLLMENT_MAILER_USER'), // Thay bằng email thật từ user service
        from: this.configService.get<string>('MAIL_FROM'),
        subject: 'Đăng ký khóa học thành công',
        template: 'enrollment',
        context: {
          name: "user",
          courseId: courseId,
          userId: userId
        }
      });
      this.logger.log(`Sent enrollment email to user ${userId} for course ${courseId}`);
    } catch (error) {
      this.logger.error(`Failed to send enrollment email`, error.stack);
      // Không throw error ở đây, vẫn tiếp tục flow
    }
  }

  // Thêm method mới để cập nhật enrollment khi có bài học mới
  async updateEnrollmentForNewLesson(courseId: string, lessonData: any) {
    // Tìm tất cả enrollment active của khóa học
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId: courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    this.logger.log(`Found ${enrollments.length} active enrollments for course ${courseId}`);

    // Cập nhật progress cho mỗi enrollment
    for (const enrollment of enrollments) {
      // Cập nhật progress cho bài học mới
      await this.prisma.userProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: lessonData.id,
          isCompleted: false,
          progress: 0,
          updatedAt: new Date(),
        },
      });

      // Gửi email thông báo cho user
      await this.sendNewLessonNotification(
        enrollment.userId,
        enrollment.userName,
        enrollment.courseName,
        lessonData,
      );
    }

    return { success: true, affectedEnrollments: enrollments.length };
  }

  // Gửi email thông báo bài học mới
  private async sendNewLessonNotification(
    userId: string,
    userName: string,
    courseName: string,
    lessonData: any,
  ) {
    try {
      await this.mailerService.sendMail({
        to: this.configService.get<string>('ENROLLMENT_MAILER_USER'), // Thay bằng email thật từ user service
        from: this.configService.get<string>('MAIL_FROM'),
        subject: 'Bài học mới đã được thêm vào khóa học của bạn',
        template: 'new-lesson',
        context: {
          name: userName || 'Học viên',
          courseName: courseName || 'Khóa học của bạn',
          lessonTitle: lessonData.title || 'Bài học mới',
          lessonDescription: lessonData.description || 'Nội dung bài học mới',
        },
      });
      this.logger.log(`Sent new lesson notification to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send new lesson notification`, error.stack);
      // Không throw error ở đây, vẫn tiếp tục flow
    }
  }

  // Xử lý webhook từ Payment Service
  async handlePaymentWebhook(data: {
    serviceId: string;
    serviceType: string;
    status: string;
    paymentId: string;
  }) {
    // Chỉ xử lý webhook cho COURSE_ENROLLMENT
    if (data.serviceType !== 'COURSE_ENROLLMENT') {
      this.logger.warn(`Received webhook for unsupported service type: ${data.serviceType}`);
      throw new NotFoundException(`Service type ${data.serviceType} not supported`);
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: data.serviceId },
    });

    if (!enrollment) {
      this.logger.warn(`Received webhook for non-existent enrollment: ${data.serviceId}`);
      throw new NotFoundException(`Enrollment with ID ${data.serviceId} not found`);
    }

    // Cập nhật trạng thái enrollment dựa trên trạng thái payment
    let enrollmentStatus;
    switch (data.status) {
      case 'COMPLETED':
        enrollmentStatus = EnrollmentStatus.ACTIVE;
        break;
      case 'FAILED':
      case 'EXPIRED':
      case 'CANCELLED':
        enrollmentStatus = EnrollmentStatus.CANCELLED;
        break;
      default:
        enrollmentStatus = enrollment.status; // Giữ nguyên trạng thái
    }

    this.logger.log(`Updating enrollment ${enrollment.id} status to ${enrollmentStatus} based on payment ${data.paymentId} status ${data.status}`);

    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: enrollmentStatus,
        paymentId: data.paymentId,
        updatedAt: new Date(),
      },
    });
  }

  // Tạo certificate cho enrollment
  async createCertificate(enrollmentId: string, certificateUrl: string) {
    const enrollment = await this.findOneByEnrollmentID(enrollmentId);

    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new ConflictException('Cannot create certificate for incomplete enrollment');
    }

    // Kiểm tra xem đã có certificate chưa
    const existingCertificate = await this.prisma.certificate.findFirst({
      where: { enrollmentId: enrollmentId },
    });

    if (existingCertificate) {
      return this.prisma.certificate.update({
        where: { id: existingCertificate.id },
        data: {
          certificateUrl: certificateUrl,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.certificate.create({
      data: {
        enrollmentId: enrollmentId,
        certificateUrl: certificateUrl,
        issuedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}