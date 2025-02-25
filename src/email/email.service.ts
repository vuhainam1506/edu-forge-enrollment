import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is not defined');
    }
    this.resend = new Resend(apiKey);
  }

  async sendEnrollmentEmail(to: string, courseId: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Your Company <no-reply@yourdomain.com>', // Use your custom domain
        to: [to],
        subject: 'Enrollment Successful',
        html: `<strong>You have successfully enrolled in course ${courseId}!</strong>`,
      });

      if (error) {
        this.logger.error('Failed to send enrollment email', error);
        return;
      }

      this.logger.log('Enrollment email sent successfully', data);
    } catch (error) {
      this.logger.error('Error sending enrollment email', error);
    }
  }
}
