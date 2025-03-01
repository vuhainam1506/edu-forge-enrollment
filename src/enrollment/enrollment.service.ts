import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, Enrollment, EnrollmentStatus } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaClient, private mailerService: MailerService) {}

  // Tạo enrollment mới
  async create(data: {
    courseId: string;
    userId: string;
    isFree?: boolean;
  }): Promise<Enrollment> {
    try {
      const enrollment = await this.prisma.enrollment.create({
        data: {
          courseId: data.courseId,
          userId: data.userId,
          isFree: data.isFree || false,
          status: data.isFree
            ? EnrollmentStatus.ACTIVE
            : EnrollmentStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      // Send enrollment email
      await this.sendEnrollmentEmail(data.userId, data.courseId);

      return enrollment;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('User is already enrolled in this course');
      }
      throw error;
    }
  }

  // Lấy enrollments theo user id (tất cả các khóa học mà user đã đăng ký)
  async findByUserId(userId: string): Promise<Enrollment[]> {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        Payment: true,
      },
    });
  }

  // Lấy chi tiết một enrollment (theo id của enrollment)
  async findOneByEnrollmentID(id: string): Promise<Enrollment> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  // Cập nhật trạng thái enrollment
  async updateStatus(
    id: string,
    status: EnrollmentStatus,
  ): Promise<Enrollment> {
    const enrollment = await this.findOneByEnrollmentID(id);

    return this.prisma.enrollment.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === EnrollmentStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      },
    });
  }

  // Kiểm tra xem user đã đăng ký khóa học chưa
  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
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
  }): Promise<Enrollment[]> {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.enrollment.findMany({
      where,
      include: {
        Payment: true,
      },
    });
  }

  // Gửi email khi user đăng ký khóa học
  async sendEnrollmentEmail(userId: string, courseId: string): Promise<void> {
    // const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // const course = await this.prisma.course.findUnique({ where: { id: courseId } });

    // if (!user || !course) {
    //   throw new NotFoundException('User or Course not found');
    // }

    await this.mailerService.sendMail({
      to: 'vuhainam1506@gmail.com', // list of receivers
      from: 'noreply@nestjs.com', // sender address
      subject: 'Đăng ký khóa học thành công', // Subject line
      template: 'enrollment',
      context: {
        name: "user",
        courseId: courseId,
        userId: userId
      }
    });
  }

  // Thêm method mới để cập nhật enrollment khi có bài học mới
  async updateEnrollmentForNewLesson(courseId: string, lessonData: any) {
    // Tìm tất cả enrollment active của khóa học
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    // Cập nhật progress cho mỗi enrollment
    for (const enrollment of enrollments) {
      // Cập nhật progress cho bài học mới
      await this.prisma.userProgress.updateMany({
        where: {
          enrollmentId: enrollment.id,
        },
        data: {
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
  }

  // Gửi email thông báo bài học mới
  private async sendNewLessonNotification(
    userId: string,
    userName: string,
    courseName: string,
    lessonData: any,
  ) {
    await this.mailerService.sendMail({
      to: 'user@example.com', // Thay bằng email thật từ user service
      subject: 'Bài học mới đã được thêm vào khóa học của bạn',
      template: 'new-lesson',
      context: {
        name: userName,
        courseName: courseName,
        lessonTitle: lessonData.title,
        lessonDescription: lessonData.description,
      },
    });
  }
}
