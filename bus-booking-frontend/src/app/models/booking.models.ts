// ─── Enums ────────────────────────────────────────────────────────────────────

export enum BookingStatus {
  Pending = 1,
  Confirmed = 2,
  Cancelled = 3,
  Refunded = 4,
}

export const BookingStatusLabels: Record<BookingStatus, string> = {
  [BookingStatus.Pending]: 'Pending',
  [BookingStatus.Confirmed]: 'Confirmed',
  [BookingStatus.Cancelled]: 'Cancelled',
  [BookingStatus.Refunded]: 'Refunded',
};

export enum PaymentStatus {
  Initiated = 1,
  Success = 2,
  Failed = 3,
  Refunded = 4,
}

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.Initiated]: 'Initiated',
  [PaymentStatus.Success]: 'Success',
  [PaymentStatus.Failed]: 'Failed',
  [PaymentStatus.Refunded]: 'Refunded',
};

// ─── Passenger ────────────────────────────────────────────────────────────────

export interface BookingPassengerDto {
  name: string;
  age?: number;
  seatNo: string;
}

// ─── Booking Models ───────────────────────────────────────────────────────────

export interface BookingResponse {
  id: string;
  userId: string;
  scheduleId: string;
  status: BookingStatus;
  totalAmount: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
  busCode: string;
  registrationNumber: string;
  routeCode: string;
  departureUtc: string;
  busStatus: number; // BusStatus enum
  passengers: BookingPassengerDto[];
}

export interface CreateBookingRequest {
  scheduleId: string;
  passengers: BookingPassengerDto[];
}

export interface CreateBookingByKeysRequest {
  busCode: string;
  departureUtc: string;
  passengers: BookingPassengerDto[];
}

export interface PayBookingRequest {
  amount: number;
  providerReference?: string;
}