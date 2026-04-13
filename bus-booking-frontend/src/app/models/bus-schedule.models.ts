// ─── Enums ────────────────────────────────────────────────────────────────────

export enum BusType {
  Seater = 1,
  SemiSleeper = 2,
  Sleeper = 3,
  AC = 4,
  NonAC = 5,
}

export enum BusStatus {
  Available = 1,
  UnderRepair = 2,
  NotAvailable = 3,
}

// ─── Schedule Models ──────────────────────────────────────────────────────────
// Used by BookingStateService to hold the selected schedule in the booking draft.
// Full ScheduleResponse with search/display fields lives in services/schedule.service.ts.

export interface ScheduleResponse {
  id: string;
  busId: string;
  routeId: string;
  busCode: string;
  registrationNumber: string;
  routeCode: string;
  busType: number;
  totalSeats: number;
  departureUtc: string;
  basePrice: number;
  amenities: string[];
  createdAtUtc: string;
  updatedAtUtc?: string;
  isCancelledByAdmin?: boolean;
  cancelReason?: string;
}

export interface SeatAvailabilityResponse {
  scheduleId: string;
  busCode: string;
  totalSeats: number;
  bookedSeats: string[];
  availableSeats: string[];
}

// ─── Paged Result ─────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  items: T[];
}
