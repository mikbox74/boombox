import Device from "./Device";
import Deck from "./Deck";
import Receiver from "./Receiver";
import Amplifier from "./Amplifier";
import Equalizer from "./Equalizer";
import Analyser from "./Analyser";
import {DeckStates} from "@/types/DeckStates";
import {DeckMode} from "@/types/DeckMode";
import Sec2time from "@/functions/Sec2time";
import PlaylistStation from "@/interfaces/PlaylistStation";
import UiSounds from "./UiSounds";

declare global {
  interface Window {
    showOpenFilePicker: any;
    webkitAudioContext: any;
    showDirectoryPicker: any;
    netscape: any;
    chrome: any;
  }
}
interface BoomboxKeys {
  load?: string,
  stop?: string,
  loadStop?: string,
  play: string,
  pause: string,
  previous?: string,
  next?: string,
  autostart?: string,
  repeatTrackMode?: string,
  repeatDirMode?: string,
  repeatAllMode?: string,
  nextDirectory?: string,
  previousDirectory?: string,
}
interface BoomboxEqualBand {
  selector: string,
  frequency: number,
  q: number,
  type: BiquadFilterType,
}
interface BoomboxTrack {
  bar: string,
  head: string,
  mark?: string,
}
interface BoomboxInfo {
  function?: string,
  data?: string,
  name?: string,
  duration?: string,
  path?: string,
}
interface BoomboxClasses {
  barTransition?: string,
  pressedKey?: string,
  activeItem?: string,
  failedItem?: string,
}
interface BoomboxCodecs {
  selector: string
}
interface BoomboxAnalyser {
  offset: number,
  maxOpacity?: string,
  minOpacity?: string,
  leds: BoomboxAnalyserLED[],
}
interface BoomboxAnalyserLED {
  selector: string,
  thereshold: string|number,
}
interface BoomboxPlaylist {
  selector: string,
  trackHTML: string,
  directoryHTML: string,
  nameFormat: (tagInfo: any) => string,
}
interface IBoombox {
  unsupported: string,
  keys: BoomboxKeys, 
  equalizer?: BoomboxEqualBand[], 
  track?: BoomboxTrack,
  info?: BoomboxInfo,
  volume?: string,
  balance?: string,
  classes?: BoomboxClasses,
  analyser?: BoomboxAnalyser,
  codecs?: BoomboxCodecs,
  playlist?: BoomboxPlaylist,
  function?: {tape: string, radio: string, aux: string},
  bassdrivers?: {
    left?: string, 
    right?: string,
    reset: [string, string],
    levels: [number, string, string][],
  },
  cassetteDeckCase?: {
    selector: string,
    openClass?: string,
    workingClass?: string,
    loadedClass?: string,
    tapeLeft?: string,
    tapeRight?: string,
    minTapeWidth?: number,
    maxTapeWidth?: number,
    // reelLeft?: string,
    // maxReelSpeed?: number,
    // minReelSpeed?: number,
  },
  indicators?: {
    onClass: string,
    stereo?: string,
    autostart?: string,
    repeatAll?: string,
    repeatDir?: string,
    repeatTrack?: string,
  },
  radio?: {
    prevButton: string,
    nextButton: string,
    scaleRangeInput?: string,
    wheelOver?: string,
    info?: string,
    playlist?: string,
    stationHTML?: string,
    updateButton?: string,
    form?: string,
  },
  sounds?: {
    tuning?: string;
    play?: string;
    stop?: string;
    pauseOn?: string;
    pauseOff?: string;
    cassetteEject?: string;
    cassetteLoad?: string;
    otherKeys?: string;
    buttons?: string;
  }
}
interface Boombox extends IBoombox {}

class Boombox {

  protected device: Device;

  protected uiStateTimeout: any;

  protected uiState: any = {};

  constructor(options: IBoombox) {

    Object.assign(this, options);

    this.loadUiState();
    this.initDevice();
    this.bindErrors();
    this.bindDeckCase();
    this.bindKeys();
    this.bindProgressbar();
    this.bindTrackInfo();
    this.bindPlaybackInfo();
    this.bindAmplifierControls();
    this.bindEqualizerControls();
    this.bindAnalyser();
    this.bindCodecsInfo();
    this.bindPlaylist();
    this.bindFunctionSwitcher();
    this.bindRadioControls();
    this.bindUiSounds();

    document.querySelectorAll(`[data-open]`).forEach(node => {
      const block: HTMLElement = document.querySelector(node.getAttribute('data-open'));
      node.addEventListener('click', () => {
        block.style.setProperty('visibility', 'visible');
        block.dispatchEvent(new CustomEvent('dialog.open', {}));
      });
    });
    document.querySelectorAll(`[data-close]`).forEach(node => {
      const block: HTMLElement = document.querySelector(node.getAttribute('data-close'));
      node.addEventListener('click', () => {
        block.style.setProperty('visibility', 'hidden');
        block.dispatchEvent(new CustomEvent('dialog.close', {}));
      });
    });

  }

  protected loadUiState() {
    try {
      this.uiState = JSON.parse(localStorage.getItem('BoomboxState'));
    } catch {}
    if (!this.uiState) {
      this.uiState = {};
    }
  }

  protected saveUiState() {
    clearTimeout(this.uiStateTimeout);
    this.uiStateTimeout = setTimeout(() => {
      localStorage.setItem('BoomboxState', JSON.stringify(this.uiState));
    }, 1000);
  }

  protected setUiStateItem(key: string, value: string) {
    this.uiState[key] = value;
    this.saveUiState();
  }

