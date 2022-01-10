class Slider extends HTMLElement {
  #shadow;
  #track;
  #knob;
  #trackHeight;
  #knobHeight;
  #trackRect;
  #input;
  defaultValue;
  value;
  min;
  max;
  step;
  pixelValue;
  moving = false;
  focused = false;
  constructor(...args) {
    super(...args);
    this.shadow = this.attachShadow({mode: 'open'});
    this.track = document.createElement('div');
    this.knob = document.createElement('div');
    let style = document.createElement('style');
    this.knob.setAttribute('part', 'knob');
    this.track.setAttribute('part', 'track');
    this.input = document.createElement('input');
    this.input.setAttribute('type', 'hidden');
    this.input.setAttribute('name', this.getAttribute('name'));
    this.knob.setAttribute('tabindex', 0);
    
    style.textContent = `
    div {
      border: none;
      outline: none;
      height: 100%;
      width: 100%;
      margin: inherit;
      padding: 0;
      font-size: 0;
      box-sizing: content-box;
      background: transparent;
      display:flex;
      justify-content: center;
      user-select: none;
    }
    div>div {
      border: 1px solid currentColor;
      height: 10px;
      width: inherit;
      cursor: pointer;
      transform: translateY(0);
      margin: 0;
      padding: 0;
      font-size: 0;
      box-sizing: border-box;
      user-select: none;
    }
    div>div:focus {
      outline: 1px solid;
    }`;
    this.shadow.appendChild(style);
    this.track.appendChild(this.knob);
    this.shadow.appendChild(this.track);
    this.shadow.appendChild(this.input);
    
    this.min = parseFloat(this.getAttribute('min'));
    this.max = parseFloat(this.getAttribute('max'));
    this.step = parseFloat(this.getAttribute('step'));
    if (!this.step) {
      this.step = 1;
    }
    this.defaultValue = this.getAttribute('value');
    
    this.setValue(this.defaultValue);
    
    let clickTimer;
    let blockClick = false;
    let oldValue;
    this.knob.addEventListener('focus', e => {
      this.focused = true;
      oldValue = this.input.value;
    });
    this.knob.addEventListener('blur', e => {
      if (this.focused) {
        this.focused = false;
      }
      if (oldValue !== this.input.value) {
        this.dispatchEvent(new CustomEvent('change'));
      }
    });
    this.knob.addEventListener('keydown', e => {
      if (!this.focused) {
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setValue(this.value + parseFloat(this.step));
        this.dispatchEvent(new CustomEvent('input'));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setValue(this.value - parseFloat(this.step));
        this.dispatchEvent(new CustomEvent('input'));
        return;
      }
    }, false);
    this.knob.addEventListener('mousedown', e => {
      this.moving = true;
      this.setValueByCursorPosition(e.clientY);
    });
    document.addEventListener('mouseup', e => {
      if (this.moving) {
        this.moving = false; 
      }
    }); 
    document.addEventListener('mousemove', e => {
      if (!this.moving) {
        return;
      }
      e.preventDefault();
      blockClick = true;
      this.setValueByCursorPosition(e.clientY);
      this.dispatchEvent(new CustomEvent('input'));
    }, false);
    this.addEventListener('click', e => {
      //move to click position
      clearTimeout(clickTimer);
      if (blockClick) {
        return blockClick = false;
      }
      clickTimer = setTimeout(() => {
        this.knob.focus();
        this.setValueByCursorPosition(e.clientY);
        this.dispatchEvent(new CustomEvent('input'));
      }, 400);
    });
    this.addEventListener('dblclick', e => {
      //reset to default
      clearTimeout(clickTimer);
      this.knob.focus();
      this.setValue(this.defaultValue);
      this.dispatchEvent(new CustomEvent('input'));
    });
    this.addEventListener('wheel', e => {
      //move
      this.knob.focus();
      e.preventDefault();
      if (e.deltaY > 0) {
        this.setValue(this.value - parseFloat(this.step));
      } else {
        this.setValue(this.value + parseFloat(this.step));
      }
      this.dispatchEvent(new CustomEvent('input'));
    });
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => this.reDraw());
    });
    setTimeout(() => this.reDraw(), 0);
  }
  
  static get observedAttributes() {
    return ['value', 'max', 'min', 'step', 'style'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value') {
      return this.setValue(newValue);
    }
    if (name === 'max') {
      return this.setMax(newValue);
    }
    if (name === 'min') {
      return this.setMin(newValue);
    }
    if (name === 'step') {
      return this.setStep(newValue);
    }
    if (name === 'style') {
      return this.reDraw();
    }
  }
  
  setValue(value, forced) {
    if (value < this.min) {
      value = this.min;
    }
    if (value > this.max) {
      value = this.max;
    }
    if (!forced && this.value == value) {
      return;
    }
    this.value = parseFloat(value);
    if (this.step) {
      this.value = Math.round(this.value / parseFloat(this.step)) * parseFloat(this.step);
    }
    //this.setAttribute('value', value);
    let min = parseFloat(this.min);
    let max = parseFloat(this.max);
    let pos = this.trackHeight * (1 - (this.value - min) / (max - min));
    if (pos > this.trackHeight) {
      pos = this.trackHeight;
    }
    this.knob.style.setProperty('transform', `translateY(${pos}px)`);
    this.input.setAttribute('value', value);
  }
  setMin(min) {
    this.min = min;
    //this.setAttribute('min', min);
    this.setValue(this.value);
    this.pixelValue = (parseFloat(this.max) - parseFloat(this.min)) / this.trackHeight;
  }
  setMax(max) {
    this.max = max;
    //this.setAttribute('max', max);
    this.setValue(this.value);
    this.pixelValue = (parseFloat(this.max) - parseFloat(this.min)) / this.trackHeight;
  }
  setStep(step) {
    this.step = step;
    //this.setAttribute('step', step);
    this.setValue(this.value);
  }
  
  setValueByCursorPosition(pos) {
    let pixelDistance = this.trackRect.bottom - pos - this.knobHeight / 2;
    let value = parseFloat(this.min) + this.pixelValue * pixelDistance;
    this.setValue(value);
  }
  
  reDraw() {
    this.knobHeight = this.knob.offsetHeight;
    this.trackHeight = this.track.clientHeight - this.knobHeight;
    this.trackRect = this.track.getBoundingClientRect();
    this.pixelValue = (parseFloat(this.max) - parseFloat(this.min)) / this.trackHeight;
    this.setValue(this.value, true);
  }
}
customElements.define('range-slider', Slider);