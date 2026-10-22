import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// Interfaz para definir una fotografía guardada en la aplicación
export interface UserPhoto {
  filepath: string;      // Ruta interna en el almacenamiento
  webviewPath?: string;  // Ruta para mostrar la imagen en la UI
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  // Lista de fotos en memoria
  public photos: UserPhoto[] = [];
  
  // Clave de almacenamiento en Preferences
  private PHOTO_STORAGE: string = 'photos_gallery';

  constructor() {}

  /**
   * Carga las fotos guardadas previamente desde Preferences y Filesystem
   */
  public async loadSaved(): Promise<void> {
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];

    // Si no estamos en plataforma nativa (estamos en navegador web)
    if (!Capacitor.isNativePlatform()) {
      for (const photo of this.photos) {
        try {
          const readFile = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data
          });

          if (typeof readFile.data === 'string') {
            photo.webviewPath = readFile.data.startsWith('data:')
              ? readFile.data
              : `data:image/jpeg;base64,${readFile.data}`;
          } else if (readFile.data instanceof Blob) {
            photo.webviewPath = URL.createObjectURL(readFile.data);
          }
        } catch (error) {
          console.warn('No se pudo cargar la imagen del almacenamiento:', photo.filepath, error);
        }
      }
    }
  }

  /**
   * Abre la cámara del dispositivo, toma la foto, la almacena y la añade a la galería
   */
  public async addNewToGallery(): Promise<void> {
    // Abrir cámara
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 90,
      saveToGallery: true // Guarda directamente en la galería del teléfono nativo
    });

    // Guardar imagen en el sistema de archivos
    const savedImageFile = await this.savePicture(capturedPhoto);

    // Añadir al inicio de la lista
    this.photos.unshift(savedImageFile);

    // Guardar en Preferences
    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });
  }

  /**
   * Guarda la foto en el directorio de la aplicación
   */
  private async savePicture(photo: Photo): Promise<UserPhoto> {
    const base64Data = await this.readAsBase64(photo);

    const fileName = `foto_${Date.now()}.jpeg`;
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if (Capacitor.isNativePlatform()) {
      // En Android o iOS
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri)
      };
    } else {
      // En Navegador Web
      return {
        filepath: fileName,
        webviewPath: photo.webPath || base64Data
      };
    }
  }

  /**
   * Lee la foto capturada y la convierte en formato Base64
   */
  private async readAsBase64(photo: Photo): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.readFile({
        path: photo.path!
      });
      return file.data as string;
    } else {
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      return (await this.convertBlobToBase64(blob)) as string;
    }
  }

  /**
   * Convierte un objeto Blob a Data URL en base64
   */
  private convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Elimina una foto seleccionada de la lista y del almacenamiento
   */
  public async deletePicture(photo: UserPhoto, position: number): Promise<void> {
    this.photos.splice(position, 1);

    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });

    const filename = photo.filepath.substring(photo.filepath.lastIndexOf('/') + 1);
    try {
      await Filesystem.deleteFile({
        path: filename,
        directory: Directory.Data
      });
    } catch (error) {
      console.warn('Error al eliminar archivo físico:', filename, error);
    }
  }
}
