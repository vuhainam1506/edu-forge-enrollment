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
      courseId: 'course-js-basics-001',
      userId: 'user-001',
      courseName: 'Lập Trình JavaScript Cơ Bản',
      userName: 'Nguyễn Văn A',
      isFree: true,
      status: EnrollmentStatus.COMPLETED,
      progress: 100,
      currentLesson: 'lesson-js-003',
      completedAt: new Date(),
      updatedAt: new Date(),
      Certificate: {
        create: {
          metadata: {
            userId: 'user-001',
            courseId: 'course-js-basics-001',
            courseName: 'Lập Trình JavaScript Cơ Bản',
            userName: 'Nguyễn Văn A'
          },
          issuedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      UserProgress: {
        create: {
          lessonId: 'lesson-js-003',
          isCompleted: true,
          progress: 100,
          updatedAt: new Date(),
        },
      },
    },
  });
  
  console.log(`Created free completed enrollment: ${freeCompletedEnrollment.id}`);

  // Tạo enrollment miễn phí đang học
  const freeActiveEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'course-html-css-001',
      userId: 'user-001',
      courseName: 'HTML & CSS Fundamentals',
      userName: 'Nguyễn Văn A',
      isFree: true,
      status: EnrollmentStatus.ACTIVE,
      progress: 65,
      currentLesson: 'lesson-html-003',
      updatedAt: new Date(),
      UserProgress: {
        create: {
          lessonId: 'lesson-html-003',
          isCompleted: false,
          progress: 30,
          updatedAt: new Date(),
        },
      },
    },
  });
  
  console.log(`Created free active enrollment: ${freeActiveEnrollment.id}`);

  // Tạo enrollment có phí đã thanh toán và đang học
  const paidActiveEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'course-react-adv-001',
      userId: 'user-002',
      courseName: 'React.js Advanced',
      userName: 'Trần Thị B',
      isFree: false,
      status: EnrollmentStatus.ACTIVE,
      progress: 50,
      currentLesson: 'lesson-react-002',
      paymentId: 'payment-001',
      updatedAt: new Date(),
      UserProgress: {
        create: {
          lessonId: 'lesson-react-002',
          isCompleted: false,
          progress: 50,
          updatedAt: new Date(),
        },
      },
    },
  });
  
  console.log(`Created paid active enrollment: ${paidActiveEnrollment.id}`);

  // Tạo enrollment có phí đang chờ thanh toán
  const paidPendingEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'course-nestjs-001',
      userId: 'user-002',
      courseName: 'NestJS Masterclass',
      userName: 'Trần Thị B',
      isFree: false,
      status: EnrollmentStatus.PENDING,
      progress: 0,
      paymentId: 'payment-002',
      updatedAt: new Date(),
    },
  });
  
  console.log(`Created paid pending enrollment: ${paidPendingEnrollment.id}`);

  // Tạo enrollment bị hủy
  const cancelledEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'course-docker-k8s-001',
      userId: 'user-003',
      courseName: 'Docker & Kubernetes',
      userName: 'Lê Văn C',
      isFree: false,
      status: EnrollmentStatus.CANCELLED,
      progress: 0,
      paymentId: 'payment-003',
      updatedAt: new Date(),
    },
  });
  
  console.log(`Created cancelled enrollment: ${cancelledEnrollment.id}`);

  // Tạo enrollment thất bại
  const failedEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'course-aws-001',
      userId: 'user-003',
      courseName: 'AWS Cloud Practitioner',
      userName: 'Lê Văn C',
      isFree: false,
      status: EnrollmentStatus.FAILED,
      progress: 0,
      paymentId: 'payment-004',
      updatedAt: new Date(),
    },
  });
  
  console.log(`Created failed enrollment: ${failedEnrollment.id}`);

  // Tạo enrollment có phí đã hoàn thành với certificate
  const paidCompletedEnrollment = await prisma.enrollment.create({
    data: {
      courseId: 'course-fullstack-001',
      userId: 'user-004',
      courseName: 'Full Stack Web Development',
      userName: 'Phạm Thị D',
      isFree: false,
      status: EnrollmentStatus.COMPLETED,
      progress: 100,
      currentLesson: 'lesson-fullstack-005',
      paymentId: 'payment-005',
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: new Date(),
      Certificate: {
        create: {
          metadata: {
            userId: 'user-004',
            courseId: 'course-fullstack-001',
            courseName: 'Full Stack Web Development',
            userName: 'Phạm Thị D'
          },
          issuedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
          updatedAt: new Date(),
        },
      },
      UserProgress: {
        create: {
          lessonId: 'lesson-fullstack-005',
          isCompleted: true,
          progress: 100,
          updatedAt: new Date(),
        },
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