  protected bindUiSounds() {
    if (!this.sounds) {
      return;
    }
    if (this.sounds.tuning) {
      UiSounds.create('tuning', this.sounds.tuning, true);
      this.device.on('plugin-radio', () => UiSounds.play('tuning'));
      this.device.on('radio.loadstart', () => {
        if (this.device.ActiveSourceName === 'radio') {
          UiSounds.play('tuning');
        }
      });
      this.device.on('radio.play', () => UiSounds.stop('tuning'));
      this.device.on('plugout-radio', () => UiSounds.stop('tuning'));
    }
    const deck = this.device.getSource('deck') as Deck;
    if (this.sounds.play) {
      UiSounds.create('play', this.sounds.play);
      document.querySelector(this.keys.play).addEventListener('mousedown', () => {
        if (deck.State !== DeckStates.playing) {
          UiSounds.play('play');
        }
      });
    }
    if (this.sounds.stop) {
      UiSounds.create('stop', this.sounds.stop);
      if (this.keys.stop) {
        document.querySelector(this.keys.stop).addEventListener('mousedown', () => {
          if (deck.State !== DeckStates.stopped) {
            UiSounds.play('stop');
          }
        });
      }
      if (this.keys.loadStop) {
        document.querySelector(this.keys.loadStop).addEventListener('mousedown', () => {
          if (deck.State !== DeckStates.stopped) {
            UiSounds.play('stop');
          }
        });
      }
    }
    if (this.sounds.pauseOn) {
      UiSounds.create('pauseOn', this.sounds.pauseOn);
      document.querySelector(this.keys.pause).addEventListener('mousedown', () => {
        if (deck.State === DeckStates.playing) {
          UiSounds.play('pauseOn');
        }
      });
    }
    if (this.sounds.pauseOff) {
      UiSounds.create('pauseOff', this.sounds.pauseOff);
      document.querySelector(this.keys.pause).addEventListener('mousedown', () => {
        if (deck.State === DeckStates.paused) {
          UiSounds.play('pauseOff');
        }
      });
    }
    if (this.sounds.cassetteEject) {
      UiSounds.create('cassetteEject', this.sounds.cassetteEject);
      if (this.keys.load) {
        document.querySelector(this.keys.load).addEventListener('mousedown', () => {
          UiSounds.play('cassetteEject');
        });
      }
      if (this.keys.loadStop) {
        document.querySelector(this.keys.loadStop).addEventListener('mousedown', () => {
          if (deck.State === DeckStates.stopped) {
            UiSounds.play('cassetteEject');
          }
        });
      }
    }
    if (this.sounds.cassetteLoad) {
      UiSounds.create('cassetteLoad', this.sounds.cassetteLoad);
      this.device.on('deck.loaded', () => {
        UiSounds.play('cassetteLoad');
      });
      this.device.on('deck.cancel', () => {
        UiSounds.play('cassetteLoad');
      });
    }
    if (this.sounds.otherKeys) {
      UiSounds.create('otherKeys', this.sounds.otherKeys);
      if (this.keys.next) {
        document.querySelector(this.keys.next)
          .addEventListener('mousedown', () => {
            UiSounds.play('otherKeys');
          });
      }
      if (this.keys.nextDirectory) {
        document.querySelector(this.keys.nextDirectory)
          .addEventListener('mousedown', () => {
            UiSounds.play('otherKeys');
          });
      }
      if (this.keys.previous) {
        document.querySelector(this.keys.previous)
          .addEventListener('mousedown', () => {
            UiSounds.play('otherKeys');
          });
      }
      if (this.keys.previousDirectory) {
        document.querySelector(this.keys.previousDirectory)
          .addEventListener('mousedown', () => {
            UiSounds.play('otherKeys');
          });
      }
    }
    if (this.sounds.buttons) {
      UiSounds.create('buttons', this.sounds.buttons);
      if (this.keys.autostart) {
        document.querySelector(this.keys.autostart)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
      }
      if (this.keys.repeatTrackMode) {
        document.querySelector(this.keys.repeatTrackMode)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
      }
      if (this.keys.repeatDirMode) {
        document.querySelector(this.keys.repeatDirMode)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
      }
      if (this.keys.repeatDirMode) {
        document.querySelector(this.keys.repeatDirMode)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
      }
      if (this.keys.repeatAllMode) {
        document.querySelector(this.keys.repeatAllMode)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
      }
      if (this.function) {
        document.querySelector(this.function.tape)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
        document.querySelector(this.function.radio)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
        document.querySelector(this.function.aux)
          .addEventListener('mousedown', () => {
            UiSounds.play('buttons');
          });
      }
    }
  }

