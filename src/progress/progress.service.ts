/**
 * Progress Service
 * 
 * Service xử lý logic nghiệp vụ liên quan đến tiến trình học tập.
 * Quản lý việc theo dõi, cập nhật và kiểm tra tiến trình học tập của người dùng
 * trong các khóa học, bao gồm cả tiến trình tổng thể và tiến trình chi tiết của từng bài học.
 */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lấy thông tin chi tiết về tiến trình học tập theo enrollment ID
   * 
   * @param enrollmentId - ID của enrollment cần lấy thông tin
   * @returns Thông tin chi tiết về tiến trình học tập, bao gồm:
   *          - enrollmentId: ID của enrollment
   *          - progress: Phần trăm hoàn thành khóa học
   *          - currentLesson: ID của bài học hiện tại
   *          - lessonId: ID của bài học trong UserProgress
   *          - isLessonCompleted: Trạng thái hoàn thành của bài học
   *          - lastUpdated: Thời gian cập nhật gần nhất
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
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

  /**
   * Lấy thông tin chi tiết về tiến trình học tập theo user ID và course ID
   * 
   * @param userId - ID của người dùng
   * @param courseId - ID của khóa học
   * @returns Thông tin chi tiết về tiến trình học tập (cùng cấu trúc với getProgressByEnrollmentId)
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
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

  /**
   * Cập nhật tiến trình học tập theo enrollment ID
   * 
   * @param enrollmentId - ID của enrollment cần cập nhật
   * @param updateDto - Dữ liệu cập nhật tiến trình, có thể bao gồm:
   *                    - progress: Phần trăm hoàn thành khóa học
   *                    - currentLesson: ID của bài học hiện tại
   *                    - lessonId: ID của bài học đang được cập nhật
   *                    - isLessonCompleted: Trạng thái hoàn thành của bài học
   * @returns Thông tin tiến trình học tập đã được cập nhật
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
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
        // Cập nhật UserProgress hiện có
        await this.prisma.userProgress.update({
          where: { enrollmentId: enrollmentId },
          data: {
            lessonId: updateDto.lessonId || updatedEnrollment.UserProgress.lessonId,
            isCompleted: updateDto.isLessonCompleted !== undefined ? updateDto.isLessonCompleted : updatedEnrollment.UserProgress.isCompleted,
            progress: updateDto.progress || updatedEnrollment.UserProgress.progress,
          },
        });
      } else if (updateDto.lessonId) {
        // Tạo mới UserProgress nếu chưa có
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

  /**
   * Cập nhật tiến trình học tập theo user ID và course ID
   * 
   * @param userId - ID của người dùng
   * @param courseId - ID của khóa học
   * @param updateDto - Dữ liệu cập nhật tiến trình (cùng cấu trúc với updateProgressByEnrollmentId)
   * @returns Thông tin tiến trình học tập đã được cập nhật
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
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

  /**
   * Kiểm tra trạng thái hoàn thành khóa học theo user ID và course ID
   * 
   * @param userId - ID của người dùng
   * @param courseId - ID của khóa học
   * @returns true nếu khóa học đã hoàn thành (progress >= 100), ngược lại false
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
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

  /**
   * Kiểm tra trạng thái hoàn thành khóa học theo enrollment ID
   * 
   * @param enrollmentId - ID của enrollment cần kiểm tra
   * @returns true nếu khóa học đã hoàn thành (progress >= 100), ngược lại false
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
  async checkEnrollmentCompletion(enrollmentId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }
    
    return enrollment.progress >= 100;
  }

  /**
   * Lấy thông tin tổng quan về tiến trình khóa học theo user ID và course ID
   * 
   * @param userId - ID của người dùng
   * @param courseId - ID của khóa học
   * @returns Thông tin tổng quan về tiến trình, bao gồm:
   *          - overallProgress: Phần trăm hoàn thành khóa học
   *          - completed: Trạng thái hoàn thành (true/false)
   *          - status: Trạng thái của enrollment (PENDING, ACTIVE, COMPLETED, CANCELLED, FAILED)
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
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

  /**
   * Lấy thông tin tổng quan về tiến trình khóa học theo enrollment ID
   * 
   * @param enrollmentId - ID của enrollment cần lấy thông tin
   * @returns Thông tin tổng quan về tiến trình (cùng cấu trúc với getOverallProgress)
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
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
