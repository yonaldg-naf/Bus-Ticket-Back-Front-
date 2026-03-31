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
// NOTE: ScheduleResponse below is a minimal version used by BookingStateService.
// The full ScheduleResponse (with amenities, isCancelledByOperator, etc.) lives
// in services/schedule.service.ts and is used by all search/display components.

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
  isCancelledByOperator?: boolean;
  cancelReason?: string;
}

// These two interfaces are duplicated in services/schedule.service.ts which has
// the up-to-date versions. These are kept only for backwards compatibility.
// Use the ones from schedule.service.ts for any new code.

// export interface CreateScheduleByKeysRequest { ... } // see schedule.service.ts
// export interface SearchSchedulesByKeysRequest { ... } // see schedule.service.ts

export interface CreateScheduleByKeysRequest {
  operatorUsername?: string;
  companyName?: string;
  busCode: string;
  routeCode: string;
  departureUtc?: string;
  departureLocal?: string;
  timeZoneId?: string;
  basePrice: number;
}

export interface SearchSchedulesByKeysRequest {
  fromCity: string;
  fromStopName?: string;
  toCity: string;
  toStopName?: string;
  date: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
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
