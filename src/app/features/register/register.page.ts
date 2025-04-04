import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCardHeader, IonCardTitle, IonCard, IonCardContent, IonRadioGroup, IonRadio, IonItem, IonInput, IonButton } from '@ionic/angular/standalone';
import { CompassComponent } from "../../shared/components/compass/compass.component";

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonButton, IonInput, IonItem, IonCardContent, IonCard, IonCardTitle, IonCardHeader, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, CompassComponent]
})
export class RegisterPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
