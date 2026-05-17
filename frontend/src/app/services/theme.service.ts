import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private isDark = false;

  constructor() {
    this.initializeTheme();
  }

  get isDarkMode(): boolean {
    return this.isDark;
  }

  toggleDarkMode(): void {
    this.isDark = !this.isDark;
    document.documentElement.classList.toggle('ion-palette-dark', this.isDark);
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDark = savedTheme === 'dark';
    } else {
      this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    }
    document.documentElement.classList.toggle('ion-palette-dark', this.isDark);
  }
}
