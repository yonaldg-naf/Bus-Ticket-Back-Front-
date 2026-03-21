import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuditLogsComponent } from './audit-logs.component';
import { AuditLogService, AuditLogEntry, PagedAuditLogResult } from '../../../services/audit-log.service';

const AUDIT: AuditLogEntry = {
  id: 'log-001', logType: 'Audit', action: 'POST',
  description: 'Created → /api/buses [201]',
  username: 'admin', userRole: 'Admin', entityType: 'Bus',
  statusCode: 201, durationMs: 40, isSuccess: true, createdAtUtc: new Date().toISOString(),
};
const ERROR_LOG: AuditLogEntry = {
  ...AUDIT, id: 'log-002', logType: 'Error', action: 'ERROR',
  description: 'NullRefException', detail: 'at Service.cs:42', isSuccess: false, statusCode: 500,
};
const PAGE = (items: AuditLogEntry[]): PagedAuditLogResult =>
  ({ items, totalCount: items.length, page: 1, pageSize: 25, totalPages: 1 });

describe('AuditLogsComponent', () => {
  let fixture: ComponentFixture<AuditLogsComponent>;
  let comp:    AuditLogsComponent;
  let svc:     jasmine.SpyObj<AuditLogService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj('AuditLogService', ['getLogs']);
    svc.getLogs.and.returnValue(of(PAGE([AUDIT, ERROR_LOG])));

    await TestBed.configureTestingModule({
      imports: [AuditLogsComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuditLogService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogsComponent);
    comp    = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(comp).toBeTruthy());
  it('should call getLogs on init', () => expect(svc.getLogs).toHaveBeenCalled());
  it('should populate logs signal with 2 entries', () => expect(comp.logs().length).toBe(2));
  it('should show heading', () => expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Audit'));

  it('setTab("Error") reloads with logType=Error', () => {
    svc.getLogs.and.returnValue(of(PAGE([ERROR_LOG])));
    comp.setTab('Error');
    expect(comp.activeTab()).toBe('Error');
    expect(svc.getLogs).toHaveBeenCalledWith(jasmine.objectContaining({ logType: 'Error' }));
  });

  it('setTab("all") loads without logType', () => {
    comp.setTab('all');
    expect(svc.getLogs.calls.mostRecent().args[0].logType).toBeUndefined();
  });

  it('setTab resets page to 1', () => {
    comp['currentPage'].set(5);
    comp.setTab('Audit');
    expect(comp.currentPage()).toBe(1);
  });

  it('applyFilters resets page and reloads', () => {
    comp['currentPage'].set(3);
    comp.applyFilters();
    expect(comp.currentPage()).toBe(1);
    expect(svc.getLogs).toHaveBeenCalled();
  });

  it('clearFilters empties filters and reloads', () => {
    comp.filters = { username: 'alice', entityType: 'Bus' };
    comp.clearFilters();
    expect(comp.filters).toEqual({});
  });

  it('toggleDetail expands row', () => {
    comp.toggleDetail('log-001');
    expect(comp.expandedId()).toBe('log-001');
  });

  it('toggleDetail twice collapses', () => {
    comp.toggleDetail('log-001');
    comp.toggleDetail('log-001');
    expect(comp.expandedId()).toBeNull();
  });

  it('toggleDetail switches to new id', () => {
    comp.toggleDetail('log-001');
    comp.toggleDetail('log-002');
    expect(comp.expandedId()).toBe('log-002');
  });

  it('goToPage updates currentPage', () => {
    comp['result'].set({ ...PAGE([AUDIT]), totalPages: 5, totalCount: 125, pageSize: 25 });
    comp.goToPage(3);
    expect(comp.currentPage()).toBe(3);
  });

  it('goToPage does not go below 1', () => {
    comp['result'].set({ ...PAGE([AUDIT]), totalPages: 5, totalCount: 125, pageSize: 25 });
    comp.goToPage(0);
    expect(comp.currentPage()).toBe(1);
  });

  it('loading becomes false on error', () => {
    svc.getLogs.and.returnValue(throwError(() => new Error('fail')));
    comp.loadLogs();
    expect(comp.loading()).toBeFalse();
  });

  it('summaryCards counts errors correctly', () => {
    const card = comp.summaryCards().find(c => c.label === 'Error Logs');
    expect(card?.value).toBe(1);
  });

  it('summaryCards counts failed actions', () => {
    const card = comp.summaryCards().find(c => c.label === 'Failed Actions');
    expect(card?.value).toBe(1);
  });

  it('formatTime returns non-empty string', () => {
    expect(comp.formatTime(new Date().toISOString()).length).toBeGreaterThan(0);
  });
});