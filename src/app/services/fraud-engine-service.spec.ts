import { TestBed } from '@angular/core/testing';

import { FraudEngineService } from './fraud-engine-service';

describe('FraudEngineService', () => {
  let service: FraudEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FraudEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
