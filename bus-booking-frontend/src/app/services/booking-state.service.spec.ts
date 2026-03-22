import { TestBed } from '@angular/core/testing';
import { BookingStateService } from './booking-state.service';
import { ScheduleResponse } from './schedule.service';

const mockSchedule: ScheduleResponse = {
  id: 'sched-001',
  busId: 'bus-001',
  routeId: 'route-001',
  busCode: 'BUS-01',
  registrationNumber: 'TN01AB1234',
  routeCode: 'CHN-BLR',
  busType: 1,
  totalSeats: 40,
  departureUtc: '2025-06-01T08:00:00Z',
  basePrice: 500,
  createdAtUtc: '2025-01-01T00:00:00Z',
};

describe('BookingStateService', () => {
  let service: BookingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BookingStateService] });
    service = TestBed.inject(BookingStateService);
  });

  it('should be created', () => expect(service).toBeTruthy());

  // ── Initial state ─────────────────────────────────────────────
  describe('initial state', () => {
    it('draft() is null on init', () => expect(service.draft()).toBeNull());
  });

  // ── setSchedule() ─────────────────────────────────────────────
  describe('setSchedule()', () => {
    it('creates a draft with the schedule', () => {
      service.setSchedule(mockSchedule as any);
      expect(service.draft()).not.toBeNull();
      expect(service.draft()?.schedule.busCode).toBe('BUS-01');
    });

    it('initialises selectedSeats as empty array', () => {
      service.setSchedule(mockSchedule as any);
      expect(service.draft()?.selectedSeats).toEqual([]);
    });

    it('initialises passengers as empty array', () => {
      service.setSchedule(mockSchedule as any);
      expect(service.draft()?.passengers).toEqual([]);
    });
  });

  // ── setSeats() ────────────────────────────────────────────────
  describe('setSeats()', () => {
    beforeEach(() => service.setSchedule(mockSchedule as any));

    it('stores selected seats in draft', () => {
      service.setSeats(['1A', '2B', '3C']);
      expect(service.draft()?.selectedSeats).toEqual(['1A', '2B', '3C']);
    });

    it('replaces previous seat selection', () => {
      service.setSeats(['1A']);
      service.setSeats(['5B', '6C']);
      expect(service.draft()?.selectedSeats).toEqual(['5B', '6C']);
    });

    it('keeps schedule intact after setting seats', () => {
      service.setSeats(['1A']);
      expect(service.draft()?.schedule.busCode).toBe('BUS-01');
    });
  });

  // ── setPassengers() ───────────────────────────────────────────
  describe('setPassengers()', () => {
    beforeEach(() => {
      service.setSchedule(mockSchedule as any);
      service.setSeats(['1A', '2B']);
    });

    it('stores passengers in draft', () => {
      const passengers = [
        { name: 'Alice', seatNo: '1A' },
        { name: 'Bob', age: 30, seatNo: '2B' },
      ];
      service.setPassengers(passengers);
      expect(service.draft()?.passengers.length).toBe(2);
      expect(service.draft()?.passengers[0].name).toBe('Alice');
      expect(service.draft()?.passengers[1].age).toBe(30);
    });

    it('keeps seats intact after setting passengers', () => {
      service.setPassengers([{ name: 'Alice', seatNo: '1A' }]);
      expect(service.draft()?.selectedSeats).toEqual(['1A', '2B']);
    });
  });

  // ── clear() ───────────────────────────────────────────────────
  describe('clear()', () => {
    it('resets draft to null', () => {
      service.setSchedule(mockSchedule as any);
      service.setSeats(['1A']);
      service.clear();
      expect(service.draft()).toBeNull();
    });

    it('draft remains null after multiple clears', () => {
      service.clear();
      service.clear();
      expect(service.draft()).toBeNull();
    });
  });

  // ── Full flow ─────────────────────────────────────────────────
  describe('full booking flow', () => {
    it('builds draft correctly through all steps', () => {
      service.setSchedule(mockSchedule as any);
      service.setSeats(['1A', '2B']);
      service.setPassengers([
        { name: 'Alice', seatNo: '1A' },
        { name: 'Bob', seatNo: '2B' },
      ]);
      const draft = service.draft()!;
      expect(draft.schedule.busCode).toBe('BUS-01');
      expect(draft.selectedSeats).toEqual(['1A', '2B']);
      expect(draft.passengers[0].name).toBe('Alice');
      expect(draft.passengers[1].name).toBe('Bob');
    });
  });
});