import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonFab,
  IonFabButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonButton,
  IonButtons,
  IonText,
  IonBadge,
  AlertController,
  ActionSheetController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, trash, trashOutline, cameraOutline, imageOutline, images, close } from 'ionicons/icons';
import { PhotoService, UserPhoto } from '../services/photo.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonImg,
    IonFab,
    IonFabButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonButton,
    IonButtons,
    IonText,
    IonBadge
  ],
})
export class HomePage implements OnInit {
  public photoService = inject(PhotoService);
  private alertController = inject(AlertController);
  private actionSheetController = inject(ActionSheetController);

  constructor() {
    // Registrar iconos de Ionicons para su renderizado
    addIcons({ camera, trash, trashOutline, cameraOutline, imageOutline, images, close });
  }

  async ngOnInit() {
    // Cargar fotos almacenadas al iniciar el componente
    await this.photoService.loadSaved();
  }

  /**
   * Ejecuta la captura de una fotografía
   */
  async takePhoto() {
    try {
      await this.photoService.addNewToGallery();
    } catch (error) {
      console.log('Captura cancelada o finalizada:', error);
    }
  }

  /**
   * Muestra un menú de opciones emergente al hacer clic sobre una foto
   */
  async showOptions(photo: UserPhoto, position: number) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Opciones de Fotografía',
      buttons: [
        {
          text: 'Eliminar Foto',
          role: 'destructive',
          icon: 'trash',
          handler: () => {
            this.confirmDelete(photo, position);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  /**
   * Solicita confirmación antes de eliminar una foto
   */
  async confirmDelete(photo: UserPhoto, position: number) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas eliminar esta foto de la galería?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.photoService.deletePicture(photo, position);
          }
        }
      ]
    });

    await alert.present();
  }
}
