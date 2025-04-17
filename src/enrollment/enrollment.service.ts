// src/enrollment/enrollment.service.ts
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

  // Tạo enrollment mới
  async create(data: {
    courseId: string
    userId?: string
    isFree?: boolean
    courseName?: string
    userName?: string
    paymentId?: string
    status?: EnrollmentStatus
  }) {
    try {
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
        },
      })

      // Gửi email xác nhận đăng ký
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

  // Lấy enrollments theo user id (tất cả các khóa học mà user đã đăng ký)
  async findByUserId(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId: userId },
      include: {
        Certificate: true,
      },
    })
  }

  // Lấy chi tiết một enrollment (theo id của enrollment)
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

  // Cập nhật trạng thái enrollment
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

  // Kiểm tra xem user đã đăng ký khóa học chưa
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

  // Gửi email khi user đăng ký khóa học thành công
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

  // Xử lý webhook từ Payment Service
  async handlePaymentWebhook(data: {
    serviceId: string
    serviceType: string
    status: string
    paymentId: string
  }) {
    // Chỉ xử lý webhook cho COURSE_ENROLLMENT
    if (data.serviceType !== "COURSE_ENROLLMENT") {
      this.logger.warn(`Received webhook for unsupported service type: ${data.serviceType}`)
      throw new NotFoundException(`Service type ${data.serviceType} not supported`)
    }

    // Kiểm tra xem đã có enrollment chưa
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        courseId: data.serviceId,
        paymentId: data.paymentId,
      },
    })

    if (existingEnrollment) {
      // Cập nhật trạng thái enrollment dựa trên trạng thái payment
      let enrollmentStatus
      switch (data.status) {
        case "COMPLETED":
          enrollmentStatus = EnrollmentStatus.ACTIVE
          break
        case "FAILED":
        case "EXPIRED":
        case "CANCELLED":
          enrollmentStatus = EnrollmentStatus.CANCELLED
          break
        default:
          enrollmentStatus = existingEnrollment.status // Giữ nguyên trạng thái
      }

      this.logger.log(
        `Updating enrollment ${existingEnrollment.id} status to ${enrollmentStatus} based on payment ${data.paymentId} status ${data.status}`,
      )

      return this.prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: enrollmentStatus,
          updatedAt: new Date(),
        },
      })
    } else {
      // Nếu chưa có enrollment, tạo mới nếu thanh toán thành công
      if (data.status === "COMPLETED") {
        // Trong thực tế, bạn sẽ cần lấy thêm thông tin từ Course Service và User Service
        // Ở đây chúng ta giả định đã có thông tin
        this.logger.log(`Creating new enrollment for course ${data.serviceId} after payment ${data.paymentId}`)

        // Lấy thông tin user và course từ payment
        // Trong thực tế, bạn sẽ gọi API đến Payment Service để lấy thông tin này
        const userId = "USER-ID" // Thay bằng cách lấy từ Payment Service

        return this.create({
          courseId: data.serviceId,
          userId,
          isFree: false,
          paymentId: data.paymentId,
          status: EnrollmentStatus.ACTIVE,
        })
      }
    }

    return { message: "Payment processed but no action taken" }
  }

  // Các phương thức khác giữ nguyên
  async updateEnrollmentForNewLesson(courseId: string, lessonData: any) {
    // Tìm tất cả enrollment active của khóa học
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId: courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    })

    this.logger.log(`Found ${enrollments.length} active enrollments for course ${courseId}`)

    // Cập nhật progress cho mỗi enrollment
    for (const enrollment of enrollments) {
      // Cập nhật progress cho bài học mới
      await this.prisma.userProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: lessonData.id,
          isCompleted: false,
          progress: 0,
          updatedAt: new Date(),
        },
      })

      // Gửi email thông báo cho user
      await this.sendNewLessonNotification(enrollment.userId, enrollment.userName, enrollment.courseName, lessonData)
    }

    return { success: true, affectedEnrollments: enrollments.length }
  }

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

  // Tạo certificate cho enrollment
  async createCertificate(enrollmentId: string, certificateUrl: string) {
    const enrollment = await this.findOneByEnrollmentID(enrollmentId)

    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new ConflictException("Cannot create certificate for incomplete enrollment")
    }

    // Kiểm tra xem đã có certificate chưa
    const existingCertificate = await this.prisma.certificate.findFirst({
      where: { enrollmentId: enrollmentId },
    })

    if (existingCertificate) {
      return this.prisma.certificate.update({
        where: { id: existingCertificate.id },
        data: {
          certificateUrl: certificateUrl,
          updatedAt: new Date(),
        },
      })
    }

    return this.prisma.certificate.create({
      data: {
        enrollmentId: enrollmentId,
        certificateUrl: certificateUrl,
        issuedAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }
}

