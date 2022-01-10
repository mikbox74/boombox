import EmitterEventTarget from "@/abstracts/EmitterEventTarget";

export default abstract class AudioSource extends EmitterEventTarget {

  protected audioElement: HTMLAudioElement;

  protected audioCtx: AudioContext;

  abstract get Node(): MediaElementAudioSourceNode;

  abstract get MediaMetadata(): MediaMetadata;

  abstract playlistMessage(message: string, data?: any): void;

  protected abstract commonMediaAction(details: {
    action: string, 
    fastSeek?: boolean, 
    seekOffset?: number, 
    seekTime?: number
  }): void;

  public plugIn(): void {
    this.setMediaActions();
  }

  public plugOut(): void {
    this.resetMediaActions();
    this.resetMediaMetadata();
    this.resetMediaPlaybackState();
    this.resetMediaPositionState();
  }

  protected setMediaActions() {
    if (!('mediaSession' in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.setActionHandler('play', (d) => this.commonMediaAction(d));
      navigator.mediaSession.setActionHandler('pause', (d) => this.commonMediaAction(d));
      navigator.mediaSession.setActionHandler('stop', (d) => this.commonMediaAction(d));
      navigator.mediaSession.setActionHandler('seekbackward', (d) => this.commonMediaAction(d));
      navigator.mediaSession.setActionHandler('seekforward', (d) => this.commonMediaAction(d));
      navigator.mediaSession.setActionHandler('previoustrack', (d) => this.commonMediaAction(d));
      navigator.mediaSession.setActionHandler('nexttrack', (d) => this.commonMediaAction(d));
      navigator.mediaSession.setActionHandler('seekto', (d) => this.commonMediaAction(d));
    } catch (error) {
      console.log(`${error.message}`);
    }
  };

  protected updateMediaMetadata() {
    if (!('mediaSession' in navigator)) {
      return;
    }
    // console.log(`updateMediaMetadata!`);
    navigator.mediaSession.metadata = this.MediaMetadata;
  }

  protected updateMediaPositionState() {
    if (!('mediaSession' in navigator) || this.audioElement.readyState < 3) {
      return;
    }
    // console.log(`updateMediaPositionState!`);
    const d = this.audioElement.duration;
    navigator.mediaSession.setPositionState({
      duration: d === Infinity ? this.audioElement.currentTime : d,
      playbackRate: this.audioElement.playbackRate,
      position: this.audioElement.currentTime,
    });
  }

  protected updateMediaPlaybackState() {
    if (!('mediaSession' in navigator)) {
      return;
    }
    // console.log(`updateMediaPlaybackState!`);
    if (!this.audioElement.paused) {
      navigator.mediaSession.playbackState = 'playing';
    } else {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

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
      navigator.mediaSession.setActionHandler('seekto', () => false);
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