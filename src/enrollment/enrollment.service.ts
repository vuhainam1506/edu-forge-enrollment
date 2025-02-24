import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Enrollment, EnrollmentStatus } from '@prisma/client';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaClient) {}

  // Tạo enrollment mới
  async create(data: {
    courseId: string;
    userId: string;
    isFree?: boolean;
  }): Promise<Enrollment> {
    try {
      return await this.prisma.enrollment.create({
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

  // Kiểm tra enrollment
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
}
