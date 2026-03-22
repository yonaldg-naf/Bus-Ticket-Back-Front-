import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OperatorApprovalService, PendingOperator } from './operator-approval.service';

const mockOperator: PendingOperator = {
  id: 'op-001',
  username: 'newop',
  email: 'newop@example.com',
  fullName: 'New Operator',
  role: 'PendingOperator',
  createdAtUtc: '2025-06-01T08:00:00Z',
};

describe('OperatorApprovalService', () => {
  let service: OperatorApprovalService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OperatorApprovalService],
    });
    service = TestBed.inject(OperatorApprovalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── getPending() ──────────────────────────────────────────────
  describe('getPending()', () => {
    it('GETs /api/operator-approvals', () => {
      service.getPending().subscribe(list => {
        expect(list.length).toBe(1);
        expect(list[0].username).toBe('newop');
        expect(list[0].role).toBe('PendingOperator');
      });
      const req = http.expectOne('/api/operator-approvals');
      expect(req.request.method).toBe('GET');
      req.flush([mockOperator]);
    });

    it('returns empty array when no pending operators', () => {
      service.getPending().subscribe(list => expect(list).toEqual([]));
      http.expectOne('/api/operator-approvals').flush([]);
    });
  });

  // ── approve() ────────────────────────────────────────────────
  describe('approve()', () => {
    it('POSTs to /api/operator-approvals/:id/approve with company and phone', () => {
      const dto = { companyName: 'Test Travels', supportPhone: '+91 9876543210' };
      service.approve('op-001', dto).subscribe(r => expect(r.message).toContain('approved'));
      const req = http.expectOne('/api/operator-approvals/op-001/approve');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.companyName).toBe('Test Travels');
      expect(req.request.body.supportPhone).toBe('+91 9876543210');
      req.flush({ message: 'New Operator approved as operator.' });
    });

    it('POSTs without supportPhone when omitted', () => {
      service.approve('op-001', { companyName: 'Test Travels' }).subscribe();
      const req = http.expectOne('/api/operator-approvals/op-001/approve');
      expect(req.request.body.supportPhone).toBeUndefined();
      req.flush({ message: 'approved' });
    });

    it('uses correct id in URL', () => {
      service.approve('different-id-999', { companyName: 'Co' }).subscribe();
      const req = http.expectOne('/api/operator-approvals/different-id-999/approve');
      expect(req.request.url).toContain('different-id-999');
      req.flush({});
    });
  });

  // ── reject() ─────────────────────────────────────────────────
  describe('reject()', () => {
    it('POSTs to /api/operator-approvals/:id/reject with empty body', () => {
      service.reject('op-001').subscribe(r => expect(r.message).toContain('rejected'));
      const req = http.expectOne('/api/operator-approvals/op-001/reject');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ message: 'New Operator rejected.' });
    });

    it('uses correct id in URL', () => {
      service.reject('op-999').subscribe();
      const req = http.expectOne('/api/operator-approvals/op-999/reject');
      expect(req.request.url).toContain('op-999');
      req.flush({});
    });
  });
});