  protected initDevice() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      (document.querySelector(this.unsupported) as HTMLElement).style.visibility = 'visible';
    }

    const context = new (window.AudioContext || window.webkitAudioContext)();

    const defaultSourseName = this.uiState['defaultSourseName'] ?? 'deck';
    this.device = new Device([
      ['deck', new Deck(context)], 
      ['radio', new Receiver(context)], 
      // ['aux', new Aux(context)],
    ], [
      ['analyser', new Analyser(context)],
      ['amplifier', new Amplifier(context)], 
      ['equalizer', new Equalizer(context, {bands: this.equalizer})],
    ], defaultSourseName);

    this.device.on('radio.loaded', () => {
      const radio = this.device.getSource('radio') as Receiver;
      let pos = 0;
      if(typeof this.uiState['radioStationId'] !== 'undefined') {
        pos = radio.Playlist.getPositionById(this.uiState['radioStationId']);
      }
      if (this.device.ActiveSourceName === 'radio') {
        radio.playFromPosition(pos);
      } else {
        radio.Playlist.Position = pos;
      }
    }, {once: true});

    const deck = this.device.getSource('deck') as Deck;
    deck.autoplay = !!this.uiState.autoplay;
  }

  protected bindDeckCase() {
    if (!this.cassetteDeckCase) {
      return ;
    }
    const element: HTMLElement = document.querySelector(this.cassetteDeckCase.selector);
    if (this.cassetteDeckCase.openClass) {
      this.device.on('deck.open', () => {
        element.classList.add(this.cassetteDeckCase.openClass);
      });
      this.device.on('deck.loaded', () => {
        element.classList.remove(this.cassetteDeckCase.openClass);
      });
      this.device.on('deck.notpicked', () => {
        element.classList.remove(this.cassetteDeckCase.openClass);
      });
      this.device.on('deck.cancel', () => {
        element.classList.remove(this.cassetteDeckCase.openClass);
      });
      this.device.on('deck.closedbyfallback', () => {
        element.classList.remove(this.cassetteDeckCase.openClass);
      });
    }
    if (this.cassetteDeckCase.loadedClass) {
      this.device.on('deck.loaded', () => {
        element.classList.add(this.cassetteDeckCase.loadedClass);
      });
    }
    if (this.cassetteDeckCase.workingClass) {
      this.device.on('deck.play', () => {
        element.classList.add(this.cassetteDeckCase.workingClass);
      });
      this.device.on('deck.pause-off', () => {
        element.classList.add(this.cassetteDeckCase.workingClass);
      });
      this.device.on('deck.pause-on', () => {
        element.classList.remove(this.cassetteDeckCase.workingClass);
      });
      this.device.on('deck.stop', () => {
        element.classList.remove(this.cassetteDeckCase.workingClass);
      });
    }
    if (!this.cassetteDeckCase.tapeLeft && !this.cassetteDeckCase.tapeRight) {
      return;
    }
    let trackDuration = 0;
    let tapeLeftElement: HTMLElement;
    let tapeRightElement: HTMLElement;
    let leftTapeWidth = this.cassetteDeckCase.maxTapeWidth;
    let rightTapeWidth = this.cassetteDeckCase.minTapeWidth;
    let diffWidth = leftTapeWidth - rightTapeWidth;

    const deck = this.device.getSource('deck') as Deck;

    if (this.cassetteDeckCase.tapeLeft) {
      tapeLeftElement = document.querySelector(this.cassetteDeckCase.tapeLeft);
    }
    if (this.cassetteDeckCase.tapeRight) {
      tapeRightElement = document.querySelector(this.cassetteDeckCase.tapeRight);
    }
    const resetTapeWidth = () => {
      trackDuration = deck.Track.duration;
      if (tapeLeftElement) {
        tapeLeftElement.style.setProperty('width', `${leftTapeWidth}px`);
      }
      if (tapeRightElement) {
        tapeRightElement.style.setProperty('width', `${rightTapeWidth}px`);
      }
    }
    this.device.on('deck.loadeddata', () => {
      requestAnimationFrame(resetTapeWidth);
    });
    const recalcTapeWidth = (time: number) => {
      let incrW = diffWidth*time/trackDuration;
      let leftWidth = leftTapeWidth - incrW;
      if (tapeLeftElement && (leftWidth >= this.cassetteDeckCase.minTapeWidth)) {
        tapeLeftElement.style.setProperty('width', `${leftWidth}px`);
      }
      let rightWidth = rightTapeWidth + incrW;
      if (tapeRightElement && (rightWidth <= this.cassetteDeckCase.maxTapeWidth)) {
        tapeRightElement.style.setProperty('width', `${rightTapeWidth + incrW}px`);
      }
    }
    this.device.on('deck.timeupdate', (event:CustomEvent) => {
      requestAnimationFrame(() => recalcTapeWidth(event.detail.time));
    });

    // let reelLeftElement: HTMLElement;
    // let maxReelSpeed = this.cassetteDeckCase.maxReelSpeed;
    // let minReelSpeed = this.cassetteDeckCase.minReelSpeed;
    // let diffSpeed = maxReelSpeed - minReelSpeed;
    // if (this.cassetteDeckCase.reelLeft) {
    //   reelLeftElement = document.querySelector(this.cassetteDeckCase.reelLeft);
    // }
    // this.device.on('deck.loadeddata', () => {
    //   if (reelLeftElement) {
    //     reelLeftElement.style.setProperty('animation-duration', `${minReelSpeed}s`);
    //   }
    // });
    // this.device.on('deck.timeupdate', (event:CustomEvent) => {
    //   let incrS = diffSpeed*event.detail.time/trackDuration;
    //   if (reelLeftElement) {
    //     reelLeftElement.style.setProperty(
    //       'animation-duration', `${minReelSpeed + incrS}s`
    //     );
    //   }
    // });
  }

  protected bindKeys() {
    const deck = this.device.getSource('deck') as Deck;

    this.key(this.keys.play, (e:any) => {
      if (deck.State === DeckStates.stopped) {
        return deck.play();
      }
      if (deck.State === DeckStates.paused) {
        return deck.pause();
      }
    }, ['deck.play'], ['deck.stop']);

    this.key(this.keys.stop, {
      click: (e: any) => {
        if (deck.State !== DeckStates.stopped) {
          deck.stop();
        }
      },
      mousedown: (e:any) => e.target.classList.add(this.classes.pressedKey),
      mouseup: (e:any) => e.target.classList.remove(this.classes.pressedKey),
    });

    this.key(this.keys.loadStop, {
      click: (e:any) => {
        if (deck.State === DeckStates.stopped) {
          if (this.cassetteDeckCase && this.cassetteDeckCase.openClass) {
            const el: HTMLElement = document.querySelector(this.cassetteDeckCase.selector);
            el.addEventListener('transitionend', () => {
              deck.load(true);
            }, {once: true});
            el.classList.add(this.cassetteDeckCase.openClass);
            return ;
          }
          deck.load(true);
        } else {
          deck.stop();
        }
      },
      contextmenu: (e:any) => {
        if (deck.State === DeckStates.stopped) {
          deck.load();
        }
      },
      mousedown: (e:any) => e.target.classList.add(this.classes.pressedKey),
      mouseup: (e:any) => e.target.classList.remove(this.classes.pressedKey),
    }, [], ['deck.loaded', 'deck.cancel', 'deck.notpicked']);

    this.key(this.keys.load, {
      click: (e:any) => deck.load(),
      contextmenu: (e:any) => deck.load(true),
      mousedown: (e:any) => e.target.classList.add(this.classes.pressedKey),
      mouseup: (e:any) => e.target.classList.remove(this.classes.pressedKey),
    }, [], ['deck.loaded', 'deck.cancel', 'deck.notpicked']);

    this.key(this.keys.pause, (e:any) => {
      deck.pause();
    }, ['deck.pause-on'], ['deck.pause-off', 'deck.stop', 'deck.play']);

    this.key(this.keys.previous, {
      click: (e:any) => deck.previous(),
      mousedown: (e:any) => e.target.classList.add(this.classes.pressedKey),
      mouseup: (e:any) => e.target.classList.remove(this.classes.pressedKey),
    });

    this.key(this.keys.next, {
      click: (e:any) => deck.next(),
      mousedown: (e:any) => e.target.classList.add(this.classes.pressedKey),
      mouseup: (e:any) => e.target.classList.remove(this.classes.pressedKey),
    });

    this.key(this.keys.previousDirectory, {
      click: (e:any) => deck.previousDirectory(),
      mousedown: (e:any) => e.target.classList.add(this.classes.pressedKey),
      mouseup: (e:any) => e.target.classList.remove(this.classes.pressedKey),
    });

    this.key(this.keys.nextDirectory, {
      click: (e:any) => deck.nextDirectory(),
      mousedown: (e:any) => e.target.classList.add(this.classes.pressedKey),
      mouseup: (e:any) => e.target.classList.remove(this.classes.pressedKey),
    });

    // this.key(this.keys.record, (e:any) => {
    //   deck.record();
    // });

    let repeatAllIndicator: HTMLElement;
    let repeatDirIndicator: HTMLElement;
    let repeatTrkIndicator: HTMLElement;
    let autostartIndicator: HTMLElement;
    if (this.indicators) {
      if (this.indicators.repeatAll) {
        repeatAllIndicator = document.querySelector(this.indicators.repeatAll);
      }
      if (this.indicators.repeatDir) {
        repeatDirIndicator = document.querySelector(this.indicators.repeatDir);
      }
      if (this.indicators.repeatTrack) {
        repeatTrkIndicator = document.querySelector(this.indicators.repeatTrack);
      }
      if (this.indicators.autostart) {
        autostartIndicator = document.querySelector(this.indicators.autostart);
      }
    }

    const removePressedClassFromRepeatButtons = () => {
      if (!this.classes || !this.classes.pressedKey) {
        return;
      }
      if (this.keys.repeatAllMode) {
        document
          .querySelector(this.keys.repeatAllMode)
          .classList.remove(this.classes.pressedKey);
      }
      if (this.keys.repeatDirMode) {
        document
          .querySelector(this.keys.repeatDirMode)
          .classList.remove(this.classes.pressedKey);
      }
      if (this.keys.repeatTrackMode) {
        document
          .querySelector(this.keys.repeatTrackMode)
          .classList.remove(this.classes.pressedKey);
      }
    }

    const removeOnClassFromRepeatLeds = () => {
      if (repeatAllIndicator) {
        repeatAllIndicator.classList.remove(this.indicators.onClass);
      }
      if (repeatDirIndicator) {
        repeatDirIndicator.classList.remove(this.indicators.onClass);
      }
      if (repeatTrkIndicator) {
        repeatTrkIndicator.classList.remove(this.indicators.onClass);
      }
    }

    this.key(this.keys.repeatAllMode, (e:any) => {
      removePressedClassFromRepeatButtons();
      removeOnClassFromRepeatLeds();
      if (deck.playbackMode === DeckMode.repeatAll) {
        deck.setPlaybackMode(DeckMode.default);
        return;
      }
      deck.setPlaybackMode(DeckMode.repeatAll);
      if (this.classes && this.classes.pressedKey) {
        e.target.classList.add(this.classes.pressedKey);
      }
      if (repeatAllIndicator) {
        repeatAllIndicator.classList.add(this.indicators.onClass);
      }
    });

    this.key(this.keys.repeatDirMode, (e:any) => {
      removePressedClassFromRepeatButtons();
      removeOnClassFromRepeatLeds();
      if (deck.playbackMode === DeckMode.repeatDir) {
        deck.setPlaybackMode(DeckMode.default);
        return;
      }
      deck.setPlaybackMode(DeckMode.repeatDir);
      if (this.classes && this.classes.pressedKey) {
        e.target.classList.add(this.classes.pressedKey);
      }
      if (repeatDirIndicator) {
        repeatDirIndicator.classList.add(this.indicators.onClass);
      }
    });

    this.key(this.keys.repeatTrackMode, (e:any) => {
      removePressedClassFromRepeatButtons();
      removeOnClassFromRepeatLeds();
      if (deck.playbackMode === DeckMode.repeatTrack) {
        deck.setPlaybackMode(DeckMode.default);
        return;
      }
      deck.setPlaybackMode(DeckMode.repeatTrack);
      if (this.classes && this.classes.pressedKey) {
        e.target.classList.add(this.classes.pressedKey);
      }
      if (repeatTrkIndicator) {
        repeatTrkIndicator.classList.add(this.indicators.onClass);
      }
    });

    if (this.keys.autostart) {
      const uiHandler = (button: HTMLElement) => {
        if (!deck.autoplay) {
          if (this.classes && this.classes.pressedKey) {
            button.classList.remove(this.classes.pressedKey);
          }
          if (autostartIndicator) {
            autostartIndicator.classList.remove(this.indicators.onClass);
          }
        } else {
          if (this.classes && this.classes.pressedKey) {
            button.classList.add(this.classes.pressedKey);
          }
          if (autostartIndicator) {
            autostartIndicator.classList.add(this.indicators.onClass);
          }
        }
      }

      this.key(this.keys.autostart, (e: MouseEvent) => {
        deck.autoplay = !deck.autoplay;
        this.setUiStateItem('autoplay', !deck.autoplay ? '' : '1');
        uiHandler(e.target as HTMLElement);
      });
      const button = document.querySelector(this.keys.autostart) as HTMLElement;
      if (button) {
        uiHandler(button);
      }
    }
  }

  protected bindProgressbar() {
    if (!this.track) {
      return ;
    }
    const deck = this.device.getSource('deck') as Deck;
    let trackDuration = 0;
    let cursorBusy = false;
    if (this.track.bar) {
      const progressBar = document.querySelector(this.track.bar) as HTMLElement;
      let progressLeft = 0;
      let progressWidth = 0;
      const measureProgressElement = () => {
        requestAnimationFrame(() => {
          progressLeft = progressBar.parentElement.getBoundingClientRect().x;
          progressWidth = progressBar.parentElement.clientWidth;
        });
      };
      measureProgressElement();
      window.addEventListener('resize', measureProgressElement);

      progressBar.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        if (cursorBusy) {
          return ;
        }
        requestAnimationFrame(() => {
          let clientX = event.clientX;
          let newPos = Math.min(((clientX-progressLeft)/ progressWidth * 100), 100);
          if (newPos < 0) {
            newPos = 0;
          } else if (newPos > 100) {
            newPos = 100;
          }
          deck.Track.currentTime = trackDuration * (newPos / 100);
        });
      });
      if (this.track.head) {
        let clientX = 0;
        let cursorNode = document.querySelector(this.track.head) as HTMLElement;
        this.device.on('deck.stop', () => {
          cursorNode.style.transform = `translateX(0px)`;
        });
        this.device.on('deck.timeupdate', (event:CustomEvent) => {
          if (!trackDuration || cursorBusy) {
            return ;
          }
          let pos = Math.round(progressWidth*event.detail.time/trackDuration);
          cursorNode.style.transform = `translateX(${pos}px)`;
        });
        cursorNode.addEventListener('mousedown', (event: MouseEvent) => {
          requestAnimationFrame(() => clientX = event.clientX);
          cursorBusy = true;
          window.addEventListener('mouseup', (event: MouseEvent) => {
            cursorBusy = false;
          }, {once: true});
        });
        window.addEventListener('mousemove', (event: MouseEvent) => {
          if (!cursorBusy) {
            return ;
          }
          requestAnimationFrame(() => {
            clientX = event.clientX;
            let pixelPos = clientX-progressLeft;
            let newPos = pixelPos / progressWidth * 100;
            if (newPos < 0) {
              newPos = 0;
              pixelPos = 0;
            } else if (newPos > 100) {
              newPos = 100;
              pixelPos = progressWidth;
            }
            cursorNode.style.transform = `translateX(${pixelPos}px)`;
            deck.Track.currentTime = trackDuration * (newPos / 100);
          });
        });
      }
      if (this.track.mark) {
        const calcPos = (event: MouseEvent, progressLeft: number, progressWidth: number) => {
          let newPos = event.clientX-progressLeft;
          if (newPos < 0) {
            newPos = 0;
          } if (newPos > progressWidth) {
            newPos = progressWidth;
          }
          return newPos;
        }
        let over = false;
        let markNode = document.querySelector(this.track.mark) as HTMLElement;
        progressBar.addEventListener('mouseover', (event: MouseEvent) => {
          over = true;
          requestAnimationFrame(() => {
            let newPos = calcPos(event, progressLeft, progressWidth);
            markNode.style.opacity = '1';
            markNode.style.transform = `translateX(${newPos}px)`;
          });
        });
        progressBar.addEventListener('mouseout', () => {
          over = false;
          markNode.style.opacity = '0';
          markNode.style.transform = `translateX(0px)`;
        });
        progressBar.addEventListener('mousemove', (event: MouseEvent) => {
          if (cursorBusy || !over) {
            return ;
          }
          requestAnimationFrame(() => {
            let newPos = calcPos(event, progressLeft, progressWidth);
            markNode.textContent = Sec2time(trackDuration * (newPos / progressWidth));
            markNode.style.transform = `translateX(${newPos}px)`;
          });
        });
      }
      this.device.on('deck.loadstart', () => {
        progressBar.style.transform = 'scaleX(0)';
        if (this.classes && this.classes.barTransition) {
          requestAnimationFrame(() => progressBar.classList.add(this.classes.barTransition));
        }
      });
      this.device.on('deck.progress', (event:CustomEvent) => {
        const nativeEvent = event.detail.nativeEvent;
        const value = nativeEvent.loaded / nativeEvent.total;
        progressBar.style.transform = 'scaleX('+(value / 1.5) + ')';
      });
      this.device.on('deck.loadeddata', () => {
        trackDuration = deck.Track.duration;
        progressBar.style.transform = 'scaleX(1)';
        if (this.classes && this.classes.barTransition) {
          requestAnimationFrame(() => progressBar.classList.remove(this.classes.barTransition));
        }
      });
    }
  }

  protected bindTrackInfo() {
    if (!this.info) {
      return ;
    }
    const deck = this.device.getSource('deck') as Deck;
    let trackNameNode: HTMLElement;
    let trackTimeNode: HTMLElement;
    let trackPathNode: HTMLElement;
    if (this.info.name) {
      trackNameNode = document.querySelector(this.info.name);
    }
    if (this.info.duration) {
      trackTimeNode = document.querySelector(this.info.duration);
    }
    if (this.info.path) {
      trackPathNode = document.querySelector(this.info.path);
    }
    if (trackNameNode) {
      this.device.on('deck.trackchanged', (e: CustomEvent) => {
        if (!this.playlist.nameFormat || (e.detail.position !== deck.Playlist.Position)) {
          return ;
        }
        trackNameNode.setAttribute(
          'data-marquee', 
          this.playlist.nameFormat(deck.Playlist.Entry.tags) || deck.Playlist.Entry.name
        );
      });
      this.device.on('deck.loadstart', () => {
        if (!this.playlist.nameFormat) {
          return ;
        }
        trackNameNode.setAttribute(
          'data-marquee', 
          this.playlist.nameFormat(deck.Playlist.Entry.tags) || deck.Playlist.Entry.name
        );
      });
      this.device.on('deck.cancel', () => {
        trackNameNode.setAttribute('data-marquee', '-');
      });
    }
    if (trackTimeNode) {
      this.device.on('deck.loadeddata', () => {
        trackTimeNode.textContent = Sec2time(Math.round(deck.Track.duration));
      });
      this.device.on('deck.cancel', () => {
        trackTimeNode.textContent = '--:--';
      });
    }
    if (trackPathNode) {
      this.device.on('deck.loadstart', () => {
          if (deck.Playlist.Entry.path) {
            trackPathNode.textContent = deck.Playlist.Entry.path.join(' / ');
          } else {
            trackPathNode.textContent = '-';
          }
      });
      this.device.on('deck.cancel', () => {
          trackPathNode.textContent = '-';
      });
    }
  }

  protected bindPlaybackInfo() {
    if (!this.info) {
      return ;
    }
    const deck = this.device.getSource('deck') as Deck;
    let functionInfoNode: HTMLElement;
    let dataInfoNode: HTMLElement;
    if (this.info.function) {
      functionInfoNode = document.querySelector(this.info.function);
    }
    if (this.info.data) {
      dataInfoNode = document.querySelector(this.info.data);
    }
    if (functionInfoNode) {
      // Pause state
      this.device.on('deck.pause-on', () => {
        functionInfoNode.textContent = 'Paused';
      });
      this.device.on('deck.pause-off', () => {
        functionInfoNode.textContent = 'Playback';
      });
      // Stop
      this.device.on('deck.stop', () => {
        functionInfoNode.textContent = 'Stopped';
      });
      // Loading
      this.device.on('deck.loadstart', () => {
        functionInfoNode.textContent = 'Start reading...';
      });
      this.device.on('deck.progress', () => {
        functionInfoNode.textContent = 'Track reading...';
      });
      this.device.on('deck.loadeddata', () => {
        functionInfoNode.textContent = 'Ready';
      });
      // Playing
      this.device.on('deck.timeupdate', () => {
        if (deck.State === DeckStates.playing) {
          functionInfoNode.textContent = 'Playback';
        }
      });
    }
    if (dataInfoNode) {
      // Stop
      this.device.on('deck.stop', () => {
        dataInfoNode.textContent = '--';
      });
      // Loading
      this.device.on('deck.loadstart', () => {
        dataInfoNode.textContent = '0%';
      });
      this.device.on('deck.progress', (event:CustomEvent) => {
        const nativeEvent = event.detail.nativeEvent;
        const value = nativeEvent.loaded / nativeEvent.total;
        dataInfoNode.textContent = Math.round(value /1.5 / 100) + '%';
      });
      this.device.on('deck.loadeddata', () => {
        dataInfoNode.textContent = '100%';
      });
      // Playing
      this.device.on('deck.timeupdate', (event:CustomEvent) => {
        const elapsed = Math.round(event.detail.time);
        const remain = Math.round(deck.Track.duration) - elapsed;
        dataInfoNode.textContent = `${Sec2time(elapsed)} / ${Sec2time(remain)}`;
      });
    }
  }

  protected bindAnalyser() {
    if (
      (!this.analyser) && 
      (!this.bassdrivers || !this.bassdrivers.levels)
    ) {
      return ;
    }
    const leds = new Map();
    if (this.analyser && this.analyser.leds) {
      this.analyser.leds.forEach(led => {
        leds.set(led.thereshold, document.querySelector(led.selector) as HTMLMeterElement);
      });
    }

    let leftDriverNode: HTMLElement;
    let rightDriverNode: HTMLElement;
    if (this.bassdrivers.left) {
      leftDriverNode = document.querySelector(this.bassdrivers.left);
    }
    if (this.bassdrivers.right) {
      rightDriverNode = document.querySelector(this.bassdrivers.right);
    }
    const resetProp: string = this.bassdrivers.reset[0];
    const resetValue: string = this.bassdrivers.reset[1];
    
    const component = this.device.getComponent('analyser') as Analyser;
    const analyser = component.Nodes[0];
    analyser.fftSize = 256;
    let dataArray = new Float32Array(analyser.fftSize);
    let requestId: any;

    const offset = this.analyser.offset;
    const minOpacity = this.analyser.minOpacity ? this.analyser.minOpacity : '0.1';
    const maxOpacity = this.analyser.maxOpacity ? this.analyser.maxOpacity : '1';
    const draw = () => {
      analyser.getFloatTimeDomainData(dataArray);
      let peakInstantaneousPower = 0;
      let peakInstantaneousBassPower = 0;
      for (let i = 0; i < dataArray.length / 4; i++) {
        peakInstantaneousPower = Math.max(dataArray[i] ** 2, peakInstantaneousPower);
        if (i == 0) {
          peakInstantaneousBassPower = peakInstantaneousPower;
        }
      }
      const value = 10 * Math.log10(peakInstantaneousPower);
      const bassValue = 10 * Math.log10(peakInstantaneousBassPower);
      // let sumOfSquares = 0;
      // for (let i = 0; i < dataArray.length; i++) {
      //   sumOfSquares += dataArray[i] ** 2;
      // }
      // const value = 10 * Math.log10(sumOfSquares / dataArray.length);
  
      if (leds.size) {
        for (let led of leds) {
          let [thereshold, element] = led;
          element.style.opacity = minOpacity;
          if ((value + offset) >= thereshold) {
            element.style.opacity = maxOpacity;
          }
        }
      }
      
      if (leftDriverNode || rightDriverNode) {
        let p = resetProp, v = resetValue, thereshold;
        for (let lvl of this.bassdrivers.levels) {
          [thereshold] = lvl;
          if ((bassValue + offset) >= thereshold) {
            [, p, v] = lvl;
            break;
          }
        }
        leftDriverNode  ? leftDriverNode.style.setProperty(p, v) : null;
        rightDriverNode ? rightDriverNode.style.setProperty(p, v) : null;
      }
      requestId = requestAnimationFrame(draw);
    }
    const stop = () => {
      for (let led of leds) {
        let [, element] = led;
        element.style.opacity = minOpacity;
      }
      leftDriverNode  ? leftDriverNode.style.setProperty(resetProp, resetValue) : null;
      rightDriverNode ? rightDriverNode.style.setProperty(resetProp, resetValue) : null;
      cancelAnimationFrame(requestId);
    }
    this.device.on('deck.play', () => {
      draw();
    });
    this.device.on('deck.pause-off', () => {
      draw();
    });
    this.device.on('radio.play', () => {
      draw();
    });
    this.device.on('deck.pause-on', () => {
      stop();
    });
    this.device.on('deck.stop', () => {
      stop();
    });
    this.device.on('radio.stop', () => {
      stop();
    });
  }

  protected bindAmplifierControls() {
    const amp = this.device.getComponent('amplifier') as Amplifier;
    this.potentiometer(this.volume, (v: any) => amp.volume(v))
    this.potentiometer(this.balance, (v: any) => amp.balance(v))
  }

  protected bindEqualizerControls() {
    if (this.equalizer) {
      const eq = this.device.getComponent('equalizer') as Equalizer;
      this.equalizer.forEach(({selector}, i) => {
        this.potentiometer(selector, (v: any) => eq.gain(i, v));
      })
    }
  }

  protected bindCodecsInfo() {
    if (!this.codecs || !this.codecs.selector) {
      return ;
    }
    const infoNode: HTMLElement = document.querySelector(this.codecs.selector);
    if (!infoNode) {
      return ;
    }
    const deck = this.device.getSource('deck') as Deck;
    requestAnimationFrame(() => {
      deck.SupportedCodecs.forEach(codec => {
        const codecNode = document.createElement('DIV');
        codecNode.textContent = codec.name;
        codecNode.className = 'codec-type-' + codec.type;
        infoNode.appendChild(codecNode);
      });
    });
  }

  protected bindPlaylist() {
    if (!this.playlist) {
      return;
    }
    let previousPosition: number = 0;
    const playlistElement: HTMLElement = document.querySelector(this.playlist.selector);
    const container: any = document.createElement('TEMPLATE');
    const addItem = (index: number, name: string, HTML: string) => {
      requestAnimationFrame(() => {
        container.innerHTML = HTML;
        container.content.firstChild.setAttribute('data-playlist-index', index);
        const nameEl = container.content.firstChild.querySelector('[data-name]');
        nameEl? (nameEl.textContent = name) : null;
        playlistElement.appendChild(container.content.firstChild); 
      });
    }
    const setItemDuration = (index: number, duration: string) => {
      const timeEl = playlistElement.children[index].querySelector('[data-time]');
      timeEl? (timeEl.textContent = duration) : null;
    }
    const setItemFailed = (index: number) => {
      const timeEl = playlistElement.children[index].querySelector('[data-time]');
      timeEl? (timeEl.textContent = 'ERROR') : null;
      if (this.classes.failedItem) {
        playlistElement.children[index].classList.add(this.classes.failedItem);
      }
    }
    const setItemName = (index: number, tagInfo: any) => {
      if (!tagInfo || !tagInfo.tags) {
        return ;
      }
      const newName = this.playlist.nameFormat(tagInfo)
      if (!newName) {
        return ;
      }
      const nameEl = playlistElement.children[index].querySelector('[data-name]');
      nameEl? (nameEl.textContent = newName) : null;
    }

    this.device.on('deck.trackchanged', (e: CustomEvent) => {
      setItemName(e.detail.position, e.detail.tags);
    });

    this.device.on('deck.tracktimechanged', (e: CustomEvent) => {
      if (e.detail.duration) {
        setItemDuration(e.detail.position, Sec2time(Math.round(e.detail.duration)));
      } else {
        setItemFailed(e.detail.position);
      }
    });
    this.device.on('deck.loaded', async (event:CustomEvent) => {
      // Create playlist
      playlistElement.innerHTML = '';
      previousPosition = 0;

      // console.time('List Rendering');
      for (let i = 0; i < event.detail.playlist.length; i++) {
        let item = event.detail.playlist[i];
        if (item.kind !== 'directory') {
          addItem(i, item.name, this.playlist.trackHTML);
        } else {
          addItem(i, item.name, this.playlist.directoryHTML);
        }
      }
    });

    const deck = this.device.getSource('deck') as Deck;
    playlistElement.addEventListener('click', (event: any) => {
      if (this.device.ActiveSourceName !== 'deck') {
        this.device.plugIn('deck');
      }
      const path = event.path || (event.composedPath && event.composedPath());
      for (let i = 0; i < path.length; i++) {
        if(path[i].hasAttribute && path[i].hasAttribute('data-playlist-index')) {
          deck.playFromPosition(
            parseInt(path[i].getAttribute('data-playlist-index'), 10)
          );
          break;
        }
      }
      
    });
    if (this.classes && this.classes.activeItem) {
      this.device.on('deck.play', async (event:CustomEvent) => {
        if (previousPosition !== event.detail.position) {
          playlistElement.children[previousPosition].classList.remove(this.classes.activeItem);
        }
        previousPosition = event.detail.position;
        playlistElement.children[event.detail.position].classList.add(this.classes.activeItem);
        playlistElement.children[event.detail.position].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      });
    }
  }

  protected bindFunctionSwitcher() {
    if (this.function) {
      const tapeElement = this.key(this.function.tape, () => {
        if (this.device.ActiveSourceName === 'deck') {
          return ;
        }
        this.device.plugIn('deck');
      }, ['plugin-deck'], ['plugout-deck']);

      const radioElement = this.key(this.function.radio, () => {
        if (this.device.ActiveSourceName === 'radio') {
          return ;
        }
        this.device.plugIn('radio');
      }, ['plugin-radio'], ['plugout-radio']);

      this.device.on('plugin-radio', () => this.setUiStateItem('defaultSourseName', 'radio'));
      this.device.on('plugin-deck',  () => this.setUiStateItem('defaultSourseName', 'deck'));

      switch(this.device.ActiveSourceName) {
        case 'deck': 
          tapeElement.classList.add(this.classes.pressedKey);
            break;
        case 'radio':
          radioElement.classList.add(this.classes.pressedKey);
            break;
      }
    }
  }
  
  protected bindRadioControls() {
    if (!this.radio) {
      return;
    }
    if (this.indicators && this.indicators.stereo) {
      const indicator = document.querySelector(this.indicators.stereo);
      this.device.on('radio.play', () => {
        indicator.classList.add(this.indicators.onClass);
      });
      this.device.on('radio.stop', () => {
        indicator.classList.remove(this.indicators.onClass);
      });
      this.device.on('radio.loadstart', () => {
        indicator.classList.remove(this.indicators.onClass);
      });
    }
    let form: HTMLElement;
    let idInput: HTMLInputElement;
    let nameInput: HTMLInputElement;
    let urlInput: HTMLInputElement;
    let parserInput: HTMLInputElement;
    let paramsInput: HTMLInputElement;
    if (this.radio.form) {
      form = document.querySelector(this.radio.form);
      idInput = form.querySelector(`[name="station-id"]`);
      nameInput = form.querySelector(`[name="station-name"]`);
      urlInput = form.querySelector(`[name="station-url"]`);
      parserInput = form.querySelector(`[name="station-parser"]`);
      paramsInput = form.querySelector(`[name="station-params"]`);
    }
    const radio = this.device.getSource('radio') as Receiver;
    const prevButtonElement = document.querySelector(this.radio.prevButton);
    const nextButtonElement = document.querySelector(this.radio.nextButton);
    prevButtonElement.addEventListener('click', (e: MouseEvent) => {
      if (this.device.ActiveSourceName !== 'radio') {
        return ;
      }
      radio.previous();
    });
    nextButtonElement.addEventListener('click', (e: MouseEvent) => {
      if (this.device.ActiveSourceName !== 'radio') {
        return ;
      }
      radio.next();
    });
    if (this.radio.scaleRangeInput) {
      const scaleRangeElement = document.querySelector(this.radio.scaleRangeInput);
      this.device.on('radio.loaded', (e: CustomEvent) => {
        scaleRangeElement.setAttribute('max', radio.Playlist.Size - 1 as any);
      });
      this.device.on('radio.next', (e: CustomEvent) => {
        scaleRangeElement.setAttribute('value', e.detail.position);
      });
      this.device.on('radio.previous', (e: CustomEvent) => {
        scaleRangeElement.setAttribute('value', e.detail.position);
      });
      this.device.on('radio.jump', (e: CustomEvent) => {
        scaleRangeElement.setAttribute('value', e.detail.position);
      });
    }
    if (this.radio.wheelOver) {
      const wheelOverElement = document.querySelector(this.radio.wheelOver);
      wheelOverElement.addEventListener('wheel', (e: WheelEvent) => {
        if (this.device.ActiveSourceName !== 'radio') {
          return ;
        }
        e.preventDefault();
        if (e.deltaY > 0) {
          radio.previous();
        } else {
          radio.next();
        }
      }, false);
    }
    if (this.radio.info) {
      let infoElement = document.querySelector(this.radio.info);
      this.device.on('plugin-radio', (e: CustomEvent) => {
        infoElement.setAttribute('data-marquee', radio.Playlist.Entry.name + ': loading...');
      });
      this.device.on('radio.next', (e: CustomEvent) => {
        infoElement.setAttribute('data-marquee', radio.Playlist.Entry.name + ': loading...');
      });
      this.device.on('radio.previous', (e: CustomEvent) => {
        infoElement.setAttribute('data-marquee', radio.Playlist.Entry.name + ': loading...');
      });
      this.device.on('radio.jump', (e: CustomEvent) => {
        infoElement.setAttribute('data-marquee', radio.Playlist.Entry.name + ': loading...');
      });
      this.device.on('radio.stop', () => {
        infoElement.setAttribute('data-marquee', 'Radio is offline');
      });
      this.device.on('plugout-radio', () => {
        infoElement.setAttribute('data-marquee', 'Radio is offline');
      });
      this.device.on('radio.metadata', (e: CustomEvent) => {
        if (this.device.ActiveSourceName !== 'radio') {
          return ;
        }
        infoElement.setAttribute('data-marquee', e.detail.title);
      });
    }
    if (this.radio.playlist) {
      let previousPosition: number = 0;
      let playlistElement: HTMLElement = document.querySelector(this.radio.playlist);
      playlistElement.addEventListener('click', (event: any) => {
        const path = event.path || (event.composedPath && event.composedPath());
        for (let i = 0; i < path.length; i++) {
          if(path[i].hasAttribute && path[i].hasAttribute('data-playlist-index')) {
            if (this.device.ActiveSourceName !== 'radio') {
              this.device.plugIn('radio');
            }
            radio.playFromPosition(
              parseInt(path[i].getAttribute('data-playlist-index'), 10)
            );
            break;
          }
          if(path[i].hasAttribute && path[i].hasAttribute('data-remove')) {
            const item = path[i].closest('[data-playlist-index]');
            const pos = parseInt(item.getAttribute('data-playlist-index'), 10);
            radio.Playlist.deleteEntry(pos);
            item.remove();
            break;
          }
          if(path[i].hasAttribute && path[i].hasAttribute('data-edit')) {
            const item = path[i].closest('[data-playlist-index]');
            const pos = parseInt(item.getAttribute('data-playlist-index'), 10);

            const entry = radio.Playlist.getEntryOf(pos);
            console.log({entry})
            idInput.value = entry.id;
            nameInput.value = entry.name;
            urlInput.value = entry.src;
            if (entry.nowPlayingParser) {
              parserInput.value = entry.nowPlayingParser;
            }
            if (entry.nowPlayingParams) {
              paramsInput.value = Object.entries(entry.nowPlayingParams).map(entry => {
                return entry.join(': ');
              }).join('\n');
            }
            idInput.setAttribute('readonly', 'readonly');
            form.style.setProperty('visibility', 'visible');
            form.dispatchEvent(new CustomEvent('dialog.open', {}));
            break;
          }
        }
      });
      const container: any = document.createElement('TEMPLATE');
      this.device.on('radio.loaded', (e: CustomEvent) => {
        playlistElement.innerHTML = '';
        previousPosition = 0;
        (e.detail.playlist as PlaylistStation[]).forEach(({name}, index) => {
          if (e.detail.playlist[index].deleted) {
            return;
          }
          container.innerHTML = this.radio.stationHTML;
          container.content.firstChild.setAttribute('data-playlist-index', index);
          const nameEl = container.content.firstChild.querySelector('[data-name]');
          nameEl? (nameEl.textContent = name) : null;
          playlistElement.appendChild(container.content.firstChild);
        });
      });
      if (this.classes && this.classes.activeItem) {

        const activateItem = (event:CustomEvent) => {
          const p = event.detail.position;
          if (previousPosition !== p) {
            try {
              playlistElement
                .querySelector(`[data-playlist-index="${previousPosition}"]`)
                  .classList.remove(this.classes.activeItem);
            } catch {}
          }
          previousPosition = p;
          try {
            const target = playlistElement.querySelector(`[data-playlist-index="${p}"]`);
            target.classList.add(this.classes.activeItem);
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          } catch {}
          try {
            this.setUiStateItem('radioStationId', radio.Playlist.Entry.id);
          } catch {}
        }
        this.device.on('radio.play', activateItem);
        this.device.on('radio.stationselected', activateItem);
      }
      if (this.radio.updateButton) {
        document.querySelector(this.radio.updateButton)
          .addEventListener('click', () => {
            radio.Playlist.updateFromRemote();
          });
      }
      if (form) {
        //idInput readonly if editing
        let saveButton = form.querySelector(`[name="station-save"]`);
        form.addEventListener('dialog.close', () => {
          idInput.value = '';
          nameInput.value = '';
          urlInput.value = '';
          parserInput.value = '';
          paramsInput.value = '';
          idInput.removeAttribute('readonly');
        });
        saveButton.addEventListener('click', () => {
          let entry: PlaylistStation = {
            id: idInput.value,
            name: nameInput.value,
            src: urlInput.value,
            nowPlayingParser: parserInput.value,
            nowPlayingParams: {},
            changedByUser: true,
          };
          paramsInput.value
            .trim().split(/\r\n|\r|\n/i)
            .forEach(line => {
              let result = line.split(':');
              let name = result.shift().trim();
              let value = result.join(':').trim();
              entry.nowPlayingParams[name] = value;
            });
          console.log(entry.nowPlayingParams);
          radio.Playlist.addEntry(entry)
            .then(() => {
              form.style.setProperty('visibility', 'hidden');
              form.dispatchEvent(new CustomEvent('dialog.close', {}));
            })
            .catch(e => console.error(e));
        });
      }
    }
  }

  protected bindErrors() {

    let corsError = `This may be a CORS error. If some stations don't play or don't show its info then you should install an extension "CORS Unblock" and activate it on this page.`;
    let corsActions = {
      'Go install': (e: MouseEvent, toast: HTMLElement) => {
        toast.remove();
        toast = null;
        let url = 'https://chrome.google.com/webstore/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino';
        if (window.netscape) {
          url = 'https://addons.mozilla.org/ru/firefox/addon/cors-unblock';
        }
        window.open(url, '_blank').focus();
      }
    };

    let httpError = `This may be a mixed content error. If some stations don't play or don't show its info then you should allow insecure content on this page.`;
    if (window.netscape) {
      httpError = `This may be a mixed content error. If some stations don't play or don't show its info then you should add this site in trusted pages.`;
    }
    if (!window.netscape && !window.chrome) {
      delete corsActions['Go install'];
    }

    let mediaError = `${httpError} If insecure content is allowed already then this may be a CORS error. So to make the application work properly you should install an extension "CORS Unblock" and activate it on this page.`;

    this.device.on('radio.trackerror', (e: any) => {
      const radio = this.device.getSource('radio') as Receiver;
      if (!radio.Playlist.Entry) {
        return ;
      }
      const err = e.detail.nativeEvent.target.error;
      switch (err.code) {
        case err.MEDIA_ERR_ABORTED:
          this.throwToast('error', 'Stream error', 'The audio downloading was aborted.');
          break;
        case err.MEDIA_ERR_NETWORK:
          this.throwToast('error', 'Stream error', 'A network error while the audio downloading.');
          break;
        case err.MEDIA_ERR_DECODE:
          this.throwToast('error', 'Stream error', 'Your browser does not support the stream type.');
          break;
        case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
          this.throwToast('error', 'Stream error', mediaError, corsActions);
          break;
        default:
          this.throwToast('error', 'Stream error', 'An unknown error occured while the stream downloading');
          break;
      }
    });

    this.device.on('radio.metadataerror', async (e: any) => {
      const url = e.detail.url;
      if (url.startsWith('http:')) {
        this.throwToast('error', 'Data error', httpError);
      } else {
        try {
          await fetch(url, {'mode':'no-cors'});
          this.throwToast('error', 'Data error', corsError, corsActions);
        } catch {
          this.throwToast('error', 'Data error', 'An unknown error occured while the metadata downloading');
        }
      }
      if (this.device.ActiveSourceName !== 'radio') {
        return ;
      }
      if (this.radio.info) {
        let infoElement = document.querySelector(this.radio.info);
        infoElement.setAttribute('data-marquee', e.detail.name + ': error while metadata fetching');
      }
    });
  }

  protected potentiometer(selector: string, setFunc: Function) {
    if (selector) {
      const element = document.querySelector(selector) as HTMLInputElement;
      const uiStateKey = `potentiometer${selector}`;
      element.addEventListener('input', () => {
        setFunc(element.value);
        this.setUiStateItem(uiStateKey, element.value);
      }, false);

      // load from storage
      if (typeof this.uiState[uiStateKey] !== 'undefined') {
        element.setAttribute('value', this.uiState[uiStateKey]);
        setFunc(this.uiState[uiStateKey]);
      }
    }
  }

  protected key(
    selector: string, 
    on: Function | {[n: string]: Function}, 
    pressOn?: string[], 
    unpressOn?: string[]
  ): HTMLElement {
    if (selector) {
      const key: HTMLElement = document.querySelector(selector);
      if (typeof on === 'function') {
        key.addEventListener("click", (e: any) => {
          e.preventDefault();
          on(e);
        });
      } else {
        for(let p in on) {
          key.addEventListener(p, (e: any) => {
            e.preventDefault();
            on[p](e);
          });
        }
      }
      if (this.classes && this.classes.pressedKey) {
        if (pressOn) {
          pressOn.forEach(event => {
            this.device.on(event, (e: any) => {
              key.classList.add(this.classes.pressedKey);
            });
          });
        }
        if (unpressOn) {
          unpressOn.forEach(event => {
            this.device.on(event, (e: any) => {
              key.classList.remove(this.classes.pressedKey);
            });
          });
        }
      }
      return key;
    }
  }

  protected throwToast(type: string, title: string, text: string, actions: any = {}) {
    
    let toast = document.createElement('DIV');
    toast.classList.add('toast');
    toast.classList.add('toast-' + type);

    let toastTitle = document.createElement('DIV');
    toastTitle.classList.add('toast-title');
    toastTitle.textContent = title;

    let toastClose = document.createElement('A');
    toastClose.classList.add('toast-close');
    toastClose.textContent = '✕';
    toastClose.setAttribute('href', '#');
    toastClose.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      toast.remove();
      toast = null;
    });
    
    let toastText = document.createElement('DIV');
    toastText.classList.add('toast-text');
    toastText.textContent = text;

    let toastActions = document.createElement('DIV');
    toastActions.classList.add('toast-actions');

    Object.keys(actions).forEach(actionName => {
      let button = document.createElement('BUTTON');
      button.classList.add('button');
      button.textContent = actionName;
      button.addEventListener('click', (e: MouseEvent) => actions[actionName](e, toast));
      toastActions.appendChild(button);
    });
    
    toastTitle.appendChild(toastClose);

    toast.appendChild(toastTitle);
    toast.appendChild(toastText);
    toast.appendChild(toastActions);
    
    document.querySelector('#toasts').appendChild(toast);
    setTimeout(() => toast.classList.add('toast-visible'));
  }
}

export default Boombox;