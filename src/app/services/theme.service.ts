import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkMode = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.isDarkMode.asObservable();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeTheme();
  }

  private async initializeTheme() {
    if (!this.isBrowser) return;

    const prefersDark = this.isBrowser && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : { matches: false };

    const { value } = await Preferences.get({ key: 'darkMode' });
    const isDark = value !== null ? value === 'true' : prefersDark.matches;
    
    this.isDarkMode.next(isDark);

    if (this.isBrowser && prefersDark instanceof MediaQueryList) {
      prefersDark.addEventListener('change', (event: MediaQueryListEvent) => {
        if (!value) {
          this.isDarkMode.next(event.matches);
        }
      });
    }
  }

  async setDarkMode(isDark: boolean) {
    if (!this.isBrowser) return;
    
    this.isDarkMode.next(isDark);
    await Preferences.set({
      key: 'darkMode',
      value: String(isDark)
    });
  }

  getCurrentTheme(): boolean {
    return this.isDarkMode.value;
  }
} 