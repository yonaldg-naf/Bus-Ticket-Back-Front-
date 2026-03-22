import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuditLogService, AuditLogEntry, PagedAuditLogResult } from './audit-log.service';

const mockEntry: AuditLogEntry = {
  id: 'log-001',
  logType: 'Audit',
  action: 'POST',
  description: 'Created /api/buses [201]',
  username: 'operator1',
  userRole: 'Operator',
  endpoint: '/api/buses',
  httpMethod: 'POST',
  statusCode: 201,
  durationMs: 120,
  isSuccess: true,
  createdAtUtc: '2025-06-01T10:00:00Z',
};

const mockResult: PagedAuditLogResult = {
  items: [mockEntry],
  totalCount: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
};

describe('AuditLogService', () => {
  let service: AuditLogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuditLogService],
    });
    service = TestBed.inject(AuditLogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── Default call ──────────────────────────────────────────────
  describe('getLogs() with no filters', () => {
    it('GETs /api/auditlogs with default page and pageSize', () => {
      service.getLogs().subscribe(r => expect(r.items.length).toBe(1));
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('25');
      req.flush(mockResult);
    });

    it('does NOT send optional params when not provided', () => {
      service.getLogs().subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.has('logType')).toBeFalse();
      expect(req.request.params.has('username')).toBeFalse();
      expect(req.request.params.has('entityType')).toBeFalse();
      req.flush(mockResult);
    });
  });

  // ── With logType filter ───────────────────────────────────────
  describe('getLogs() with logType filter', () => {
    it('sends logType=Audit param', () => {
      service.getLogs({ logType: 'Audit' }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('logType')).toBe('Audit');
      req.flush(mockResult);
    });

    it('sends logType=Error param', () => {
      service.getLogs({ logType: 'Error' }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('logType')).toBe('Error');
      req.flush(mockResult);
    });
  });

  // ── With username filter ──────────────────────────────────────
  describe('getLogs() with username filter', () => {
    it('sends username param', () => {
      service.getLogs({ username: 'operator1' }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('username')).toBe('operator1');
      req.flush(mockResult);
    });
  });

  // ── With isSuccess filter ─────────────────────────────────────
  describe('getLogs() with isSuccess filter', () => {
    it('sends isSuccess=true param', () => {
      service.getLogs({ isSuccess: true }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('isSuccess')).toBe('true');
      req.flush(mockResult);
    });

    it('sends isSuccess=false param', () => {
      service.getLogs({ isSuccess: false }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('isSuccess')).toBe('false');
      req.flush(mockResult);
    });
  });

  // ── With date range ───────────────────────────────────────────
  describe('getLogs() with date range', () => {
    it('sends from and to params', () => {
      service.getLogs({ from: '2025-01-01', to: '2025-12-31' }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('from')).toBe('2025-01-01');
      expect(req.request.params.get('to')).toBe('2025-12-31');
      req.flush(mockResult);
    });
  });

  // ── With pagination ───────────────────────────────────────────
  describe('getLogs() with custom page/pageSize', () => {
    it('sends custom page and pageSize', () => {
      service.getLogs({ page: 3, pageSize: 10 }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('pageSize')).toBe('10');
      req.flush(mockResult);
    });
  });

  // ── With all filters combined ─────────────────────────────────
  describe('getLogs() with all filters', () => {
    it('sends all params simultaneously', () => {
      service.getLogs({
        logType: 'Audit', username: 'admin', entityType: 'Bus',
        isSuccess: true, from: '2025-01-01', to: '2025-12-31', page: 2, pageSize: 50,
      }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auditlogs');
      expect(req.request.params.get('logType')).toBe('Audit');
      expect(req.request.params.get('username')).toBe('admin');
      expect(req.request.params.get('entityType')).toBe('Bus');
      expect(req.request.params.get('isSuccess')).toBe('true');
      expect(req.request.params.get('from')).toBe('2025-01-01');
      expect(req.request.params.get('to')).toBe('2025-12-31');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('50');
      req.flush(mockResult);
    });
  });

  // ── Response mapping ──────────────────────────────────────────
  describe('response structure', () => {
    it('maps items, totalCount, page, pageSize, totalPages correctly', () => {
      service.getLogs().subscribe(r => {
        expect(r.items[0].logType).toBe('Audit');
        expect(r.items[0].username).toBe('operator1');
        expect(r.items[0].isSuccess).toBeTrue();
        expect(r.totalCount).toBe(1);
        expect(r.page).toBe(1);
        expect(r.pageSize).toBe(25);
        expect(r.totalPages).toBe(1);
      });
      http.expectOne(r => r.url === '/api/auditlogs').flush(mockResult);
    });
  });
});