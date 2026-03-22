import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BookingService, BookingStatus, BookingResponse, BookingPassengerDto } from './booking.service';

const mockPassenger: BookingPassengerDto = { name: 'Alice', age: 25, seatNo: '5A' };

const mockBooking: BookingResponse = {
  id: 'booking-001',
  userId: 'user-001',
  scheduleId: 'schedule-001',
  status: BookingStatus.Pending,
  totalAmount: 500,
  createdAtUtc: '2025-01-01T10:00:00Z',
  busCode: 'BUS-01',
  registrationNumber: 'TN01AB1234',
  routeCode: 'CHN-BLR',
  departureUtc: '2025-06-01T08:00:00Z',
  busStatus: 1,
  passengers: [mockPassenger],
};

describe('BookingService', () => {
  let service: BookingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BookingService],
    });
    service = TestBed.inject(BookingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── create() ─────────────────────────────────────────────────
  describe('create()', () => {
    it('POSTs to /api/bookings', () => {
      const dto = { scheduleId: 'schedule-001', passengers: [mockPassenger] };
      service.create(dto).subscribe(b => expect(b.id).toBe('booking-001'));
      const req = http.expectOne('/api/bookings');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.scheduleId).toBe('schedule-001');
      expect(req.request.body.passengers.length).toBe(1);
      req.flush(mockBooking);
    });
  });

  // ── getMyBookings() ───────────────────────────────────────────
  describe('getMyBookings()', () => {
    it('GETs /api/bookings/my', () => {
      service.getMyBookings().subscribe(list => expect(list.length).toBe(1));
      const req = http.expectOne('/api/bookings/my');
      expect(req.request.method).toBe('GET');
      req.flush([mockBooking]);
    });

    it('returns empty array when no bookings', () => {
      service.getMyBookings().subscribe(list => expect(list).toEqual([]));
      http.expectOne('/api/bookings/my').flush([]);
    });
  });

  // ── getById() ─────────────────────────────────────────────────
  describe('getById()', () => {
    it('GETs /api/bookings/:id', () => {
      service.getById('booking-001').subscribe(b => expect(b.busCode).toBe('BUS-01'));
      const req = http.expectOne('/api/bookings/booking-001');
      expect(req.request.method).toBe('GET');
      req.flush(mockBooking);
    });
  });

  // ── cancelPost() ─────────────────────────────────────────────
  describe('cancelPost()', () => {
    it('POSTs to /api/bookings/:id/cancel', () => {
      service.cancelPost('booking-001').subscribe();
      const req = http.expectOne('/api/bookings/booking-001/cancel');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null);
    });
  });

  // ── pay() ─────────────────────────────────────────────────────
  describe('pay()', () => {
    it('POSTs to /api/bookings/:id/pay with amount and reference', () => {
      service.pay('booking-001', { amount: 500, providerReference: 'PAY-123' })
        .subscribe(b => expect(b.status).toBe(BookingStatus.Confirmed));
      const req = http.expectOne('/api/bookings/booking-001/pay');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.amount).toBe(500);
      expect(req.request.body.providerReference).toBe('PAY-123');
      req.flush({ ...mockBooking, status: BookingStatus.Confirmed });
    });

    it('POSTs without providerReference when omitted', () => {
      service.pay('booking-001', { amount: 500 }).subscribe();
      const req = http.expectOne('/api/bookings/booking-001/pay');
      expect(req.request.body.providerReference).toBeUndefined();
      req.flush({ ...mockBooking, status: BookingStatus.Confirmed });
    });
  });

  // ── getOperatorStats() ────────────────────────────────────────
  describe('getOperatorStats()', () => {
    it('GETs /api/bookings/operator-stats', () => {
      const stats = { totalBookings: 50, confirmedBookings: 40, revenue: 25000 };
      service.getOperatorStats().subscribe(s => {
        expect(s.totalBookings).toBe(50);
        expect(s.confirmedBookings).toBe(40);
        expect(s.revenue).toBe(25000);
      });
      const req = http.expectOne('/api/bookings/operator-stats');
      expect(req.request.method).toBe('GET');
      req.flush(stats);
    });
  });

  // ── BookingStatus enum ────────────────────────────────────────
  describe('BookingStatus enum values', () => {
    it('Pending = 1', () => expect(BookingStatus.Pending).toBe(1));
    it('Confirmed = 2', () => expect(BookingStatus.Confirmed).toBe(2));
    it('Cancelled = 3', () => expect(BookingStatus.Cancelled).toBe(3));
    it('Refunded = 4', () => expect(BookingStatus.Refunded).toBe(4));
  });
});