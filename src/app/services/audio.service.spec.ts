import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AudioService } from './audio.service';
import { PLATFORM_ID } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

describe('AudioService', () => {
  let service: AudioService;
  let preferencesSpy: any;
  let audioSpy: jasmine.Spy;
  let mockAudio: any;

  beforeEach(() => {
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

    // Mock HTMLAudioElement
    mockAudio = {
      play: jasmine.createSpy('play').and.returnValue(Promise.resolve()),
      pause: jasmine.createSpy('pause'),
      loop: false,
      volume: 0
    };
    audioSpy = spyOn(window, 'Audio').and.returnValue(mockAudio);

    TestBed.configureTestingModule({
      providers: [
        AudioService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(AudioService);
  });

  afterEach(async () => {
    // Clear preferences after each test
    await preferencesSpy.remove({ key: 'audioMuted' });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize audio on first interaction', fakeAsync(() => {
    const mockEvent = new MouseEvent('click');
    document.dispatchEvent(mockEvent);
    tick();
    
    expect(audioSpy).toHaveBeenCalledWith('assets/audio/adventure.mp3');
  }));

  it('should toggle music state', fakeAsync(async () => {
    // Initial state
    expect(service.getIsPlaying()).toBeFalsy();

    // First toggle (play)
    await service.toggleMusic();
    tick();
    expect(service.getIsPlaying()).toBeTruthy();
    expect(preferencesSpy.set).toHaveBeenCalledWith({
      key: 'audioMuted',
      value: 'false'
    });

    // Second toggle (pause)
    await service.toggleMusic();
    tick();
    expect(service.getIsPlaying()).toBeFalsy();
    expect(preferencesSpy.set).toHaveBeenCalledWith({
      key: 'audioMuted',
      value: 'true'
    });
  }));

  it('should load muted state from preferences', fakeAsync(async () => {
    preferencesSpy.get.and.returnValue(Promise.resolve({ value: 'true' }));
    
    const newService = TestBed.inject(AudioService);
    tick();
    
    expect(newService.getIsPlaying()).toBeFalsy();
  }));

  it('should not initialize audio on server platform', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AudioService,
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });

    const serverService = TestBed.inject(AudioService);
    const mockEvent = new MouseEvent('click');
    document.dispatchEvent(mockEvent);
    tick();
    
    expect(audioSpy).not.toHaveBeenCalled();
  }));

  it('should handle audio play errors gracefully', fakeAsync(async () => {
    mockAudio.play.and.returnValue(Promise.reject(new Error('Playback failed')));
    
    const newService = TestBed.inject(AudioService);
    await newService.toggleMusic();
    tick();
    
    expect(newService.getIsPlaying()).toBeFalsy();
  }));
}); 