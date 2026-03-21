import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuditLogService, AuditLogEntry, PagedAuditLogResult } from './audit-log.service';

const ENTRY: AuditLogEntry = {
  id: 'log-001', logType: 'Audit', action: 'POST',
  description: 'Created → /api/buses [201]',
  username: 'admin', userRole: 'Admin', entityType: 'Bus',
  statusCode: 201, durationMs: 40, isSuccess: true,
  createdAtUtc: '2026-01-01T10:00:00Z',
};

const PAGE: PagedAuditLogResult = { items: [ENTRY], totalCount: 1, page: 1, pageSize: 25, totalPages: 1 };

describe('AuditLogService', () => {
  let svc: AuditLogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AuditLogService, provideHttpClient(), provideHttpClientTesting()] });
    svc  = TestBed.inject(AuditLogService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should create', () => expect(svc).toBeTruthy());

  it('getLogs() sends GET with default page/pageSize', () => {
    svc.getLogs().subscribe();
    const req = http.expectOne(r => r.url.includes('/auditlogs'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush(PAGE);
  });

  it('getLogs() with logType passes param', () => {
    svc.getLogs({ logType: 'Error' }).subscribe();
    const req = http.expectOne(r => r.url.includes('/auditlogs'));
    expect(req.request.params.get('logType')).toBe('Error');
    req.flush(PAGE);
  });

  it('getLogs() with username passes param', () => {
    svc.getLogs({ username: 'alice' }).subscribe();
    const req = http.expectOne(r => r.url.includes('/auditlogs'));
    expect(req.request.params.get('username')).toBe('alice');
    req.flush(PAGE);
  });

  it('getLogs() with isSuccess=false passes param', () => {
    svc.getLogs({ isSuccess: false }).subscribe();
    const req = http.expectOne(r => r.url.includes('/auditlogs'));
    expect(req.request.params.get('isSuccess')).toBe('false');
    req.flush(PAGE);
  });

  it('getLogs() maps response correctly', () => {
    let result: PagedAuditLogResult | undefined;
    svc.getLogs().subscribe(r => (result = r));
    http.expectOne(r => r.url.includes('/auditlogs')).flush(PAGE);
    expect(result?.items[0].action).toBe('POST');
    expect(result?.totalCount).toBe(1);
  });

  it('getLogs() does NOT send undefined params', () => {
    svc.getLogs({ logType: undefined, username: undefined }).subscribe();
    const req = http.expectOne(r => r.url.includes('/auditlogs'));
    expect(req.request.params.has('logType')).toBeFalse();
    expect(req.request.params.has('username')).toBeFalse();
    req.flush(PAGE);
  });

  it('getLogs() sends date range params', () => {
    svc.getLogs({ from: '2026-01-01', to: '2026-01-31' }).subscribe();
    const req = http.expectOne(r => r.url.includes('/auditlogs'));
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-01-31');
    req.flush(PAGE);
  });
});