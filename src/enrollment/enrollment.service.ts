import { Injectable, ConflictException } from '@nestjs/common';
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
          status: data.isFree ? EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING,
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

}
