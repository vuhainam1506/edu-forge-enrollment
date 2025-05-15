/**
 * Enrollment Service
 * 
 * Service xử lý logic nghiệp vụ liên quan đến việc đăng ký khóa học.
 * Quản lý việc tạo, truy vấn, cập nhật trạng thái đăng ký, xử lý thanh toán,
 * quản lý chứng chỉ và gửi thông báo qua email.
 */
import { Injectable, ConflictException, NotFoundException, Logger } from "@nestjs/common"
import { PrismaClient, EnrollmentStatus } from "@prisma/client"
import { MailerService } from "@nestjs-modules/mailer"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { Resend } from "resend"

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name)
  private prisma: PrismaClient

  constructor(
    private mailerService: MailerService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.prisma = new PrismaClient()
  }

  /**
   * Tạo enrollment mới cho một người dùng và khóa học
   * 
   * @param data - Dữ liệu để tạo enrollment
   * @returns Enrollment đã được tạo
   * @throws ConflictException - Nếu người dùng đã đăng ký khóa học này
   */
  async create(data: {
    courseId: string
    userId?: string
    isFree?: boolean
    courseName?: string
    userName?: string
    paymentId?: string
    status?: EnrollmentStatus
    lessonId?: string
    lessonTitle?: string
  }) {
    try {
      console.log("Creating enrollment with data:", data);
      // Xác định trạng thái enrollment
      let enrollmentStatus: EnrollmentStatus

      if (data.status) {
        // Sử dụng trạng thái được chỉ định
        enrollmentStatus = data.status
      } else if (data.isFree) {
        // Khóa học miễn phí luôn ACTIVE
        enrollmentStatus = EnrollmentStatus.ACTIVE
      } else if (data.paymentId) {
        // Có payment ID, đã thanh toán
        enrollmentStatus = EnrollmentStatus.ACTIVE
      } else {
        // Mặc định là PENDING
        enrollmentStatus = EnrollmentStatus.PENDING
      }

      // Tạo enrollment mới với progress ban đầu là 0
      const enrollment = await this.prisma.enrollment.create({
        data: {
          courseId: data.courseId,
          userId: data.userId,
          isFree: data.isFree || false,
          status: enrollmentStatus,
          updatedAt: new Date(),
          courseName: data.courseName,
          userName: data.userName,
          paymentId: data.paymentId,
          currentLesson: data.lessonId,
          progress: 0, // Thêm progress ban đầu là 0
        },
      })

      // Tạo UserProgress luôn, bất kể trạng thái enrollment
      try {
        if (data.lessonId) {
          // Sử dụng lessonId được truyền vào
          await this.prisma.userProgress.create({
            data: {
              enrollmentId: enrollment.id,
              lessonId: data.lessonId,
              isCompleted: false,
              progress: 0,
              updatedAt: new Date(),
            },
          });
        } else {
          this.logger.warn(`No lessonId provided for enrollment ${enrollment.id}, skipping UserProgress creation`);
        }
      } catch (progressError) {
        this.logger.error(`Failed to create user progress for enrollment ${enrollment.id}`, progressError.stack);
        // Không throw lỗi, vẫn tiếp tục flow
      }

      // Gửi email xác nhận đăng ký nếu enrollment đang ACTIVE
      if (enrollmentStatus === EnrollmentStatus.ACTIVE) {
        await this.sendEnrollmentConfirmationEmail(data.userId, data.courseId, data.courseName)
      }

      return enrollment
    } catch (error) {
      if (error.code === "P2002") {
        throw new ConflictException("User is already enrolled in this course")
      }
      this.logger.error(`Failed to create enrollment`, error.stack)
      throw error
    }
  }

  /**
   * Lấy danh sách các khóa học mà một người dùng đã đăng ký
   * 
   * @param userId - ID của người dùng
   * @returns Danh sách các enrollment của người dùng, bao gồm thông tin chứng chỉ
   */
  async findByUserId(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId: userId },
      include: {
        Certificate: true,
      },
    })
  }

  /**
   * Lấy thông tin chi tiết của một enrollment theo ID
   * 
   * @param id - ID của enrollment cần lấy thông tin
   * @returns Thông tin chi tiết của enrollment, bao gồm chứng chỉ và tiến trình học tập
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
  async findOneByEnrollmentID(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        Certificate: true,
        UserProgress: true,
      },
    })

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`)
    }

    return enrollment
  }

  /**
   * Cập nhật trạng thái của một enrollment
   * 
   * @param id - ID của enrollment cần cập nhật
   * @param status - Trạng thái mới của enrollment
   * @returns Enrollment đã được cập nhật
   */
  async updateStatus(id: string, status: EnrollmentStatus) {
    const enrollment = await this.findOneByEnrollmentID(id)

    return this.prisma.enrollment.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === EnrollmentStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    })
  }

  /**
   * Kiểm tra xem một người dùng đã đăng ký một khóa học cụ thể chưa
   * 
   * @param userId - ID của người dùng cần kiểm tra
   * @param courseId - ID của khóa học cần kiểm tra
   * @returns true nếu người dùng đã đăng ký và khóa học đang ACTIVE hoặc COMPLETED, ngược lại false
   */
  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
        status: {
          in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
        },
      },
    })
    return !!enrollment
  }

  /**
   * Lấy danh sách tất cả các enrollment với bộ lọc tùy chọn
   * 
   * @param filters - Bộ lọc tùy chọn (userId, status)
   * @returns Danh sách các enrollment thỏa mãn điều kiện lọc
   */
  async findAll(filters?: {
    userId?: string
    status?: EnrollmentStatus
  }) {
    const where: any = {}
    if (filters?.userId) where.userId = filters.userId
    if (filters?.status) where.status = filters.status

    return this.prisma.enrollment.findMany({
      where,
      include: {
        Certificate: true,
      },
    })
  }

  /**
   * Gửi email xác nhận khi người dùng đăng ký khóa học thành công
   * 
   * @param userId - ID của người dùng
   * @param courseId - ID của khóa học
   * @param courseName - Tên khóa học
   */
  async sendEnrollmentConfirmationEmail(userId: string, courseId: string, courseName?: string): Promise<void> {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: "Acme <enrollment@eduforge.io.vn>",
        to: ["thinhdz1500@gmail.com"], // Thay bằng email thật từ user service
        subject: "Đăng ký khóa học thành công",
        html: `
          <h1>Chúc mừng bạn đã đăng ký khóa học thành công</h1>
          <p>Cảm ơn bạn đã đăng ký khóa học ${courseName || courseId}.</p>
          <p>Bạn có thể bắt đầu học ngay bây giờ.</p>
        `,
      })
      this.logger.log(`Sent enrollment confirmation email to user ${userId} for course ${courseId}`)
    } catch (error) {
      this.logger.error(`Failed to send enrollment confirmation email`, error.stack)
      // Không throw error ở đây, vẫn tiếp tục flow
    }
  }

  /**
   * Xử lý webhook từ Payment Service
   * 
   * @param data - Dữ liệu từ payment service
   * @returns Kết quả xử lý webhook
   */
  async processPaymentUpdate(data: {
    paymentId: string;
    serviceId: string; // courseId
    status: string;
    lessonId?: string;
    metadata?: any;
  }) {
    this.logger.log(`Processing payment update for payment ${data.paymentId}, course ${data.serviceId}, status ${data.status}`);

    // Tìm enrollment hiện có dựa trên paymentId
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        paymentId: data.paymentId,
      },
    });

    if (existingEnrollment) {
      // Cập nhật trạng thái enrollment dựa trên trạng thái payment
      let enrollmentStatus;
      switch (data.status) {
        case "COMPLETED":
          enrollmentStatus = EnrollmentStatus.ACTIVE;
          break;
        case "FAILED":
        case "EXPIRED":
        case "CANCELLED":
          enrollmentStatus = EnrollmentStatus.CANCELLED;
          break;
        default:
          enrollmentStatus = existingEnrollment.status; // Giữ nguyên trạng thái
      }

      this.logger.log(
        `Updating enrollment ${existingEnrollment.id} status to ${enrollmentStatus} based on payment ${data.paymentId} status ${data.status}`,
      );

      // Lấy lessonId từ webhook hoặc metadata
      const lessonId = data.lessonId || (data.metadata?.lessonId) || existingEnrollment.currentLesson;

      // Cập nhật trạng thái enrollment
      const updatedEnrollment = await this.prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: enrollmentStatus,
          updatedAt: new Date(),
          ...(lessonId ? { currentLesson: lessonId } : {}),
          // Đảm bảo progress có giá trị
          progress: existingEnrollment.progress || 0,
        },
      });

      // Tạo UserProgress nếu chưa có và có lessonId
      if (enrollmentStatus === EnrollmentStatus.ACTIVE && lessonId) {
        // Kiểm tra xem đã có UserProgress chưa
        const existingProgress = await this.prisma.userProgress.findFirst({
          where: { enrollmentId: existingEnrollment.id },
        });

        if (!existingProgress) {
          // Tạo UserProgress mới
          await this.prisma.userProgress.create({
            data: {
              enrollmentId: existingEnrollment.id,
              lessonId: lessonId,
              isCompleted: false,
              progress: 0,
              updatedAt: new Date(),
            },
          });
        }
      }

      return updatedEnrollment;
    } else {
      // Xử lý các trường hợp khác...
      this.logger.warn(`No enrollment found with payment ID ${data.paymentId}`);
      return { success: false, message: "No enrollment found with this payment ID" };
    }
  }

  /**
   * Thêm bài học mới vào tất cả các enrollment của một khóa học
   * 
   * @param lessonData - Dữ liệu của bài học mới
   * @returns Kết quả thêm bài học mới
   */
  async addNewLessonToAllEnrollments(lessonData: {
    id: string;
    title: string;
    courseId: string;
    // Các trường khác của lesson
  }) {
    this.logger.log(`Adding new lesson ${lessonData.id} to all enrollments for course ${lessonData.courseId}`);

    // Tìm tất cả enrollment đang active cho khóa học
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId: lessonData.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    this.logger.log(`Found ${enrollments.length} active enrollments for course ${lessonData.courseId}`);

    // Cập nhật progress cho mỗi enrollment
    for (const enrollment of enrollments) {
      try {
        // Cập nhật enrollment với currentLesson mới
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            currentLesson: lessonData.id,
            updatedAt: new Date(),
            // Đảm bảo progress có giá trị
            progress: enrollment.progress || 0,
          },
        });

        // Kiểm tra xem đã có UserProgress chưa
        const existingProgress = await this.prisma.userProgress.findUnique({
          where: { enrollmentId: enrollment.id },
        });

        if (existingProgress) {
          // Cập nhật UserProgress hiện có
          await this.prisma.userProgress.update({
            where: { enrollmentId: enrollment.id },
            data: {
              lessonId: lessonData.id,
              isCompleted: false,
              updatedAt: new Date(),
            },
          });
        } else {
          // Tạo UserProgress mới
          await this.prisma.userProgress.create({
            data: {
              enrollmentId: enrollment.id,
              lessonId: lessonData.id,
              isCompleted: false,
              progress: 0,
              updatedAt: new Date(),
            },
          });
        }

        // Gửi email thông báo cho user
        await this.sendNewLessonNotification(enrollment.userId, enrollment.userName, enrollment.courseName, lessonData);
      } catch (error) {
        this.logger.error(`Error updating progress for enrollment ${enrollment.id}`, error.stack);
      }
    }

    return { success: true, affectedEnrollments: enrollments.length };
  }

  /**
   * Gửi thông báo khi có bài học mới được thêm vào khóa học
   * 
   * @param userId - ID của người dùng
   * @param userName - Tên người dùng
   * @param courseName - Tên khóa học
   * @param lessonData - Dữ liệu của bài học mới
   */
  private async sendNewLessonNotification(userId: string, userName: string, courseName: string, lessonData: any) {
    try {
      await this.mailerService.sendMail({
        to: this.configService.get<string>("ENROLLMENT_MAILER_USER"), // Thay bằng email thật từ user service
        from: this.configService.get<string>("MAIL_FROM"),
        subject: "Bài học mới đã được thêm vào khóa học của bạn",
        template: "new-lesson",
        context: {
          name: userName || "Học viên",
          courseName: courseName || "Khóa học của bạn",
          lessonTitle: lessonData.title || "Bài học mới",
          lessonDescription: lessonData.description || "Nội dung bài học mới",
        },
      })
      this.logger.log(`Sent new lesson notification to user ${userId}`)
    } catch (error) {
      this.logger.error(`Failed to send new lesson notification`, error.stack)
      // Không throw error ở đây, vẫn tiếp tục flow
    }
  }

  /**
   * Tạo chứng chỉ cho một enrollment
   * 
   * @param enrollmentId - ID của enrollment cần tạo chứng chỉ
   * @param certificateData - Dữ liệu chứng chỉ
   * @returns Chứng chỉ đã được tạo hoặc cập nhật
   * @throws ConflictException - Nếu enrollment chưa hoàn thành
   */
  async createCertificate(
    enrollmentId: string, 
    certificateData: {
      metadata: Record<string, any>;
    }
  ) {
    const enrollment = await this.findOneByEnrollmentID(enrollmentId);

    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new ConflictException("Cannot create certificate for incomplete enrollment");
    }

    // Đảm bảo metadata chứa thông tin cần thiết
    const metadata = {
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      courseName: enrollment.courseName,
      userName: enrollment.userName,
      ...(certificateData.metadata || {})
    };

    // Kiểm tra xem đã có certificate chưa
    const existingCertificate = await this.prisma.certificate.findFirst({
      where: { enrollmentId: enrollmentId },
    });

    if (existingCertificate) {
      // Cập nhật certificate nếu đã tồn tại
      return this.prisma.certificate.update({
        where: { id: existingCertificate.id },
        data: {
          metadata,
          updatedAt: new Date(),
        },
      });
    }

    // Tạo certificate mới nếu chưa tồn tại
    return this.prisma.certificate.create({
      data: {
        enrollmentId: enrollmentId,
        metadata,
        issuedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Lấy thông tin enrollment theo userId và courseId
   * 
   * @param userId - ID của người dùng
   * @param courseId - ID của khóa học
   * @returns Thông tin chi tiết của enrollment, bao gồm chứng chỉ và tiến trình học tập
   * @throws NotFoundException - Nếu không tìm thấy enrollment
   */
  async findByUserAndCourse(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { 
        userId: userId,
        courseId: courseId 
      },
      include: {
        Certificate: true,
        UserProgress: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment for user ${userId} in course ${courseId} not found`);
    }

    return enrollment;
  }

  /**
   * Lấy tất cả chứng chỉ của một người dùng
   * 
   * @param userId - ID của người dùng
   * @returns Danh sách chứng chỉ của người dùng kèm thông tin khóa học
   */
  async getUserCertificates(userId: string) {
    const enrollmentsWithCertificates = await this.prisma.enrollment.findMany({
      where: {
        userId: userId,
        status: EnrollmentStatus.COMPLETED,
        Certificate: {
          isNot: null
        }
      },
      include: {
        Certificate: true
      }
    });

    return enrollmentsWithCertificates.map(enrollment => ({
      certificateId: enrollment.Certificate.id,
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      courseName: enrollment.courseName,
      metadata: enrollment.Certificate.metadata,
      issuedAt: enrollment.Certificate.issuedAt
    }));
  }

  /**
   * Lấy chứng chỉ của một người dùng cho một khóa học cụ thể
   * 
   * @param userId - ID của người dùng
   * @param courseId - ID của khóa học
   * @returns Chứng chỉ của người dùng cho khóa học
   * @throws NotFoundException - Nếu không tìm thấy chứng chỉ
   */
  async getUserCourseCertificate(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
        status: EnrollmentStatus.COMPLETED
      },
      include: {
        Certificate: true
      }
    });

    if (!enrollment || !enrollment.Certificate) {
      throw new NotFoundException(`Certificate for user ${userId} and course ${courseId} not found`);
    }

    return {
      certificateId: enrollment.Certificate.id,
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      courseName: enrollment.courseName,
      metadata: enrollment.Certificate.metadata,
      issuedAt: enrollment.Certificate.issuedAt
    };
  }

  /**
   * Xác minh tính hợp lệ của một chứng chỉ
   * 
   * @param certificateId - ID của chứng chỉ cần xác minh
   * @returns Thông tin xác minh chứng chỉ
   * @throws NotFoundException - Nếu không tìm thấy chứng chỉ
   */
  async verifyCertificate(certificateId: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        Enrollment: true
      }
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate ${certificateId} not found`);
    }

    return {
      isValid: true,
      certificateId: certificate.id,
      courseId: certificate.Enrollment.courseId,
      courseName: certificate.Enrollment.courseName,
      userName: certificate.Enrollment.userName,
      metadata: certificate.metadata,
      issuedAt: certificate.issuedAt
    };
  }

  /**
   * Cập nhật thông tin chứng chỉ
   * 
   * @param certificateId - ID của chứng chỉ cần cập nhật
   * @param certificateData - Dữ liệu cập nhật cho chứng chỉ
   * @returns Chứng chỉ đã được cập nhật
   * @throws NotFoundException - Nếu không tìm thấy chứng chỉ
   */
  async updateCertificate(
    certificateId: string, 
    certificateData: {
      metadata?: Record<string, any>;
    }
  ) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId }
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate ${certificateId} not found`);
    }

    // Xử lý metadata một cách an toàn
    const currentMetadata = certificate.metadata as Record<string, any>;
    const updatedMetadata = {
      ...currentMetadata,
      ...(certificateData.metadata || {})
    };

    return this.prisma.certificate.update({
      where: { id: certificateId },
      data: {
        metadata: updatedMetadata,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Lấy thống kê về đăng ký khóa học
   * 
   * @returns Thông tin thống kê đăng ký
   */
  async getEnrollmentStats() {
    try {
      // Lấy tổng số đăng ký
      const totalEnrollments = await this.prisma.enrollment.count();
      
      // Lấy đăng ký trong 30 ngày qua
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newEnrollmentsLast30Days = await this.prisma.enrollment.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
      
      // Lấy số đăng ký theo khóa học
      const enrollmentsByCourse = await this.prisma.enrollment.groupBy({
        by: ['courseId'],
        _count: {
          id: true
        }
      });
      
      // Chuyển đổi kết quả thành định dạng mong muốn
      const formattedEnrollmentsByCourse = enrollmentsByCourse.map(item => ({
        courseId: item.courseId,
        enrollments: item._count.id
      }));
      
      // Tính thời gian trung bình để hoàn thành khóa học
      const completedEnrollments = await this.prisma.enrollment.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: {
            not: null
          },
          createdAt: {
            not: null
          }
        },
        select: {
          createdAt: true,
          completedAt: true
        }
      });
      
      let averageTimeToComplete = 0;
      if (completedEnrollments.length > 0) {
        const totalDays = completedEnrollments.reduce((sum, enrollment) => {
          const createdAt = new Date(enrollment.createdAt);
          const completedAt = new Date(enrollment.completedAt);
          const diffTime = Math.abs(completedAt.getTime() - createdAt.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        
        averageTimeToComplete = totalDays / completedEnrollments.length;
      }
      
      // Tính tỷ lệ hoàn thành trung bình
      const completedCount = await this.prisma.enrollment.count({
        where: {
          status: 'COMPLETED'
        }
      });
      
      const averageCompletionRate = totalEnrollments > 0 ? completedCount / totalEnrollments : 0;
      
      // Tính tỷ lệ bỏ học dựa trên UserProgress
      const activeEnrollmentsWithProgress = await this.prisma.enrollment.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          UserProgress: true
        }
      });

      // Đếm số enrollment không có cập nhật tiến độ trong 30 ngày
      const inactiveCount = activeEnrollmentsWithProgress.filter(enrollment => {
        // Kiểm tra xem có UserProgress không
        if (!enrollment.UserProgress) return true;
        
        // Kiểm tra thời gian cập nhật gần nhất
        const lastUpdate = new Date(enrollment.UserProgress.updatedAt);
        return lastUpdate < thirtyDaysAgo;
      }).length;

      // Tính tỷ lệ bỏ học
      const dropoutRate = activeEnrollmentsWithProgress.length > 0 
        ? inactiveCount / activeEnrollmentsWithProgress.length 
        : 0;
      
      // Lấy các khóa học phổ biến nhất
      const popularCourses = await this.prisma.enrollment.groupBy({
        by: ['courseId', 'courseName'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      });
      
      const formattedPopularCourses = popularCourses.map(item => ({
        courseId: item.courseId,
        title: item.courseName,
        enrollments: item._count.id
      }));
      
      return {
        totalEnrollments,
        newEnrollmentsLast30Days,
        enrollmentsByCourse: formattedEnrollmentsByCourse,
        averageTimeToComplete,
        averageCompletionRate,
        dropoutRate,
        popularCourses: formattedPopularCourses
      };
    } catch (error) {
      this.logger.error('Error getting enrollment stats:', error);
      throw new Error('Failed to get enrollment statistics');
    }
  }
}

