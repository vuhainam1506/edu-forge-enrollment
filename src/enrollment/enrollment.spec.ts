import { Test, TestingModule } from '@nestjs/testing';
import { Enrollment } from './enrollment';

describe('Enrollment', () => {
  let provider: Enrollment;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Enrollment],
    }).compile();

    provider = module.get<Enrollment>(Enrollment);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
