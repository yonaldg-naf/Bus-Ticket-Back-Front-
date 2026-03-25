import { Component, inject, signal, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { ScheduleService, ScheduleResponse } from "../../../services/schedule.service";
import { BookingService } from "../../../services/booking.service";
import { ToastService } from "../../../services/toast.service";

interface PassengerRow { name: string; age?: number; seatNo: string; bookingId: string; status: string; }

@Component({
  selector: "app-passenger-manifest",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/operator" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-slate-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Passenger Manifest</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">View and print passenger list for a schedule</p>
          </div>
        </div>
        @if (passengers().length > 0) {
          <button (click)="print()" class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-red-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print Manifest
          </button>
        }
      </div>
    </div>
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Select Schedule</label>
        <select [(ngModel)]="selectedScheduleId" (ngModelChange)="loadManifest()" class="input-field max-w-md dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          <option value="">Choose a schedule...</option>
          @for (s of schedules(); track s.id) {
            <option [value]="s.id">{{ s.busCode }} - {{ s.routeCode }} - {{ formatDate(s.departureUtc) }}</option>
          }
        </select>
      </div>
      @if (loading()) {
        <div class="flex items-center justify-center py-16 gap-3 text-slate-400">
          <svg class="animate-spin w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          Loading manifest...
        </div>
      }
      @if (selectedScheduleId && !loading()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 class="font-bold text-slate-900 dark:text-white">{{ selectedSchedule()?.busCode }} - {{ selectedSchedule()?.routeCode }}</h2>
              <p class="text-xs text-slate-400 mt-0.5">{{ formatDate(selectedSchedule()?.departureUtc ?? "") }} &middot; {{ passengers().length }} passengers</p>
            </div>
            <div class="flex items-center gap-4 text-sm">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span><span class="text-slate-600 dark:text-slate-300">{{ confirmedCount() }} confirmed</span></span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span><span class="text-slate-600 dark:text-slate-300">{{ pendingCount() }} pending</span></span>
            </div>
          </div>
          @if (passengers().length === 0) {
            <div class="text-center py-16 text-slate-400"><p class="text-4xl mb-3">&#128101;</p><p class="font-medium text-slate-500">No passengers booked yet</p></div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
                  <th class="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Passenger</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Seat</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-700">
                  @for (p of passengers(); track p.seatNo; let i = $index) {
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <td class="px-6 py-3.5 text-slate-400 text-xs">{{ i + 1 }}</td>
                      <td class="px-4 py-3.5">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs flex-shrink-0">{{ (p.name || "?")[0].toUpperCase() }}</div>
                          <span class="font-medium text-slate-800 dark:text-white">{{ p.name }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3.5 text-center text-slate-600 dark:text-slate-300">{{ p.age ?? "-" }}</td>
                      <td class="px-4 py-3.5 text-center"><span class="font-mono font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded-lg text-xs">{{ p.seatNo }}</span></td>
                      <td class="px-4 py-3.5 text-center">
                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold" [class]="p.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">{{ p.status }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  </div>
  `,
})
export class PassengerManifestComponent implements OnInit {
  private scheduleSvc = inject(ScheduleService);
  private bookingSvc = inject(BookingService);
  private toast = inject(ToastService);

  loading = signal(false);
  schedules = signal<ScheduleResponse[]>([]);
  passengers = signal<PassengerRow[]>([]);
  selectedScheduleId = "";

  selectedSchedule = computed(() => this.schedules().find(s => s.id === this.selectedScheduleId));
  confirmedCount = computed(() => this.passengers().filter(p => p.status === "Confirmed").length);
  pendingCount = computed(() => this.passengers().filter(p => p.status === "Pending").length);

  ngOnInit() {
    this.scheduleSvc.getAll().subscribe({
      next: d => this.schedules.set(d),
      error: () => this.toast.error("Failed to load schedules.")
    });
  }

  loadManifest() {
    if (!this.selectedScheduleId) { this.passengers.set([]); return; }
    this.loading.set(true);
    this.passengers.set([]);
    this.bookingSvc.getBySchedule(this.selectedScheduleId).subscribe({
      next: (bookings: any[]) => {
        const rows: PassengerRow[] = [];
        for (const b of (bookings || [])) {
          // Skip cancelled (3) and refunded (4) bookings
          if (b.status === 3 || b.status === 4) continue;
          const status = b.status === 2 ? "Confirmed" : "Pending";
          const passengerList: any[] = b.passengers || b.Passengers || [];
          for (const p of passengerList) {
            rows.push({
              name: p.name || p.Name || "",
              age: p.age ?? p.Age,
              seatNo: p.seatNo || p.SeatNo || "",
              bookingId: b.id || b.Id || "",
              status
            });
          }
        }
        // Sort by seat number (handle both numeric "12" and alphanumeric "12A")
        rows.sort((a, b) => {
          const na = parseInt(a.seatNo) || 0;
          const nb = parseInt(b.seatNo) || 0;
          return na !== nb ? na - nb : a.seatNo.localeCompare(b.seatNo);
        });
        this.passengers.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error("Failed to load manifest. " + (err?.error?.message || ""));
      },
    });
  }

  print() {
    const s = this.selectedSchedule();
    if (!s) return;
    const rows = this.passengers().map((p, i) =>
      `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.age ?? "-"}</td><td>${p.seatNo}</td><td>${p.status}</td></tr>`
    ).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Manifest - ${s.busCode}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:20px;font-weight:900;color:#dc2626}p{font-size:13px;color:#64748b;margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0}td{padding:8px 12px;border-bottom:1px solid #f1f5f9}tr:hover td{background:#f8fafc}.footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center}@media print{body{padding:0}}</style></head>
    <body><h1>SwiftRoute - Passenger Manifest</h1><p>${s.busCode} | ${s.routeCode} | ${new Date(s.departureUtc).toLocaleString("en-IN")}</p><p>Total: ${this.passengers().length} passengers</p>
    <table><thead><tr><th>#</th><th>Name</th><th>Age</th><th>Seat</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">Printed from SwiftRoute - ${new Date().toLocaleString("en-IN")}</div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  }

  formatDate(utc: string) {
    return utc ? new Date(utc).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  }
}