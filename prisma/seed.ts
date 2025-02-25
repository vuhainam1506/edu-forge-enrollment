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
      courseId: 'FREE-COURSE-1',
      userId: 'USER-1',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  console.log('Created free enrollment:', freeEnrollment1);

  const freeEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'FREE-COURSE-2',
      userId: 'USER-3',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  console.log('Created free enrollment:', freeEnrollment2);

  const freeEnrollment3 = await prisma.enrollment.create({
    data: {
      courseId: 'FREE-COURSE-3',
      userId: 'USER-4',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
    },
  });

  console.log('Created free enrollment:', freeEnrollment3);

  // Tạo enrollment có phí - đã thanh toán
  const paidEnrollment1 = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-1',
      userId: 'USER-2',
      isFree: false,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 299000,
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

  console.log('Created paid enrollment (completed):', paidEnrollment1);

  const paidEnrollment2 = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-3',
      userId: 'USER-4',
      isFree: false,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 199000,
          status: PaymentStatus.COMPLETED,
          orderCode: 'ORDER-003',
          updatedAt: new Date(),
        },
      },
    },
    include: {
      Payment: true,
    },
  });

  console.log('Created paid enrollment (completed):', paidEnrollment2);

  // Tạo enrollment có phí - đang chờ thanh toán
  const paidEnrollment3 = await prisma.enrollment.create({
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
    include: {
      Payment: true,
    },
  });

  console.log('Created paid enrollment (pending):', paidEnrollment3);

  const paidEnrollment4 = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-4',
      userId: 'USER-5',
      isFree: false,
      status: EnrollmentStatus.PENDING,
      updatedAt: new Date(),
      Payment: {
        create: {
          amount: 399000,
          status: PaymentStatus.PENDING,
          orderCode: 'ORDER-004',
          updatedAt: new Date(),
        },
      },
    },
    include: {
      Payment: true,
    },
  });

  console.log('Created paid enrollment (pending):', paidEnrollment4);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });