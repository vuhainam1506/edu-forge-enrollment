import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnrollmentController } from './enrollment/enrollment.controller';
import { EnrollmentService } from './enrollment/enrollment.service';

@Module({
  imports: [],
  controllers: [AppController, EnrollmentController],
  providers: [AppService, EnrollmentService],
})
export class AppModule {}
