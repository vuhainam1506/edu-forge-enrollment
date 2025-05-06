import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private prisma: PrismaService) {}

  // Lấy tiến trình học theo enrollment ID
  async getProgressByEnrollmentId(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        UserProgress: true,
      },
    });

    if (!enrollment) {
      this.logger.warn(`Enrollment not found with ID ${enrollmentId}`);
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    return {
      enrollmentId: enrollment.id,
      progress: enrollment.progress || 0,
      currentLesson: enrollment.currentLesson,
      lessonId: enrollment.UserProgress?.lessonId,
      isLessonCompleted: enrollment.UserProgress?.isCompleted || false,
      lastUpdated: enrollment.updatedAt
    };
  }

  // Lấy tiến trình học của một user trong một khóa học
  async getProgress(userId: string, courseId: string) {
    // Tìm enrollment trước
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
      },
      include: {
        UserProgress: true,
      },
    });

    if (!enrollment) {
      this.logger.warn(`Enrollment not found for user ${userId} in course ${courseId}`);
      throw new NotFoundException(`Enrollment for user ${userId} in course ${courseId} not found`);
    }

    return {
      enrollmentId: enrollment.id,
      progress: enrollment.progress || 0,
      currentLesson: enrollment.currentLesson,
      lessonId: enrollment.UserProgress?.lessonId,
      isLessonCompleted: enrollment.UserProgress?.isCompleted || false,
      lastUpdated: enrollment.updatedAt
    };
  }

  // Cập nhật tiến trình học theo enrollment ID
  async updateProgressByEnrollmentId(
    enrollmentId: string,
    updateDto: {
      progress?: number;
      currentLesson?: string;
      lessonId?: string;
      isLessonCompleted?: boolean;
    }
  ) {
    // Tìm enrollment trước để có thông tin cũ
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        UserProgress: true,
      },
    });

    if (!enrollment) {
      this.logger.warn(`Enrollment not found with ID ${enrollmentId}`);
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    // Cập nhật Enrollment
    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress: updateDto.progress !== undefined ? updateDto.progress : enrollment.progress,
        currentLesson: updateDto.currentLesson || enrollment.currentLesson,
        updatedAt: new Date(),
      },
      include: {
        UserProgress: true,
      },
    });

    // Cập nhật hoặc tạo UserProgress nếu cần
    if (updateDto.lessonId || updateDto.isLessonCompleted !== undefined) {
      if (updatedEnrollment.UserProgress) {
        await this.prisma.userProgress.update({
          where: { enrollmentId: enrollmentId },
          data: {
            lessonId: updateDto.lessonId || updatedEnrollment.UserProgress.lessonId,
            isCompleted: updateDto.isLessonCompleted !== undefined ? updateDto.isLessonCompleted : updatedEnrollment.UserProgress.isCompleted,
            progress: updateDto.progress || updatedEnrollment.UserProgress.progress,
          },
        });
      } else if (updateDto.lessonId) {
        await this.prisma.userProgress.create({
          data: {
            enrollmentId: enrollmentId,
            lessonId: updateDto.lessonId,
            isCompleted: updateDto.isLessonCompleted || false,
            progress: updateDto.progress || 0,
          },
        });
      }
    }

    // Lấy enrollment đã cập nhật với UserProgress
    return this.getProgressByEnrollmentId(enrollmentId);
  }

  // Cập nhật tiến trình học theo user ID và course ID
  async updateProgress(
    userId: string, 
    courseId: string, 
    updateDto: {
      progress?: number;
      currentLesson?: string;
      lessonId?: string;
      isLessonCompleted?: boolean;
    }
  ) {
    // Tìm enrollment trước
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });

    if (!enrollment) {
      this.logger.warn(`Enrollment not found for user ${userId} in course ${courseId}`);
      throw new NotFoundException(`Enrollment for user ${userId} in course ${courseId} not found`);
    }

    // Sử dụng hàm cập nhật theo enrollment ID
    return this.updateProgressByEnrollmentId(enrollment.id, updateDto);
  }

  // Kiểm tra trạng thái hoàn thành khóa học
  async checkCourseCompletion(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });
    
    if (!enrollment) {
      throw new NotFoundException(`Enrollment for user ${userId} in course ${courseId} not found`);
    }
    
    return enrollment.progress >= 100;
  }

  // Kiểm tra trạng thái hoàn thành theo enrollment ID
  async checkEnrollmentCompletion(enrollmentId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }
    
    return enrollment.progress >= 100;
  }

  // Lấy tổng tiến trình của một khóa học
  async getOverallProgress(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });
    
    if (!enrollment) {
      throw new NotFoundException(`Enrollment for user ${userId} in course ${courseId} not found`);
    }
    
    return {
      overallProgress: enrollment.progress,
      completed: enrollment.progress >= 100,
      status: enrollment.status
    };
  }

  // Lấy tổng tiến trình theo enrollment ID
  async getOverallProgressByEnrollmentId(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }
    
    return {
      overallProgress: enrollment.progress,
      completed: enrollment.progress >= 100,
      status: enrollment.status
    };
  }
}
