// prisma/seed.ts
import { PrismaClient, EnrollmentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Xóa dữ liệu cũ
  await prisma.payment.deleteMany({});
  await prisma.userProgress.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.enrollment.deleteMany({});

  // Tạo enrollment miễn phí với certificate và progress
  const freeEnrollment1 = await prisma.enrollment.create({
    data: {
      courseId: 'course-1',
      userId: 'user-1',
      courseName: 'Lập Trình JavaScript Cơ Bản',
      userName: 'Nguyễn Văn A',
      isFree: true,
      status: EnrollmentStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
      Certificate: {
        create: {
          certificateUrl: '/certificates/cert-js-basic.pdf',
          updatedAt: new Date(),
        },
      },
      Progress: {
        create: [
          {
            lessonId: 'lesson-1',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'lesson-2',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
        ],
      },
    },
  });

  // Tạo enrollment miễn phí đang học
  const freeEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'course-2',
      userId: 'user-2',
      // courseName: 'HTML & CSS cho người mới bắt đầu',
      // userName: 'Trần Thị B',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
      Progress: {
        create: [
          {
            lessonId: 'lesson-1',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'lesson-2',
            isCompleted: false,
            progress: 30,
            updatedAt: new Date(),
          },
        ],
      },
    },
  });

  // Tạo enrollment có phí - đã thanh toán
  const paidEnrollment1 = await prisma.enrollment.create({
    data: {
      courseId: 'course-3',
      userId: 'user-3',
      courseName: 'React.js Advanced',
      userName: 'Lê Văn C',
      isFree: false,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 1499000,
          status: PaymentStatus.COMPLETED,
          orderCode: 'ORDER-001',
          updatedAt: new Date(),
        },
      },
      Progress: {
        create: [
          {
            lessonId: 'lesson-1',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'lesson-2',
            isCompleted: false,
            progress: 50,
            updatedAt: new Date(),
          },
        ],
      },
    },
  });

  // Tạo enrollment có phí - chờ thanh toán
  const paidEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'course-4',
      userId: 'user-4',
      courseName: 'NestJS Masterclass',
      userName: 'Phạm Thị D',
      isFree: false,
      status: EnrollmentStatus.PENDING,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 1999000,
          status: PaymentStatus.PENDING,
          orderCode: 'ORDER-002',
          updatedAt: new Date(),
        },
      },
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });