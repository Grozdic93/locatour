import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, mailSharp, paperPlaneOutline, paperPlaneSharp, heartOutline, heartSharp, archiveOutline, archiveSharp, trashOutline, trashSharp, warningOutline, warningSharp, bookmarkOutline, bookmarkSharp, musicalNotesOutline, musicalNotesSharp, volumeMuteOutline, volumeMuteSharp } from 'ionicons/icons';
import { ThemeToggleComponent } from "./shared/components/theme-toggle/theme-toggle.component";
import { AudioService } from './services/audio.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, ThemeToggleComponent],
})
export class AppComponent {
  public appPages = [
    { title: 'Inbox', url: '/folder/inbox', icon: 'mail' },
    { title: 'Outbox', url: '/folder/outbox', icon: 'paper-plane' },
    { title: 'Favorites', url: '/folder/favorites', icon: 'heart' },
    { title: 'Archived', url: '/folder/archived', icon: 'archive' },
    { title: 'Trash', url: '/folder/trash', icon: 'trash' },
    { title: 'Spam', url: '/folder/spam', icon: 'warning' },
  ];
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];
  
  constructor(
    private audioService: AudioService
  ) {
    addIcons({ 
      mailOutline, mailSharp, 
      paperPlaneOutline, paperPlaneSharp, 
      heartOutline, heartSharp, 
      archiveOutline, archiveSharp, 
      trashOutline, trashSharp, 
      warningOutline, warningSharp, 
      bookmarkOutline, bookmarkSharp,
      musicalNotesOutline, musicalNotesSharp,
      volumeMuteOutline, volumeMuteSharp
    });
  }

  get isMusicPlaying(): boolean {
    return this.audioService.getIsPlaying();
  }

  toggleMusic() {
    this.audioService.toggleMusic();
  }
}
