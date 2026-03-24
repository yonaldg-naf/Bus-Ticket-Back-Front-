import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AnnouncementService, AnnouncementResponse, CreateAnnouncementRequest } from "../../../services/announcement.service";
import { ScheduleService, ScheduleResponse } from "../../../services/schedule.service";
import { ToastService } from "../../../services/toast.service";

@Component({
  selector: "app-announcements",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/operator" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 transition-colors text-slate-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Trip Announcements</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Post notices to passengers for your schedules</p>
          </div>
        </div>
        <button (click)="showForm.set(!showForm())" class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-red-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Announcement
        </button>
      </div>
    </div>
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      @if (showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="font-bold text-slate-900 dark:text-white">Post Announcement</h2>
            <button (click)="showForm.set(false)" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Schedule *</label>
              <select [(ngModel)]="form.scheduleId" class="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <option value="">Select schedule...</option>
                @for (s of schedules(); track s.id) {
                  <option [value]="s.id">{{ s.busCode }} - {{ s.routeCode }} - {{ formatDate(s.departureUtc) }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Type *</label>
              <select [(ngModel)]="form.type" class="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <option value="Info">Info</option>
                <option value="Warning">Warning</option>
                <option value="Delay">Delay</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Message *</label>
              <textarea [(ngModel)]="form.message" rows="3" placeholder="e.g. Bus delayed by 30 minutes due to traffic. New departure at 10:30 AM."
                class="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none"></textarea>
            </div>
            <div class="sm:col-span-2 flex gap-3 pt-2">
              <button (click)="post()" [disabled]="!form.scheduleId || !form.message || saving()"
                class="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {{ saving() ? "Posting..." : "Post Announcement" }}
              </button>
              <button (click)="showForm.set(false)" class="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      }
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 class="font-bold text-slate-900 dark:text-white">My Announcements</h2>
          <span class="text-xs text-slate-400">{{ announcements().length }} total</span>
        </div>
        @if (loading()) {
          <div class="flex items-center justify-center py-16 gap-3 text-slate-400">
            <svg class="animate-spin w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading...
          </div>
        } @else if (announcements().length === 0) {
          <div class="text-center py-16 text-slate-400">
            <p class="text-4xl mb-3">📢</p>
            <p class="font-medium text-slate-500 dark:text-slate-400">No announcements yet</p>
            <p class="text-sm mt-1">Post your first announcement above</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-50 dark:divide-slate-700">
            @for (ann of announcements(); track ann.id) {
              <div class="px-6 py-4 flex items-start gap-4">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" [class]="typeBg(ann.type)">
                  {{ typeIcon(ann.type) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="font-semibold text-slate-800 dark:text-white text-sm">{{ ann.busCode }} - {{ ann.routeCode }}</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold" [class]="typeBadge(ann.type)">{{ ann.type }}</span>
                  </div>
                  <p class="text-sm text-slate-600 dark:text-slate-300 mb-1">{{ ann.message }}</p>
                  <div class="flex items-center gap-3 text-xs text-slate-400">
                    <span>Departure: {{ formatDate(ann.departureUtc) }}</span>
                    <span>Posted: {{ formatRelative(ann.createdAtUtc) }}</span>
                  </div>
                </div>
                <button (click)="remove(ann.id)" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                  Delete
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  </div>
  `,
})
export class AnnouncementsComponent implements OnInit {
  private annSvc = inject(AnnouncementService);
  private scheduleSvc = inject(ScheduleService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  announcements = signal<AnnouncementResponse[]>([]);
  schedules = signal<ScheduleResponse[]>([]);

  form: CreateAnnouncementRequest = { scheduleId: "", message: "", type: "Info" };

  ngOnInit() {
    this.annSvc.getMy().subscribe({ next: d => { this.announcements.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.scheduleSvc.getAll().subscribe({ next: d => this.schedules.set(d), error: () => {} });
  }

  post() {
    if (!this.form.scheduleId || !this.form.message) return;
    this.saving.set(true);
    this.annSvc.create(this.form).subscribe({
      next: a => { this.announcements.update(l => [a, ...l]); this.saving.set(false); this.showForm.set(false); this.toast.success("Announcement posted!"); this.form = { scheduleId: "", message: "", type: "Info" }; },
      error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? "Failed to post."); },
    });
  }

  remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    this.annSvc.delete(id).subscribe({ next: () => { this.announcements.update(l => l.filter(a => a.id !== id)); this.toast.success("Deleted."); }, error: () => this.toast.error("Failed to delete.") });
  }

  typeBg(t: string) { return t === "Warning" ? "bg-amber-50" : t === "Delay" ? "bg-blue-50" : t === "Cancelled" ? "bg-red-50" : "bg-green-50"; }
  typeIcon(t: string) { return t === "Warning" ? "⚠️" : t === "Delay" ? "🕐" : t === "Cancelled" ? "❌" : "ℹ️"; }
  typeBadge(t: string) { return t === "Warning" ? "bg-amber-100 text-amber-700" : t === "Delay" ? "bg-blue-100 text-blue-700" : t === "Cancelled" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"; }
  formatDate(utc: string) { return utc ? new Date(utc).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; }
  formatRelative(iso: string) { const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "just now" : m < 60 ? m + "m ago" : Math.floor(m/60) + "h ago"; }
}