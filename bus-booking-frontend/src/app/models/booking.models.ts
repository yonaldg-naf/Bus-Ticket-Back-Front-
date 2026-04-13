// ─── Enums ────────────────────────────────────────────────────────────────────

export enum BookingStatus {
  Pending = 1,
  Confirmed = 2,
  Cancelled = 3,
}

export const BookingStatusLabels: Record<BookingStatus, string> = {
  [BookingStatus.Pending]: 'Pending',
  [BookingStatus.Confirmed]: 'Confirmed',
  [BookingStatus.Cancelled]: 'Cancelled',
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
  busStatus: number;
  isScheduleCancelledByAdmin?: boolean;
  scheduleCancelReason?: string;
  refundAmount?: number;
  refundPercent?: number;
  refundPolicy?: string;
  passengers: BookingPassengerDto[];
}

// PayBookingRequest is defined here as the single source of truth.
// booking.service.ts re-exports it for backwards compatibility.
export interface PayBookingRequest {
  amount: number;
  providerReference?: string;
  useWallet?: boolean;
}
