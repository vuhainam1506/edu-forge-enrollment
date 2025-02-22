import { Controller, Get } from '@nestjs/common';

@Controller('enrollment')
export class EnrollmentController {
@Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
