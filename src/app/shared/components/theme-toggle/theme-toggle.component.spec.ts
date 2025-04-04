import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { FormsModule } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Component, PLATFORM_ID } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Preferences } from '@capacitor/preferences';

describe('ThemeToggleComponent', () => {
  let component: ThemeToggleComponent;
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let document: Document;
  let mediaQueryListeners: Function[] = [];
  let preferencesSpy: any;
  let mockMatchMedia: any;

  beforeEach(async () => {
    // Create a proper spy object for Preferences
    preferencesSpy = {
      get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ value: null })),
      set: jasmine.createSpy('set').and.returnValue(Promise.resolve()),
      remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve())
    };

    // Mock Capacitor.Plugins and Preferences
    (window as any).Capacitor = {
      Plugins: {
        Preferences: preferencesSpy,
        Keyboard: {
          isPluginAvailable: () => false
        }
      }
    };

    // Mock @capacitor/preferences
    spyOn(Preferences, 'get').and.callFake(preferencesSpy.get);
    spyOn(Preferences, 'set').and.callFake(preferencesSpy.set);
    spyOn(Preferences, 'remove').and.callFake(preferencesSpy.remove);

    // Clear any existing preferences before each test
    await preferencesSpy.remove({ key: 'darkMode' });

    // Mock window.matchMedia
    mockMatchMedia = {
      matches: false,
      media: '',
      onchange: null,
      addEventListener: (event: string, listener: EventListenerOrEventListenerObject) => {
        mediaQueryListeners.push(listener as Function);
      },
      removeEventListener: jasmine.createSpy('removeEventListener'),
      dispatchEvent: jasmine.createSpy('dispatchEvent'),
      addListener: jasmine.createSpy('addListener'),
      removeListener: jasmine.createSpy('removeListener')
    } as MediaQueryList;

    spyOn(window, 'matchMedia').and.returnValue(mockMatchMedia);

    await TestBed.configureTestingModule({
      imports: [
        ThemeToggleComponent,
        IonicModule.forRoot(),
        FormsModule
      ],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggleComponent);
    component = fixture.componentInstance;
    document = TestBed.inject(DOCUMENT);
  });

  afterEach(async () => {
    mediaQueryListeners = [];
    // Clear preferences after each test
    await preferencesSpy.remove({ key: 'darkMode' });
    document.documentElement.classList.remove('ion-palette-dark');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with dark mode off by default when no system preference or saved preference exists', fakeAsync(async () => {
    preferencesSpy.get.and.returnValue(Promise.resolve({ value: null }));
    mockMatchMedia.matches = false;
    
    await component.ngOnInit();
    fixture.detectChanges();
    tick();
    
    expect(component.paletteToggle).toBeFalsy();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeFalsy();
  }));

  it('should use saved theme preference from Preferences', fakeAsync(async () => {
    preferencesSpy.get.and.returnValue(Promise.resolve({ value: 'true' }));
    mockMatchMedia.matches = false;
    
    await component.ngOnInit();
    fixture.detectChanges();
    tick();
    
    expect(component.paletteToggle).toBeTruthy();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeTruthy();
  }));

  it('should toggle dark theme when the toggle changes', fakeAsync(async () => {
    await component.ngOnInit();
    fixture.detectChanges();
    tick();

    const toggle = fixture.debugElement.query(By.css('ion-toggle'));
    expect(toggle).toBeTruthy();

    // Simulate toggle change
    await component.toggleChange({ detail: { checked: true } } as any);
    fixture.detectChanges();
    tick();
    
    expect(component.paletteToggle).toBeTruthy();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeTruthy();
    expect(preferencesSpy.set).toHaveBeenCalledWith({
      key: 'darkMode',
      value: 'true'
    });
  }));

  it('should respond to system preference changes if no saved preference exists', fakeAsync(async () => {
    preferencesSpy.get.and.returnValue(Promise.resolve({ value: null }));
    mockMatchMedia.matches = false;
    
    await component.ngOnInit();
    fixture.detectChanges();
    tick();
    
    if (mediaQueryListeners.length > 0) {
      const mockEvent = { matches: true } as MediaQueryListEvent;
      mediaQueryListeners[0](mockEvent);
      fixture.detectChanges();
      tick();
      
      expect(component.paletteToggle).toBeTruthy();
      expect(document.documentElement.classList.contains('ion-palette-dark')).toBeTruthy();
    } else {
      fail('No mediaQuery listeners registered');
    }
  }));

  it('should not respond to system preference changes if saved preference exists', fakeAsync(async () => {
    preferencesSpy.get.and.returnValue(Promise.resolve({ value: 'false' }));
    mockMatchMedia.matches = true;
    
    await component.ngOnInit();
    fixture.detectChanges();
    tick();
    
    if (mediaQueryListeners.length > 0) {
      const mockEvent = { matches: true } as MediaQueryListEvent;
      mediaQueryListeners[0](mockEvent);
      fixture.detectChanges();
      tick();
      
      // The saved preference should take precedence
      expect(component.paletteToggle).toBeFalsy();
      expect(document.documentElement.classList.contains('ion-palette-dark')).toBeFalsy();
    } else {
      fail('No mediaQuery listeners registered');
    }
  }));

  it('should not perform DOM operations when not in browser environment', () => {
    component.isBrowser = false;
    
    spyOn(component, 'toggleDarkPalette').and.callThrough();
    spyOn(document.documentElement.classList, 'toggle');
    
    component.toggleDarkPalette(true);
    
    expect(document.documentElement.classList.toggle).not.toHaveBeenCalled();
  });
});