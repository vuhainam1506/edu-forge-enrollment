import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnrollmentController } from './enrollment/enrollment.controller';
import { EnrollemtnService } from './enrollemtn/enrollemtn.service';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { EnrollmentService } from './enrollment/enrollment.service';
import { PrismaModule } from './prisma/prisma.module';
import { EnrollmentController } from './enrollment/enrollment.controller';

@Module({
  imports: [PrismaModule, EnrollmentModule],
  controllers: [AppController, EnrollmentController],
  providers: [AppService, EnrollmentService, EnrollemtnService],
})
export class AppModule {}
