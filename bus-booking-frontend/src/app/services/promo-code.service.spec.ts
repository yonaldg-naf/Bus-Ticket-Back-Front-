import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PromoCodeService, PromoCodeResponse, ValidatePromoResponse } from './promo-code.service';

const mockPromo: PromoCodeResponse = {
  id: 'promo-001',
  code: 'SAVE20',
  discountType: 1,
  discountValue: 20,
  maxUses: 100,
  usedCount: 5,
  isActive: true,
  companyName: 'Test Travels',
  createdAtUtc: '2025-01-01T00:00:00Z',
  expiresAtUtc: '2026-12-31T23:59:59Z',
};

describe('PromoCodeService', () => {
  let service: PromoCodeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PromoCodeService],
    });
    service = TestBed.inject(PromoCodeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  // ── create() ─────────────────────────────────────────────────
  describe('create()', () => {
    it('POSTs to /api/promocodes', () => {
      const dto = { code: 'SAVE20', discountType: 1, discountValue: 20, maxUses: 100, expiresAtUtc: '2026-12-31T23:59:59Z' };
      service.create(dto).subscribe(p => expect(p.code).toBe('SAVE20'));
      const req = http.expectOne('/api/promocodes');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.code).toBe('SAVE20');
      req.flush(mockPromo);
    });
  });

  // ── getMy() ───────────────────────────────────────────────────
  describe('getMy()', () => {
    it('GETs /api/promocodes/my', () => {
      service.getMy().subscribe(list => {
        expect(list.length).toBe(1);
        expect(list[0].code).toBe('SAVE20');
      });
      const req = http.expectOne('/api/promocodes/my');
      expect(req.request.method).toBe('GET');
      req.flush([mockPromo]);
    });

    it('returns empty array when no promos', () => {
      service.getMy().subscribe(list => expect(list).toEqual([]));
      http.expectOne('/api/promocodes/my').flush([]);
    });
  });

  // ── toggle() ──────────────────────────────────────────────────
  describe('toggle()', () => {
    it('PATCHes /api/promocodes/:id/toggle', () => {
      service.toggle('promo-001').subscribe(p => expect(p.isActive).toBeFalse());
      const req = http.expectOne('/api/promocodes/promo-001/toggle');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush({ ...mockPromo, isActive: false });
    });
  });

  // ── delete() ──────────────────────────────────────────────────
  describe('delete()', () => {
    it('DELETEs /api/promocodes/:id', () => {
      service.delete('promo-001').subscribe();
      const req = http.expectOne('/api/promocodes/promo-001');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // ── validate() ────────────────────────────────────────────────
  describe('validate()', () => {
    it('POSTs to /api/promocodes/validate with code and amount', () => {
      const response: ValidatePromoResponse = {
        isValid: true, message: 'Promo code applied!',
        code: 'SAVE20', discountAmount: 20, finalAmount: 480,
      };
      service.validate('SAVE20', 500).subscribe(r => {
        expect(r.isValid).toBeTrue();
        expect(r.discountAmount).toBe(20);
        expect(r.finalAmount).toBe(480);
      });
      const req = http.expectOne('/api/promocodes/validate');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.code).toBe('SAVE20');
      expect(req.request.body.bookingAmount).toBe(500);
      req.flush(response);
    });

    it('returns isValid false for invalid code', () => {
      service.validate('INVALID', 500).subscribe(r => {
        expect(r.isValid).toBeFalse();
        expect(r.discountAmount).toBe(0);
      });
      http.expectOne('/api/promocodes/validate').flush({
        isValid: false, message: 'Invalid or inactive promo code.',
        code: '', discountAmount: 0, finalAmount: 500,
      });
    });

    it('sends uppercase code', () => {
      service.validate('save20', 300).subscribe();
      const req = http.expectOne('/api/promocodes/validate');
      // service sends whatever is passed — uppercase is caller's responsibility
      expect(req.request.body.bookingAmount).toBe(300);
      req.flush({ isValid: false, code: '', discountAmount: 0, finalAmount: 300 });
    });
  });
});
