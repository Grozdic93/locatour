import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCard, IonCardContent, IonItem, IonInput, IonButton, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';
import { CompassComponent } from "../../shared/components/compass/compass.component";

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['../register/register.page.scss'],
  standalone: true,
  imports: [IonTitle, IonToolbar, IonHeader, IonButton, IonInput, IonItem, IonCardContent, IonCard, IonContent, CommonModule, FormsModule, CompassComponent]
})
export class LoginPage implements OnInit {
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio('assets/audio/adventure.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.5;
  }

  ngOnInit() {
    // Start playing audio when the page loads
    this.playAudio();
  }

  private async playAudio() {
    try {
      await this.audio.play();
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }

  ngOnDestroy() {
    // Stop and clean up audio when leaving the page
    this.audio.pause();
    this.audio.currentTime = 0;
  }
}
