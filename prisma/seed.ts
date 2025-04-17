// prisma/seed.ts
import { PrismaClient, EnrollmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');
  
  // Xóa dữ liệu cũ
  console.log('Cleaning up existing data...');
  await prisma.userProgress.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.enrollment.deleteMany({});
  
  console.log('Creating test data...');
  
  // Tạo enrollment miễn phí đã hoàn thành với certificate
  const freeCompletedEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'FREE-COURSE-1',
      userId: 'USER-1',
      courseName: 'Lập Trình JavaScript Cơ Bản',
      userName: 'Nguyễn Văn A',
      isFree: true,
      status: EnrollmentStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
      Certificate: {
        create: {
          certificateUrl: '/certificates/cert-js-basic.pdf',
          issuedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      UserProgress: {
        create: [
          {
            lessonId: 'LESSON-1-1',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-1-2',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-1-3',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
        ],
      },
    },
  });
  
  console.log(`Created free completed enrollment: ${freeCompletedEnrollment.id}`);

  // Tạo enrollment miễn phí đang học
  const freeActiveEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'FREE-COURSE-2',
      userId: 'USER-1',
      courseName: 'HTML & CSS Fundamentals',
      userName: 'Nguyễn Văn A',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      updatedAt: new Date(),
      UserProgress: {
        create: [
          {
            lessonId: 'LESSON-2-1',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-2-2',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-2-3',
            isCompleted: false,
            progress: 30,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-2-4',
            isCompleted: false,
            progress: 0,
            updatedAt: new Date(),
          },
        ],
      },
    },
  });
  
  console.log(`Created free active enrollment: ${freeActiveEnrollment.id}`);

  // Tạo enrollment có phí đã thanh toán và đang học
  const paidActiveEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-1',
      userId: 'USER-2',
      courseName: 'React.js Advanced',
      userName: 'Trần Thị B',
      isFree: false,
      status: EnrollmentStatus.ACTIVE,
      paymentId: 'PAYMENT-001',
      updatedAt: new Date(),
      UserProgress: {
        create: [
          {
            lessonId: 'LESSON-3-1',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-3-2',
            isCompleted: false,
            progress: 50,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-3-3',
            isCompleted: false,
            progress: 0,
            updatedAt: new Date(),
          },
        ],
      },
    },
  });
  
  console.log(`Created paid active enrollment: ${paidActiveEnrollment.id}`);

  // Tạo enrollment có phí đang chờ thanh toán
  const paidPendingEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-2',
      userId: 'USER-2',
      courseName: 'NestJS Masterclass',
      userName: 'Trần Thị B',
      isFree: false,
      status: EnrollmentStatus.PENDING,
      paymentId: 'PAYMENT-002',
      updatedAt: new Date(),
    },
  });
  
  console.log(`Created paid pending enrollment: ${paidPendingEnrollment.id}`);

  // Tạo enrollment bị hủy
  const cancelledEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-3',
      userId: 'USER-3',
      courseName: 'Docker & Kubernetes',
      userName: 'Lê Văn C',
      isFree: false,
      status: EnrollmentStatus.CANCELLED,
      paymentId: 'PAYMENT-003',
      updatedAt: new Date(),
    },
  });
  
  console.log(`Created cancelled enrollment: ${cancelledEnrollment.id}`);

  // Tạo enrollment thất bại
  const failedEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-4',
      userId: 'USER-3',
      courseName: 'AWS Cloud Practitioner',
      userName: 'Lê Văn C',
      isFree: false,
      status: EnrollmentStatus.FAILED,
      paymentId: 'PAYMENT-004',
      updatedAt: new Date(),
    },
  });
  
  console.log(`Created failed enrollment: ${failedEnrollment.id}`);

  // Tạo enrollment có phí đã hoàn thành với certificate
  const paidCompletedEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'PAID-COURSE-5',
      userId: 'USER-4',
      courseName: 'Full Stack Web Development',
      userName: 'Phạm Thị D',
      isFree: false,
      status: EnrollmentStatus.COMPLETED,
      paymentId: 'PAYMENT-005',
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: new Date(),
      Certificate: {
        create: {
          certificateUrl: '/certificates/cert-fullstack-web.pdf',
          issuedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
          updatedAt: new Date(),
        },
      },
      UserProgress: {
        create: [
          {
            lessonId: 'LESSON-5-1',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-5-2',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-5-3',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-5-4',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
          {
            lessonId: 'LESSON-5-5',
            isCompleted: true,
            progress: 100,
            updatedAt: new Date(),
          },
        ],
      },
    },
  });
  
  console.log(`Created paid completed enrollment: ${paidCompletedEnrollment.id}`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });