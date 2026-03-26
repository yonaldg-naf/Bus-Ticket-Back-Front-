// ─── Enums ────────────────────────────────────────────────────────────────────

export enum BookingStatus {
  Pending = 1,
  Confirmed = 2,
  Cancelled = 3,
  Refunded = 4,
  OperatorCancelled = 5,
  BusMissed = 6,
}

export const BookingStatusLabels: Record<BookingStatus, string> = {
  [BookingStatus.Pending]: 'Pending',
  [BookingStatus.Confirmed]: 'Confirmed',
  [BookingStatus.Cancelled]: 'Cancelled',
  [BookingStatus.Refunded]: 'Refunded',
  [BookingStatus.OperatorCancelled]: 'Cancelled by operator',
  [BookingStatus.BusMissed]: 'Bus Missed',
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
  promoCode?: string;
  discountAmount: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
  busCode: string;
  registrationNumber: string;
  routeCode: string;
  departureUtc: string;
  busStatus: number;
  isScheduleCancelledByOperator?: boolean;
  scheduleCancelReason?: string;
  refundAmount?: number;
  refundPercent?: number;
  refundPolicy?: string;
  passengers: BookingPassengerDto[];
}

export interface PayBookingRequest {
  amount: number;
  providerReference?: string;
}
