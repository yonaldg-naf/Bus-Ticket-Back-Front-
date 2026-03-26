import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComplaintService, ComplaintResponse } from './complaint.service';

const mockComplaint: ComplaintResponse = {
  id: 'complaint-001',
  bookingId: 'booking-001',
  userId: 'user-001',
  customerName: 'Alice',
  message: 'The bus was 2 hours late and AC was not working.',
  status: 'Open',
  busCode: 'BUS-01',
  routeCode: 'CHN-BLR',
  departureUtc: '2025-06-01T08:00:00Z',
  createdAtUtc: '2025-06-01T10:00:00Z',
};

describe('ComplaintService', () => {
  let service: ComplaintService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ComplaintService],
    });
    service = TestBed.inject(ComplaintService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── raise() ───────────────────────────────────────────────────
  describe('raise()', () => {
    it('POSTs to /api/complaints/booking/:bookingId', () => {
      service.raise('booking-001', 'Bus was late.').subscribe(c => {
        expect(c.id).toBe('complaint-001');
        expect(c.status).toBe('Open');
      });
      const req = http.expectOne('/api/complaints/booking/booking-001');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.message).toBe('Bus was late.');
      req.flush(mockComplaint);
    });

    it('sends message in request body', () => {
      const msg = 'Driver was rude and the bus was dirty.';
      service.raise('booking-002', msg).subscribe();
      const req = http.expectOne('/api/complaints/booking/booking-002');
      expect(req.request.body).toEqual({ message: msg });
      req.flush({ ...mockComplaint, bookingId: 'booking-002', message: msg });
    });
  });

  // ── getMy() ───────────────────────────────────────────────────
  describe('getMy()', () => {
    it('GETs /api/complaints/my', () => {
      service.getMy().subscribe(list => {
        expect(list.length).toBe(1);
        expect(list[0].customerName).toBe('Alice');
      });
      const req = http.expectOne('/api/complaints/my');
      expect(req.request.method).toBe('GET');
      req.flush([mockComplaint]);
    });

    it('returns empty array when no complaints', () => {
      service.getMy().subscribe(list => expect(list).toEqual([]));
      http.expectOne('/api/complaints/my').flush([]);
    });
  });

  // ── getAll() ──────────────────────────────────────────────────
  describe('getAll()', () => {
    it('GETs /api/complaints', () => {
      service.getAll().subscribe(list => expect(list.length).toBe(2));
      const req = http.expectOne('/api/complaints');
      expect(req.request.method).toBe('GET');
      req.flush([mockComplaint, { ...mockComplaint, id: 'complaint-002' }]);
    });
  });

  // ── reply() ───────────────────────────────────────────────────
  describe('reply()', () => {
    it('PATCHes /api/complaints/:id/reply', () => {
      const resolved = { ...mockComplaint, reply: 'We apologise for the inconvenience.', status: 'Resolved' };
      service.reply('complaint-001', 'We apologise for the inconvenience.').subscribe(c => {
        expect(c.status).toBe('Resolved');
        expect(c.reply).toBe('We apologise for the inconvenience.');
      });
      const req = http.expectOne('/api/complaints/complaint-001/reply');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.reply).toBe('We apologise for the inconvenience.');
      req.flush(resolved);
    });

    it('uses correct complaint id in URL', () => {
      service.reply('complaint-999', 'Fixed.').subscribe();
      const req = http.expectOne('/api/complaints/complaint-999/reply');
      expect(req.request.url).toContain('complaint-999');
      req.flush({ ...mockComplaint, id: 'complaint-999', status: 'Resolved' });
    });
  });

  // ── ComplaintResponse shape ───────────────────────────────────
  describe('response shape', () => {
    it('Open complaint has no reply', () => {
      service.getMy().subscribe(list => {
        expect(list[0].reply).toBeUndefined();
        expect(list[0].status).toBe('Open');
      });
      http.expectOne('/api/complaints/my').flush([mockComplaint]);
    });

    it('Resolved complaint has reply', () => {
      const resolved = { ...mockComplaint, reply: 'Resolved.', status: 'Resolved' };
      service.getMy().subscribe(list => {
        expect(list[0].reply).toBe('Resolved.');
        expect(list[0].status).toBe('Resolved');
      });
      http.expectOne('/api/complaints/my').flush([resolved]);
    });
  });
});
