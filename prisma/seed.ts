// prisma/seed.ts
import { PrismaClient, EnrollmentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Xóa dữ liệu cũ
  await prisma.payment.deleteMany({});
  await prisma.enrollment.deleteMany({});

  // Tạo enrollment miễn phí
  const freeEnrollment1 = await prisma.enrollment.create({
    data: {
      courseId: 'course-1',
      userId: 'user-1',
      courseName: 'JavaScript Fundamentals',
      userName: 'John Doe',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  const freeEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'course-2',
      userId: 'user-2',
      courseName: 'React Basics',
      userName: 'Jane Smith',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  // Tạo enrollment có phí - đã thanh toán
  const paidEnrollment1 = await prisma.enrollment.create({
    data: {
      courseId: 'course-3',
      userId: 'user-3',
      courseName: 'Advanced TypeScript',
      userName: 'Alice Johnson',
      isFree: false,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 499000,
          status: PaymentStatus.COMPLETED,
          orderCode: 'ORDER-001',
          updatedAt: new Date(),
        },
      },
    },
    include: {
      Payment: true,
    },
  });

  const paidEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'course-4',
      userId: 'user-4',
      courseName: 'NestJS Masterclass',
      userName: 'Bob Wilson',
      isFree: false,
      status: EnrollmentStatus.PENDING,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 699000,
          status: PaymentStatus.PENDING,
          orderCode: 'ORDER-002',
          updatedAt: new Date(),
        },
      },
    },
    include: {
      Payment: true,
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