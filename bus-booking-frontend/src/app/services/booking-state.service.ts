import { Injectable, signal } from '@angular/core';
import { ScheduleResponse } from '../models/bus-schedule.models';
import { BookingPassengerDto } from '../models/booking.models';

export interface BookingDraft {
  schedule: ScheduleResponse;
  selectedSeats: string[];
  passengers: BookingPassengerDto[];
  promoCode?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingStateService {
  private _draft = signal<BookingDraft | null>(null);
  readonly draft = this._draft.asReadonly();

  setSchedule(schedule: ScheduleResponse): void {
    this._draft.set({ schedule, selectedSeats: [], passengers: [] });
  }

  setSeats(seats: string[]): void {
    this._draft.update(d => d ? { ...d, selectedSeats: seats } : null);
  }

  setPassengers(passengers: BookingPassengerDto[]): void {
    this._draft.update(d => d ? { ...d, passengers } : null);
  }

  clear(): void {
    this._draft.set(null);
  }
}