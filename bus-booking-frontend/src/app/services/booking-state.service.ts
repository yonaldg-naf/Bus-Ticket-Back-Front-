import { Injectable, signal } from '@angular/core';
import { ScheduleResponse } from '../models/bus-schedule.models';
import { BookingPassengerDto } from '../models/booking.models';

export interface BookingDraft {
  schedule: ScheduleResponse;
  selectedSeats: string[];
  passengers: BookingPassengerDto[];
  promoCode?: string;
  pendingBookingId?: string;
}

const STORAGE_KEY = 'booking_draft';

@Injectable({ providedIn: 'root' })
export class BookingStateService {
  private _draft = signal<BookingDraft | null>(this.loadFromStorage());
  readonly draft = this._draft.asReadonly();

  setSchedule(schedule: ScheduleResponse): void {
    this.update({ schedule, selectedSeats: [], passengers: [] });
  }

  setSeats(seats: string[]): void {
    const d = this._draft();
    if (d) this.update({ ...d, selectedSeats: seats });
  }

  setPassengers(passengers: BookingPassengerDto[]): void {
    const d = this._draft();
    if (d) this.update({ ...d, passengers });
  }

  setPromoCode(promoCode: string | undefined): void {
    const d = this._draft();
    if (d) this.update({ ...d, promoCode });
  }

  setPendingBookingId(bookingId: string): void {
    const d = this._draft();
    if (d) this.update({ ...d, pendingBookingId: bookingId });
  }

  clear(): void {
    this._draft.set(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }

  private update(draft: BookingDraft): void {
    this._draft.set(draft);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {}
  }

  private loadFromStorage(): BookingDraft | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BookingDraft) : null;
    } catch {
      return null;
    }
  }
}
