// prisma/seed.ts
import { PrismaClient, EnrollmentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Xóa dữ liệu cũ (nếu có)
  await prisma.payment.deleteMany({});
  await prisma.enrollment.deleteMany({});

  // Tạo enrollments cho khóa học miễn phí
  const freeEnrollment1 = await prisma.enrollment.create({
    data: {
      courseId: 'FREE-COURSE-1',
      userId: 'USER-1',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  const freeEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'FREE-COURSE-2',
      userId: 'USER-2',
      isFree: true,
      status: EnrollmentStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Tạo enrollments cho khóa học có phí
  const paidEnrollment1 = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-1',
      userId: 'USER-1',
      isFree: false,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 299000,
          status: PaymentStatus.COMPLETED,
          orderCode: 'ORDER-001',
          payosOrderId: 'PAYOS-001',
          payosTransId: 'TRANS-001',
          updatedAt: new Date(),
        },
      },
    },
  });

  const paidEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-2',
      userId: 'USER-2',
      isFree: false,
      status: EnrollmentStatus.PENDING,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 499000,
          status: PaymentStatus.PENDING,
          orderCode: 'ORDER-002',
          updatedAt: new Date(),
        },
      },
    },
  });

  const paidEnrollment3 = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-3',
      userId: 'USER-3',
      isFree: false,
      status: EnrollmentStatus.CANCELLED,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 699000,
          status: PaymentStatus.CANCELLED,
          orderCode: 'ORDER-003',
          updatedAt: new Date(),
        },
      },
    },
  });

  console.log('Seeded data:', {
    freeEnrollments: [freeEnrollment1, freeEnrollment2],
    paidEnrollments: [paidEnrollment1, paidEnrollment2, paidEnrollment3],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });