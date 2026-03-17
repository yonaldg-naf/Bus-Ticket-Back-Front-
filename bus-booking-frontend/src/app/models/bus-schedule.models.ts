// ─── Enums ────────────────────────────────────────────────────────────────────

export enum BusType {
  Seater = 1,
  SemiSleeper = 2,
  Sleeper = 3,
  AC = 4,
  NonAC = 5,
}

export const BusTypeLabels: Record<BusType, string> = {
  [BusType.Seater]: 'Seater',
  [BusType.SemiSleeper]: 'Semi Sleeper',
  [BusType.Sleeper]: 'Sleeper',
  [BusType.AC]: 'AC',
  [BusType.NonAC]: 'Non-AC',
};

export enum BusStatus {
  Available = 1,
  UnderRepair = 2,
  NotAvailable = 3,
}

export const BusStatusLabels: Record<BusStatus, string> = {
  [BusStatus.Available]: 'Available',
  [BusStatus.UnderRepair]: 'Under Repair',
  [BusStatus.NotAvailable]: 'Not Available',
};

// ─── Bus Models ───────────────────────────────────────────────────────────────

export interface BusResponse {
  id: string;
  operatorId: string;
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status: BusStatus;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateBusRequest {
  operatorId: string;
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status?: BusStatus;
}

export interface CreateBusByOperatorRequest {
  operatorUsername?: string;
  companyName?: string;
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status?: BusStatus;
}

export interface UpdateBusRequest {
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status: BusStatus;
}

// ─── Schedule Models ──────────────────────────────────────────────────────────

export interface ScheduleResponse {
  id: string;
  busId: string;
  routeId: string;
  busCode: string;
  registrationNumber: string;
  routeCode: string;
  departureUtc: string;
  basePrice: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateScheduleRequest {
  busId: string;
  routeId: string;
  departureUtc: string;
  basePrice: number;
}

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

export interface UpdateScheduleRequest {
  departureUtc: string;
  basePrice: number;
}

export interface SearchSchedulesByKeysRequest {
  fromCity: string;
  fromStopName?: string;
  toCity: string;
  toStopName?: string;
  date: string; // ISO date string
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