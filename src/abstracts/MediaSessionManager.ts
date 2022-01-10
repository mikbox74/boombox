export default abstract class MediaSessionManager {
  
  protected audioElement: HTMLAudioElement;
  
  protected resetMediaActions() {
    if (!('mediaSession' in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.setActionHandler('pause', () => false);
      navigator.mediaSession.setActionHandler('stop', () => false);
      navigator.mediaSession.setActionHandler('seekbackward', () => false);
      navigator.mediaSession.setActionHandler('seekforward', () => false);
      navigator.mediaSession.setActionHandler('previoustrack', () => false);
      navigator.mediaSession.setActionHandler('nexttrack', () => false);
    } catch (error) {
      console.log(`${error.message}`);
    }
  }

  protected resetMediaPositionState() {
    if (!('mediaSession' in navigator) || this.audioElement.readyState !== 4) {
      return;
    }
    navigator.mediaSession.setPositionState({});
  }

  protected resetMediaMetadata() {
    if (!('mediaSession' in navigator)) {
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({});
  }

  protected resetMediaPlaybackState() {
    navigator.mediaSession.playbackState = 'none';
  }

}