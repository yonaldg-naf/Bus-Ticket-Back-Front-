import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService, ScheduleResponse } from '../../../services/schedule.service';
import { BusService, BusResponse } from '../../../services/bus-route.service';
import { RouteService, RouteResponse } from '../../../services/bus-route.service';
import { ToastService } from '../../../services/toast.service';
