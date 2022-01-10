import "./scss/style.scss";

import "./elements/Slider.js";
import Boombox from "./classes/Boombox";

document.addEventListener("DOMContentLoaded", () => {
  new Boombox({
    keys: {
      loadStop: '#button-stop',
      play: '#button-play',
      pause: '#button-pause',
      previous: '#button-rewind',
      next: '#button-forward',
      autostart: '#button-autostart',
      repeatTrackMode: '#button-repeat-track',
      repeatDirMode: '#button-repeat-dir',
      repeatAllMode: '#button-repeat-all',
      nextDirectory: '#button-next-dir',
      previousDirectory: '#button-prev-dir',
    },
    equalizer: [
      {
        selector: '#equalizer-1',
        frequency: 60,
        q: 1,
        type: "lowshelf",
      },
      {
        selector: '#equalizer-2',
        frequency: 120,
        q: 1,
        type: "peaking",
      },
      {
        selector: '#equalizer-3',
        frequency: 250,
        q: 1,
        type: "peaking",
      },
      {
        selector: '#equalizer-4',
        frequency: 1000,
        q: 1,
        type: "peaking",
      },
      {
        selector: '#equalizer-5',
        frequency: 3000,
        q: 1,
        type: "peaking",
      },
      {
        selector: '#equalizer-6',
        frequency: 10000,
        q: 1,
        type: "peaking",
      },
      {
        selector: '#equalizer-7',
        frequency: 14000,
        q: 1,
        type: "highshelf",
      },
    ],
    track: {
      bar: '#load-progressbar',
      head: '#progress-head',
      mark: '#time-mark',
    },
    info: {
      function: '#progress-info',
      data: '#progress-percent',
      name: '#track-name',
      duration: '#track-time',
      path: '#track-path',
    },
    volume: '#amplifier-volume',
    balance: '#amplifier-balance',
    classes: {
      barTransition: 'progress-bar-transition',
      pressedKey: 'pressed',
      activeItem: 'now-playing',
      failedItem: 'is-failed',
    },
    analyser: {
      offset: 0,
      maxOpacity: '0.6',
      leds: [
        {
          selector: '#lvl-20',
          thereshold: -20,
        },
        {
          selector: '#lvl-15',
          thereshold: -15,
        },
        {
          selector: '#lvl-5',
          thereshold: -5,
        },
        {
          selector: '#lvl0',
          thereshold: 0,
        },
        {
          selector: '#lvl3',
          thereshold: 3,
        },
      ]
    },
    codecs: {
      selector: '#supported-formats',
    },
    playlist: {
      selector: '#playlist',
      trackHTML: `<li class="is-playable">
        <div class="playlist-name" data-name></div>
        <div class="playlist-time" data-time>--:--</div>
      </li>`,
      directoryHTML: `<li class="is-directory">
        <div class="playlist-dir" data-name></div>
      </li>`,
      nameFormat: (tagInfo) => {
        if (tagInfo && tagInfo.tags && (tagInfo.tags.artist || tagInfo.tags.title)) {
          return (tagInfo.tags.track ? tagInfo.tags.track + '. ' : '') +
            (tagInfo.tags.artist ? tagInfo.tags.artist : '') + 
            (tagInfo.tags.artist && tagInfo.tags.title ? ' - ' : '') +
            (tagInfo.tags.title ? tagInfo.tags.title : '')
        }
        return '';
      },
    },
    unsupported: '#unsupported-message',
    function: {
      tape: '#f-tape',
      radio: '#f-radio',
      aux: '#f-aux',
    },
    bassdrivers: {
      left: "#left-bassdriver",
      right: "#right-bassdriver",
      reset: ['transform', 'scale(1)'],
      levels: [
        [-10, 'transform', 'scale(1.05)'],
      ],
    },
    cassetteDeckCase: {
      selector: '#cassette-deck',
      openClass: 'open',
      workingClass: 'working',
      loadedClass: 'loaded',
      tapeLeft: '#tape-left',
      tapeRight: '#tape-right',
      minTapeWidth: 62,
      maxTapeWidth: 150,

      // reelLeft: '#reel-left',
      // maxReelSpeed: 4,
      // minReelSpeed: 2,
    },
    indicators: {
      onClass: 'led-on',
      stereo: '#led-stereo',
      autostart: '#led-autostart',
      repeatAll: '#led-all',
      repeatDir: '#led-dir',
      repeatTrack: '#led-track',
    },
    radio: {
      prevButton: '#radio-prev',
      nextButton: '#radio-next',
      scaleRangeInput: '#radio-scale',
      wheelOver: '#radio-roatate-wheel',
      info: '#radio-info',
      playlist: '#stations',
      stationHTML: `<li class="is-playable">
        <div class="playlist-name" data-name></div>
        <button class="playlist-edit" data-edit title="Edit">✎</button>
        <button class="playlist-remove" data-remove title="Delete">✕</button>
      </li>`,
      updateButton: '#stations-update',
      form: '#stations-form',
    },
    sounds: {
      tuning: './sounds/tuning.ogg',
      play: './sounds/play.ogg',
      stop: './sounds/stop.ogg',
      pauseOn: './sounds/pause.ogg',
      pauseOff: './sounds/pause.ogg',
      otherKeys: './sounds/otherKeys.ogg',
      cassetteEject: './sounds/cassetteEject.ogg',
      cassetteLoad: './sounds/cassetteLoad.ogg',
      buttons: './sounds/buttons.ogg',
    }
  });
});
