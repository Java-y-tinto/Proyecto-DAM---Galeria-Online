import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // en milisegundos
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  
  constructor() {}

  // Obtener el observable de notificaciones
  getNotifications() {
    return this.notifications$.asObservable();
  }

  // Mostrar notificación de error
  showError(message: string, title: string = 'Error', duration: number = 5000) {
    this.addNotification({
      type: 'error',
      title,
      message,
      duration
    });
  }

  // Mostrar notificación de éxito
  showSuccess(message: string, title: string = 'Éxito', duration: number = 3000) {
    this.addNotification({
      type: 'success',
      title,
      message,
      duration
    });
  }

  // Mostrar notificación de advertencia
  showWarning(message: string, title: string = 'Advertencia', duration: number = 4000) {
    this.addNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  // Mostrar notificación de información
  showInfo(message: string, title: string = 'Información', duration: number = 4000) {
    this.addNotification({
      type: 'info',
      title,
      message,
      duration
    });
  }

  // Agregar notificación
  private addNotification(notification: Omit<Notification, 'id'>) {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId()
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, newNotification]);

    // Auto-remover después del tiempo especificado
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, notification.duration);
    }
  }

  // Remover notificación
  removeNotification(id: string) {
    const currentNotifications = this.notifications$.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications$.next(filteredNotifications);
  }

  // Limpiar todas las notificaciones
  clearAll() {
    this.notifications$.next([]);
  }

  // Generar ID único
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}