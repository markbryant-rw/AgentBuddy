// Notification sound utility using Web Audio API
class NotificationSoundPlayer {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      // Support webkit prefix for Safari
      const AudioContextClass = window.AudioContext ||
        (typeof (window as any).webkitAudioContext !== 'undefined' ? (window as any).webkitAudioContext : undefined);

      if (!AudioContextClass) {
        throw new Error('AudioContext not supported');
      }

      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  // Play a pleasant completion sound (ascending tones)
  playCompletionSound() {
    try {
      const context = this.getAudioContext();
      const now = context.currentTime;

      // Create a series of pleasant tones
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)
      
      frequencies.forEach((freq, index) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        // Envelope
        const startTime = now + index * 0.15;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  // Play a gentle reminder sound (single tone)
  playReminderSound() {
    try {
      const context = this.getAudioContext();
      const now = context.currentTime;

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 440; // A4
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      oscillator.start(now);
      oscillator.stop(now + 0.4);
    } catch (error) {
      console.warn('Failed to play reminder sound:', error);
    }
  }
}

export const notificationSound = new NotificationSoundPlayer();

// Notification helper with sound
export const showPomodoroNotification = (
  title: string,
  body: string,
  playSound: boolean = true
) => {
  // Play sound
  if (playSound) {
    notificationSound.playCompletionSound();
  }

  // Show browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'pomodoro',
      requireInteraction: false,
      silent: !playSound, // Don't play default notification sound
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  return null;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  }
  return false;
};
