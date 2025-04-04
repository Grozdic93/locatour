import {
  Component,
  OnInit,
  AfterViewInit,
  PLATFORM_ID,
  Inject,
  OnDestroy
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import {
  IonList,
  IonToggle,
  IonItem,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personCircle,
  personCircleOutline,
  sunny,
  sunnyOutline,
} from 'ionicons/icons';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [ IonList, IonToggle, IonItem, FormsModule],
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
})
export class ThemeToggleComponent implements OnInit, AfterViewInit, OnDestroy {
  paletteToggle = false;
  isBrowser: boolean;
  private themeSubscription: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private themeService: ThemeService
  ) {
    addIcons({ personCircle, personCircleOutline, sunny, sunnyOutline });
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (!this.isBrowser) return;
    
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.paletteToggle = isDark;
      this.toggleDarkPalette(isDark);
    });
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    this.toggleDarkPalette(this.paletteToggle);
  }

  async toggleChange(event: CustomEvent) {
    if (!this.isBrowser) return;
    await this.themeService.setDarkMode(event.detail.checked);
  }

  toggleDarkPalette(shouldAdd: boolean) {
    if (!this.isBrowser) return;
    this.document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
