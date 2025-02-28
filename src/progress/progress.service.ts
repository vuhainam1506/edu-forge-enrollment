import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, UserProgress } from '@prisma/client';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaClient) {}

  // Lấy trạng thái tiến trình học của một user trong một khóa học
  async getProgress(userId: string, courseId: string): Promise<UserProgress> {
    const progress = await this.prisma.userProgress.findFirst({
      where: {
        userId,
        courseId,
      },
    });

    if (!progress) {
      throw new NotFoundException(`Progress for user ${userId} in course ${courseId} not found`);
    }

    return progress;
  }

  // Tạo trạng thái tiến trình học mới cho một user trong một khóa học
  async createProgress(createProgressDto: any): Promise<UserProgress> {
    return this.prisma.userProgress.create({
      data: createProgressDto,
    });
  }

  // Cập nhật trạng thái tiến trình học của một user trong một khóa học
  async updateProgress(userId: string, courseId: string, updateProgressDto: any): Promise<UserProgress> {
    const progress = await this.prisma.userProgress.findFirst({
      where: {
        userId,
        courseId,
      },
    });

    if (!progress) {
      throw new NotFoundException(`Progress for user ${userId} in course ${courseId} not found`);
    }

    return this.prisma.userProgress.update({
      where: {
        id: progress.id,
      },
      data: updateProgressDto,
    });
  }
}
