import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserManagementService, UserListResult } from './user-management.service';

const mockResult: UserListResult = {
  total: 2,
  page: 1,
  pageSize: 15,
  items: [
    { id: 'u-001', username: 'alice', email: 'alice@test.com', fullName: 'Alice', role: 'Customer', createdAtUtc: '2025-01-01T00:00:00Z' },
    { id: 'u-002', username: 'bob',   email: 'bob@test.com',   fullName: 'Bob',   role: 'Operator', createdAtUtc: '2025-02-01T00:00:00Z' },
  ],
};

describe('UserManagementService', () => {
  let service: UserManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserManagementService],
    });
    service = TestBed.inject(UserManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── No filters ────────────────────────────────────────────────
  describe('getUsers() with no filters', () => {
    it('GETs /api/auth/users', () => {
      service.getUsers({}).subscribe(r => expect(r.total).toBe(2));
      const req = http.expectOne(r => r.url === '/api/auth/users');
      expect(req.request.method).toBe('GET');
      req.flush(mockResult);
    });

    it('sends no query params when all are undefined', () => {
      service.getUsers({}).subscribe();
      const req = http.expectOne(r => r.url === '/api/auth/users');
      expect(req.request.params.has('role')).toBeFalse();
      expect(req.request.params.has('search')).toBeFalse();
      expect(req.request.params.has('page')).toBeFalse();
      expect(req.request.params.has('pageSize')).toBeFalse();
      req.flush(mockResult);
    });
  });

  // ── Role filter ───────────────────────────────────────────────
  describe('getUsers() with role filter', () => {
    it('sends role=Customer', () => {
      service.getUsers({ role: 'Customer' }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auth/users');
      expect(req.request.params.get('role')).toBe('Customer');
      req.flush(mockResult);
    });
  });

  // ── Search filter ─────────────────────────────────────────────
  describe('getUsers() with search filter', () => {
    it('sends search param', () => {
      service.getUsers({ search: 'alice' }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auth/users');
      expect(req.request.params.get('search')).toBe('alice');
      req.flush(mockResult);
    });
  });

  // ── Pagination ────────────────────────────────────────────────
  describe('getUsers() with pagination', () => {
    it('sends page and pageSize params', () => {
      service.getUsers({ page: 2, pageSize: 10 }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auth/users');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('10');
      req.flush(mockResult);
    });
  });

  // ── All params combined ───────────────────────────────────────
  describe('getUsers() with all filters', () => {
    it('sends all params', () => {
      service.getUsers({ role: 'Operator', search: 'bob', page: 1, pageSize: 15 }).subscribe();
      const req = http.expectOne(r => r.url === '/api/auth/users');
      expect(req.request.params.get('role')).toBe('Operator');
      expect(req.request.params.get('search')).toBe('bob');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('15');
      req.flush(mockResult);
    });
  });

  // ── Response mapping ──────────────────────────────────────────
  describe('response structure', () => {
    it('maps items and total correctly', () => {
      service.getUsers({}).subscribe(r => {
        expect(r.items[0].username).toBe('alice');
        expect(r.items[1].role).toBe('Operator');
        expect(r.total).toBe(2);
        expect(r.page).toBe(1);
        expect(r.pageSize).toBe(15);
      });
      http.expectOne(r => r.url === '/api/auth/users').flush(mockResult);
    });
  });
});