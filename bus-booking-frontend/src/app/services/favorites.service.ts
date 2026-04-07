import { Injectable, signal } from '@angular/core';

export interface FavoriteRoute {
  id: string; // fromCity|toCity
  fromCity: string;
  toCity: string;
  addedAt: string;
}

const STORAGE_KEY = 'swiftroute_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private _favorites = signal<FavoriteRoute[]>(this.load());
  readonly favorites = this._favorites.asReadonly();

  isFavorite(fromCity: string, toCity: string): boolean {
    const id = this.makeId(fromCity, toCity);
    return this._favorites().some(f => f.id === id);
  }

  toggle(fromCity: string, toCity: string): void {
    const id = this.makeId(fromCity, toCity);
    const current = this._favorites();
    if (current.some(f => f.id === id)) {
      this.save(current.filter(f => f.id !== id));
    } else {
      this.save([...current, { id, fromCity, toCity, addedAt: new Date().toISOString() }]);
    }
  }

  remove(id: string): void {
    this.save(this._favorites().filter(f => f.id !== id));
  }

  private makeId(from: string, to: string): string {
    return `${from.toLowerCase()}|${to.toLowerCase()}`;
  }

  private save(list: FavoriteRoute[]): void {
    this._favorites.set(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  }

  private load(): FavoriteRoute[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}
