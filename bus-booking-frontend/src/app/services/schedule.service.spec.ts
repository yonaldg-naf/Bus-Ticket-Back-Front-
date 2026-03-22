import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScheduleService, ScheduleResponse, PagedResult } from './schedule.service';

const mockSchedule: ScheduleResponse = {
  id: 'sched-001',
  busId: 'bus-001',
  routeId: 'route-001',
  busCode: 'BUS-01',
  registrationNumber: 'TN01AB1234',
  routeCode: 'CHN-BLR',
  busType: 4,
  totalSeats: 40,
  departureUtc: '2025-06-01T08:00:00Z',
  basePrice: 500,
  createdAtUtc: '2025-01-01T00:00:00Z',
};

const mockPaged: PagedResult<ScheduleResponse> = {
  page: 1, pageSize: 10, totalCount: 1,
  items: [mockSchedule],
};

describe('ScheduleService', () => {
  let service: ScheduleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScheduleService],
    });
    service = TestBed.inject(ScheduleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── getAll() ──────────────────────────────────────────────────
  describe('getAll()', () => {
    it('GETs /api/schedules', () => {
      service.getAll().subscribe(list => expect(list.length).toBe(1));
      const req = http.expectOne('/api/schedules');
      expect(req.request.method).toBe('GET');
      req.flush([mockSchedule]);
    });
  });

  // ── getById() ─────────────────────────────────────────────────
  describe('getById()', () => {
    it('GETs /api/schedules/:id', () => {
      service.getById('sched-001').subscribe(s => expect(s.busCode).toBe('BUS-01'));
      const req = http.expectOne('/api/schedules/sched-001');
      expect(req.request.method).toBe('GET');
      req.flush(mockSchedule);
    });
  });

  // ── getSeatAvailability() ─────────────────────────────────────
  describe('getSeatAvailability()', () => {
    it('GETs /api/schedules/:id/seats', () => {
      const availability = {
        scheduleId: 'sched-001', busCode: 'BUS-01', totalSeats: 40,
        bookedCount: 5, availableCount: 35,
        availableSeats: ['1','2','3'], bookedSeats: ['4','5'],
      };
      service.getSeatAvailability('sched-001').subscribe(a => {
        expect(a.availableCount).toBe(35);
        expect(a.availableSeats.length).toBe(3);
      });
      const req = http.expectOne('/api/schedules/sched-001/seats');
      expect(req.request.method).toBe('GET');
      req.flush(availability);
    });
  });

  // ── searchByKeys() ────────────────────────────────────────────
  describe('searchByKeys()', () => {
    it('POSTs to /api/schedules/search-by-keys', () => {
      const body = { fromCity: 'Chennai', toCity: 'Bangalore', date: '2025-06-01' };
      service.searchByKeys(body).subscribe(r => expect(r.items.length).toBe(1));
      const req = http.expectOne('/api/schedules/search-by-keys');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.fromCity).toBe('Chennai');
      expect(req.request.body.toCity).toBe('Bangalore');
      req.flush(mockPaged);
    });

    it('includes optional sortBy and sortDir', () => {
      service.searchByKeys({ fromCity: 'Chennai', toCity: 'Bangalore', date: '2025-06-01', sortBy: 'price', sortDir: 'asc' }).subscribe();
      const req = http.expectOne('/api/schedules/search-by-keys');
      expect(req.request.body.sortBy).toBe('price');
      expect(req.request.body.sortDir).toBe('asc');
      req.flush(mockPaged);
    });
  });

  // ── update() ──────────────────────────────────────────────────
  describe('update()', () => {
    it('PUTs to /api/schedules/:id with all required fields', () => {
      const body = {
        busId: 'bus-001', routeId: 'route-001',
        departureUtc: '2025-06-01T08:00:00Z', basePrice: 600,
      };
      service.update('sched-001', body).subscribe(s => expect(s.basePrice).toBe(600));
      const req = http.expectOne('/api/schedules/sched-001');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.busId).toBe('bus-001');
      expect(req.request.body.routeId).toBe('route-001');
      expect(req.request.body.basePrice).toBe(600);
      req.flush({ ...mockSchedule, basePrice: 600 });
    });
  });

  // ── delete() ──────────────────────────────────────────────────
  describe('delete()', () => {
    it('DELETEs /api/schedules/:id', () => {
      service.delete('sched-001').subscribe();
      const req = http.expectOne('/api/schedules/sched-001');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // ── ScheduleResponse busType values ───────────────────────────
  describe('busType field', () => {
    it('AC type = 4 on schedule response', () => {
      service.getById('sched-001').subscribe(s => expect(s.busType).toBe(4));
      http.expectOne('/api/schedules/sched-001').flush(mockSchedule);
    });

    it('totalSeats is returned correctly', () => {
      service.getById('sched-001').subscribe(s => expect(s.totalSeats).toBe(40));
      http.expectOne('/api/schedules/sched-001').flush(mockSchedule);
    });
  });
});