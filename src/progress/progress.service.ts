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
}
