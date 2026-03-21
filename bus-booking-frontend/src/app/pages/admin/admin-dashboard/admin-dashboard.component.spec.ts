import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../../services/auth.service';
import { BusService } from '../../../services/bus-route.service';
import { ScheduleService } from '../../../services/schedule.service';
import { StopService } from '../../../services/stop.service';
import { AuditLogService } from '../../../services/audit-log.service';

const mockAuth = (role = 'Admin') => ({
  currentUser: signal({ fullName: 'Test Admin', role, email: 'a@b.com' }),
  isAdmin: signal(role === 'Admin'), isOperator: signal(role === 'Operator'), isCustomer: signal(role === 'Customer'),
});

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let comp: AdminDashboardComponent;
  let busSvc: jasmine.SpyObj<BusService>;
  let schedSvc: jasmine.SpyObj<ScheduleService>;
  let stopSvc: jasmine.SpyObj<StopService>;
  let auditSvc: jasmine.SpyObj<AuditLogService>;

  beforeEach(async () => {
    busSvc   = jasmine.createSpyObj('BusService',      ['getAll']);
    schedSvc = jasmine.createSpyObj('ScheduleService', ['getAll']);
    stopSvc  = jasmine.createSpyObj('StopService',     ['getCities']);
    auditSvc = jasmine.createSpyObj('AuditLogService', ['getLogs']);

    busSvc.getAll.and.returnValue(of([{},{},{}]));
    schedSvc.getAll.and.returnValue(of([{},{}]));
    stopSvc.getCities.and.returnValue(of([{ name: 'Chennai', stopCount: 3 }, { name: 'Bangalore', stopCount: 2 }]));
    auditSvc.getLogs.and.returnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 5, totalPages: 0 }));

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService,     useValue: mockAuth() },
        { provide: BusService,      useValue: busSvc    },
        { provide: ScheduleService, useValue: schedSvc  },
        { provide: StopService,     useValue: stopSvc   },
        { provide: AuditLogService, useValue: auditSvc  },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    comp    = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(comp).toBeTruthy());
  it('shows heading', () => expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Admin'));
  it('shows full name', () => expect(fixture.nativeElement.textContent).toContain('Test Admin'));
  it('calls BusService on init',      () => expect(busSvc.getAll).toHaveBeenCalled());
  it('calls ScheduleService on init', () => expect(schedSvc.getAll).toHaveBeenCalled());
  it('calls StopService on init',     () => expect(stopSvc.getCities).toHaveBeenCalled());
  it('calls AuditLogService on init', () => expect(auditSvc.getLogs).toHaveBeenCalled());

  it('buses stat = "3"',     () => expect(comp.stats()[0].value).toBe('3'));
  it('schedules stat = "2"', () => expect(comp.stats()[1].value).toBe('2'));
  it('cities stat = "2"',    () => expect(comp.stats()[2].value).toBe('2'));
  it('stops stat = "5"',     () => expect(comp.stats()[3].value).toBe('5'));

  it('sets stat to "err" on BusService error', () => {
    busSvc.getAll.and.returnValue(throwError(() => new Error('x')));
    comp.ngOnInit();
    expect(comp.stats()[0].value).toBe('err');
  });

  it('formatRelative: just now', () => expect(comp.formatRelative(new Date(Date.now() - 20000).toISOString())).toBe('just now'));
  it('formatRelative: Xm ago',  () => expect(comp.formatRelative(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5m ago'));
  it('formatRelative: Xh ago',  () => expect(comp.formatRelative(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('3h ago'));
  it('formatRelative: Xd ago',  () => expect(comp.formatRelative(new Date(Date.now() - 2 * 86400000).toISOString())).toBe('2d ago'));
});