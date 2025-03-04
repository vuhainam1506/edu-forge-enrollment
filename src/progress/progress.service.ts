// src/progress/progress.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient, EnrollmentStatus } from '@prisma/client';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private prisma: PrismaClient) {}

  // Lấy tất cả tiến trình học của một user trong một khóa học
  async getProgress(userId: string, courseId: string) {
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

    // Lấy tất cả progress của enrollment
    const progress = await this.prisma.userProgress.findMany({
      where: {
        enrollmentId: enrollment.id,
      },
    });

    return progress;
  }

  // Tạo trạng thái tiến trình học mới
  async createProgress(createProgressDto: {
    enrollmentId: string;
    lessonId: string;
    isCompleted?: boolean;
    progress?: number;
  }) {
    this.logger.log(`Creating progress for enrollment ${createProgressDto.enrollmentId}, lesson ${createProgressDto.lessonId}`);
    
    return this.prisma.userProgress.create({
      data: {
        enrollmentId: createProgressDto.enrollmentId,
        lessonId: createProgressDto.lessonId,
        isCompleted: createProgressDto.isCompleted || false,
        progress: createProgressDto.progress || 0,
        updatedAt: new Date(),
      },
    });
  }

  // Cập nhật trạng thái tiến trình học
  async updateProgress(
    userId: string, 
    courseId: string, 
    updateProgressDto: {
      lessonId: string;
      isCompleted?: boolean;
      progress?: number;
    }
  ) {
    this.logger.log(`Updating progress for user ${userId}, course ${courseId}, lesson ${updateProgressDto.lessonId}`);
    
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

    // Tìm progress
    const progress = await this.prisma.userProgress.findFirst({
      where: {
        enrollmentId: enrollment.id,
        lessonId: updateProgressDto.lessonId,
      },
    });

    if (!progress) {
      // Nếu không tìm thấy, tạo mới
      this.logger.log(`Progress not found, creating new one`);
      return this.createProgress({
        enrollmentId: enrollment.id,
        lessonId: updateProgressDto.lessonId,
        isCompleted: updateProgressDto.isCompleted,
        progress: updateProgressDto.progress,
      });
    }

    // Cập nhật progress
    this.logger.log(`Updating existing progress ${progress.id}`);
    const updatedProgress = await this.prisma.userProgress.update({
      where: {
        id: progress.id,
      },
      data: {
        isCompleted: updateProgressDto.isCompleted !== undefined ? updateProgressDto.isCompleted : progress.isCompleted,
        progress: updateProgressDto.progress !== undefined ? updateProgressDto.progress : progress.progress,
        updatedAt: new Date(),
      },
    });

    // Kiểm tra và cập nhật trạng thái hoàn thành khóa học
    await this.checkCourseCompletion(userId, courseId);

    return updatedProgress;
  }

  // Kiểm tra và cập nhật trạng thái hoàn thành khóa học
  async checkCourseCompletion(userId: string, courseId: string): Promise<boolean> {
    // Tìm enrollment
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

    // Lấy tất cả progress
    const allProgress = await this.prisma.userProgress.findMany({
      where: {
        enrollmentId: enrollment.id,
      },
    });

    if (allProgress.length === 0) {
      this.logger.log(`No progress found for enrollment ${enrollment.id}`);
      return false;
    }

    // Kiểm tra xem tất cả bài học đã hoàn thành chưa
    const allCompleted = allProgress.every(p => p.isCompleted);

    // Nếu tất cả đã hoàn thành và enrollment chưa ở trạng thái COMPLETED
    if (allCompleted && enrollment.status !== EnrollmentStatus.COMPLETED) {
      this.logger.log(`All lessons completed for enrollment ${enrollment.id}, updating status to COMPLETED`);
      // Cập nhật trạng thái enrollment
      await this.prisma.enrollment.update({
        where: {
          id: enrollment.id,
        },
        data: {
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return allCompleted;
  }

  // Lấy tổng tiến trình của một khóa học
  async getOverallProgress(userId: string, courseId: string) {
    // Tìm enrollment
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

    // Lấy tất cả progress
    const allProgress = await this.prisma.userProgress.findMany({
      where: {
        enrollmentId: enrollment.id,
      },
    });

    if (allProgress.length === 0) {
      return {
        overallProgress: 0,
        completedLessons: 0,
        totalLessons: 0,
      };
    }

    // Tính toán tổng tiến trình
    const totalLessons = allProgress.length;
    const completedLessons = allProgress.filter(p => p.isCompleted).length;
    const overallProgress = completedLessons / totalLessons * 100;

    return {
      overallProgress,
      completedLessons,
      totalLessons,
    };
  }
}