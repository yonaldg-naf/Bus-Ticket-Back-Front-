// ─── Stop Models ──────────────────────────────────────────────────────────────

export interface StopResponse {
  id: string;
  city: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface CityResponse {
  city: string;
  stopCount: number;
}

export interface StopRef {
  city: string;
  name: string;
}

// ─── Route Models ─────────────────────────────────────────────────────────────

export interface RouteStopView {
  stopId: string;
  order: number;
  arrivalOffsetMin?: number;
  departureOffsetMin?: number;
  city: string;
  name: string;
}

export interface RouteResponse {
  id: string;
  routeCode: string;
  stops: RouteStopView[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface CreateRouteRequest {
  routeCode: string;
  stops: StopRef[];
}

export interface UpdateRouteRequest {
  newRouteCode: string;
  stops: StopRef[];
}
