import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private isInitialized = false;
  private isMuted = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadMutedState();
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', this.handleFirstInteraction.bind(this), { once: true });
    }
  }

  private async loadMutedState() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      const { value } = await Preferences.get({ key: 'audioMuted' });
      this.isMuted = value === 'true';
      if (this.isMuted) {
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('Error loading muted state:', error);
    }
  }

  private async saveMutedState() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      await Preferences.set({
        key: 'audioMuted',
        value: this.isMuted.toString()
      });
    } catch (error) {
      console.error('Error saving muted state:', error);
    }
  }

  private handleFirstInteraction() {
    if (!this.isInitialized && !this.isMuted) {
      this.initializeAudio();
      this.playAudio();
    }
  }

  private initializeAudio() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (!this.audio) {
      this.audio = new Audio('assets/audio/adventure.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.5;
      this.isInitialized = true;
    }
  }

  private playAudio() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (this.audio) {
      this.audio.play().then(() => {
        this.isPlaying = true;
      }).catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }

  async toggleMusic() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (!this.isInitialized) {
      this.initializeAudio();
    }

    if (this.audio) {
      if (this.isPlaying) {
        this.audio.pause();
        this.isMuted = true;
      } else {
        this.playAudio();
        this.isMuted = false;
      }
      this.isPlaying = !this.isPlaying;
      await this.saveMutedState();
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
} 