const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      --netsi-signature-bg: Canvas;
      --netsi-signature-fg: CanvasText;
      --netsi-signature-border: color-mix(in srgb, CanvasText 24%, transparent);
      --netsi-signature-surface: color-mix(in srgb, Canvas 96%, CanvasText 4%);
      --netsi-signature-paper: rgba(255,255,0,.05);
      --netsi-signature-accent: #0069c2;
      --netsi-signature-stroke: #111;
      --netsi-signature-radius: 1rem;
      --netsi-signature-stroke-width: 2.5;
      --netsi-signature-min-height: 12rem;
      display: block;
      color: var(--netsi-signature-fg);
      container-type: inline-size;
    }

    :host([hidden]) { display: none; }
    :host([disabled]) { opacity: .65; pointer-events: none; }

    .root {
      display: grid;
      gap: .75rem;
      inline-size: 100%;
    }

    .canvas-wrap {
      position: relative;
      min-block-size: var(--netsi-signature-min-height);
      background:
        linear-gradient(var(--netsi-signature-paper), var(--netsi-signature-paper)),
        var(--netsi-signature-surface);
      border: 1px solid var(--netsi-signature-border);
      border-radius: var(--netsi-signature-radius);
      overflow: clip;
      box-shadow: 0 .75rem 1.75rem color-mix(in srgb, CanvasText 12%, transparent);
      touch-action: none;
    }

    canvas {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      min-block-size: var(--netsi-signature-min-height);
      cursor: crosshair;
    }

    .guide {
      position: absolute;
      inset-inline: 1rem;
      inset-block-end: 2rem;
      border-block-end: 1px dashed color-mix(in srgb, CanvasText 35%, transparent);
      pointer-events: none;
    }

    .empty-hint {
      position: absolute;
      inset-inline: 1rem;
      inset-block-start: 1rem;
      color: color-mix(in srgb, CanvasText 55%, transparent);
      font: 500 .9rem/1.4 system-ui, sans-serif;
      pointer-events: none;
      transition: opacity .2s ease;
    }

    :host([signed]) .empty-hint { opacity: 0; }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      align-items: center;
    }

    button {
      appearance: none;
      border: 1px solid var(--netsi-signature-border);
      border-radius: .75rem;
      background: var(--netsi-signature-bg);
      color: var(--netsi-signature-fg);
      padding: .55rem .8rem;
      font: inherit;
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--netsi-signature-accent) 70%, var(--netsi-signature-border));
    }

    button:disabled { opacity: .45; cursor: not-allowed; }

    .status {
      font-size: .875rem;
      color: color-mix(in srgb, CanvasText 65%, transparent);
    }

    .output {
      display: grid;
      gap: .5rem;
    }

    .signature {
      display: none;
      max-inline-size: 100%;
      border: 1px solid var(--netsi-signature-border);
      border-radius: .75rem;
      background: var(--netsi-signature-bg);
    }

    :host([signed]) .signature { display: block; }

    .imagebase64 {
      display: none;
      inline-size: 100%;
      min-block-size: 4rem;
      resize: vertical;
      font: .8rem/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--netsi-signature-fg);
      background: color-mix(in srgb, Canvas 94%, CanvasText 6%);
      border: 1px solid var(--netsi-signature-border);
      border-radius: .75rem;
      padding: .75rem;
    }

    :host([show-base64]) .imagebase64 { display: block; }

    @container (max-width: 34rem) {
      .controls { align-items: stretch; }
      button { flex: 1 1 8rem; }
    }
  </style>

  <div class="root" part="root">
    <div class="canvas-wrap" part="surface" aria-label="Signature drawing area">
      <canvas part="canvas"></canvas>
      <div class="guide" aria-hidden="true"></div>
      <div class="empty-hint" part="hint">Sign here</div>
    </div>

    <div class="controls" part="controls">
      <button type="button" data-action="undo" part="button undo">Undo</button>
      <button type="button" data-action="redo" part="button redo">Redo</button>
      <button type="button" data-action="clear" part="button clear">Clear</button>
    </div>

    <div class="status" part="status" aria-live="polite">Ready</div>

    <div class="output" part="output">
      <img class="signature" part="signature" alt="Signature preview">
      <textarea class="imagebase64" part="imagebase64" readonly spellcheck="false" aria-label="Base64 encoded signature"></textarea>
    </div>
  </div>
`;

const I18N = {
  en: { signHere: 'Sign here', ready: 'Ready', signing: 'Signing…', signed: 'Signature captured', cleared: 'Cleared', undo: 'Undo', redo: 'Redo', clear: 'Clear' },
  da: { signHere: 'Underskriv her', ready: 'Klar', signing: 'Underskriver…', signed: 'Underskrift gemt', cleared: 'Ryddet', undo: 'Fortryd', redo: 'Gentag', clear: 'Ryd' },
  es: { signHere: 'Firma aquí', ready: 'Listo', signing: 'Firmando…', signed: 'Firma capturada', cleared: 'Borrado', undo: 'Deshacer', redo: 'Rehacer', clear: 'Borrar' },
  zh: { signHere: '请在此签名', ready: '准备就绪', signing: '正在签名…', signed: '签名已捕获', cleared: '已清除', undo: '撤销', redo: '重做', clear: '清除' }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dataUrlToBase64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || '';
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

export class NetsiSignature extends HTMLElement {
  static formAssociated = true;

  static observedAttributes = [
    'name', 'value', 'stroke-color', 'stroke-width', 'background-color',
    'format', 'quality', 'disabled', 'required', 'lang', 'show-base64'
  ];

  #internals;
  #canvas;
  #ctx;
  #signature;
  #imageBase64Field;
  #status;
  #hint;
  #buttons = new Map();
  #resizeObserver;
  #strokes = [];
  #redo = [];
  #activeStroke = null;
  #isDrawing = false;
  #lastPoint = null;
  #raf = 0;
  #fallbackInput;

  constructor() {
    super();
    if ('attachInternals' in this) this.#internals = this.attachInternals();

    const root = this.attachShadow({ mode: 'open' });
    root.append(template.content.cloneNode(true));

    this.#canvas = root.querySelector('canvas');
    this.#ctx = this.#canvas.getContext('2d', { willReadFrequently: true });
    this.#signature = root.querySelector('.signature');
    this.#imageBase64Field = root.querySelector('.imagebase64');
    this.#status = root.querySelector('.status');
    this.#hint = root.querySelector('.empty-hint');

    for (const button of root.querySelectorAll('button[data-action]')) {
      this.#buttons.set(button.dataset.action, button);
      button.addEventListener('click', () => this[button.dataset.action]());
    }

    this.#canvas.addEventListener('pointerdown', this.#onPointerDown);
    this.#canvas.addEventListener('pointermove', this.#onPointerMove);
    this.#canvas.addEventListener('pointerup', this.#onPointerUp);
    this.#canvas.addEventListener('pointercancel', this.#onPointerUp);
    this.#canvas.addEventListener('keydown', this.#onKeyDown);
    this.#canvas.tabIndex = 0;
  }

  connectedCallback() {
    this.#ensureFallbackInput();
    this.#applyI18n();
    this.#upgradeProperty('value');
    this.#upgradeProperty('disabled');

    this.#resizeObserver = new ResizeObserver(() => this.#resizeCanvasPreservingImage());
    this.#resizeObserver.observe(this);

    queueMicrotask(() => {
      this.#resizeCanvasPreservingImage();
      if (this.value) this.#loadDataUrl(this.value);
      this.#updateButtons();
      this.#updateFormValue();
    });
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    cancelAnimationFrame(this.#raf);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'lang') this.#applyI18n();
    if (name === 'value') this.#loadDataUrl(newValue || '');
    if (name === 'stroke-color') this.style.setProperty('--netsi-signature-stroke', newValue || '#111');
    if (name === 'stroke-width') this.style.setProperty('--netsi-signature-stroke-width', newValue || '2.5');
    if (name === 'background-color') this.style.setProperty('--netsi-signature-paper', newValue || 'rgba(255,255,0,.05)');
    if (name === 'disabled') this.#canvas.toggleAttribute('disabled', this.disabled);
    if (name === 'name') this.#ensureFallbackInput();
    this.#updateFormValue();
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(value) {
    if (value) this.setAttribute('value', value);
    else this.removeAttribute('value');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { this.toggleAttribute('disabled', Boolean(value)); }

  get required() { return this.hasAttribute('required'); }
  set required(value) { this.toggleAttribute('required', Boolean(value)); }

  get signed() { return this.hasAttribute('signed'); }
  get signature() { return this.#signature; }
  get imagebase64() { return this.#imageBase64Field.value; }
  get timeline() { return this.#strokes.flatMap(stroke => stroke.points).map(point => ({ ...point, coordinate: { ...point.coordinate } })); }
  get strokes() { return structuredClone(this.#strokes); }

  clear() {
    this.#strokes = [];
    this.#redo = [];
    this.value = '';
    this.#redraw();
    this.#status.textContent = this.#t('cleared');
    this.#updateOutputs('');
    this.#updateButtons();
    this.#emit('signature:clear');
  }

  undo() {
    if (!this.#strokes.length) return;
    this.#redo.push(this.#strokes.pop());
    this.#redraw();
    this.#syncFromCanvas();
    this.#updateButtons();
  }

  redo() {
    if (!this.#redo.length) return;
    this.#strokes.push(this.#redo.pop());
    this.#redraw();
    this.#syncFromCanvas();
    this.#updateButtons();
  }

  async toBlob(type = this.mimeType, quality = this.quality) {
    return canvasToBlob(this.#canvas, type, quality);
  }

  toDataURL(type = this.mimeType, quality = this.quality) {
    return this.#canvas.toDataURL(type, quality);
  }

  toBase64(type = this.mimeType, quality = this.quality) {
    return dataUrlToBase64(this.toDataURL(type, quality));
  }

  toImageData() {
    return this.#ctx.getImageData(0, 0, this.#canvas.width, this.#canvas.height);
  }

  async getSignatureData() {
    const dataUrl = this.toDataURL();
    return {
      blob: await this.toBlob(),
      file: new File([await this.toBlob()], `signature.${this.fileExtension}`, { type: this.mimeType }),
      imageData: this.toImageData(),
      dataUrl,
      base64: dataUrlToBase64(dataUrl),
      timeline: this.timeline,
      strokes: this.strokes,
      isEmpty: !this.signed,
      width: this.#canvas.width,
      height: this.#canvas.height,
      mimeType: this.mimeType,
      timestamp: new Date().toISOString()
    };
  }

  get mimeType() {
    const format = (this.getAttribute('format') || 'image/png').toLowerCase();
    if (format === 'png') return 'image/png';
    if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
    if (format === 'webp') return 'image/webp';
    return format.startsWith('image/') ? format : 'image/png';
  }

  get fileExtension() {
    return this.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  }

  get quality() {
    return clamp(Number(this.getAttribute('quality') || 0.92), 0, 1);
  }

  formResetCallback() { this.clear(); }
  formDisabledCallback(disabled) { this.disabled = disabled; }
  formStateRestoreCallback(value) { this.value = value || ''; }
  checkValidity() { return this.#internals?.checkValidity?.() ?? (!this.required || this.signed); }
  reportValidity() { return this.#internals?.reportValidity?.() ?? this.checkValidity(); }

  #onPointerDown = async event => {
    if (this.disabled || event.button > 0) return;
    event.preventDefault();
    this.#canvas.focus();
    this.#canvas.setPointerCapture?.(event.pointerId);
    this.#isDrawing = true;
    this.#lastPoint = this.#pointFromEvent(event);
    this.#activeStroke = { id: crypto.randomUUID?.() || String(Date.now()), points: [this.#lastPoint] };
    this.#redo = [];
    this.#status.textContent = this.#t('signing');
    this.#drawDot(this.#lastPoint);
    this.setAttribute('signed', '');
    await this.#emit('signature:start');
  };

  #onPointerMove = event => {
    if (!this.#isDrawing || this.disabled) return;
    event.preventDefault();
    const point = this.#pointFromEvent(event);
    this.#activeStroke.points.push(point);
    this.#drawSegment(this.#lastPoint, point);
    this.#lastPoint = point;
    this.#scheduleDrawEvent();
  };

  #onPointerUp = async event => {
    if (!this.#isDrawing) return;
    event.preventDefault();
    this.#isDrawing = false;
    this.#canvas.releasePointerCapture?.(event.pointerId);
    if (this.#activeStroke?.points.length) this.#strokes.push(this.#activeStroke);
    this.#activeStroke = null;
    await this.#syncFromCanvas();
    this.#status.textContent = this.#t('signed');
    this.#updateButtons();
    await this.#emit('signature:end');
  };

  #onKeyDown = event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
    }
    if (event.key === 'Escape') this.clear();
  };

  #pointFromEvent(event) {
    const rect = this.#canvas.getBoundingClientRect();
    const scaleX = this.#canvas.width / rect.width;
    const scaleY = this.#canvas.height / rect.height;
    return {
      time: performance.now(),
      coordinate: {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      },
      tryk: typeof event.pressure === 'number' ? event.pressure : null,
      pointerType: event.pointerType || 'unknown'
    };
  }

  #drawDot(point) {
    const width = this.#strokeWidth(point);
    this.#ctx.beginPath();
    this.#ctx.fillStyle = this.strokeColor;
    this.#ctx.arc(point.coordinate.x, point.coordinate.y, width / 2, 0, Math.PI * 2);
    this.#ctx.fill();
  }

  #drawSegment(from, to) {
    this.#ctx.beginPath();
    this.#ctx.lineCap = 'round';
    this.#ctx.lineJoin = 'round';
    this.#ctx.strokeStyle = this.strokeColor;
    this.#ctx.lineWidth = this.#strokeWidth(to);
    this.#ctx.moveTo(from.coordinate.x, from.coordinate.y);
    this.#ctx.lineTo(to.coordinate.x, to.coordinate.y);
    this.#ctx.stroke();
  }

  #strokeWidth(point) {
    const base = Number(this.getAttribute('stroke-width') || getComputedStyle(this).getPropertyValue('--netsi-signature-stroke-width') || 2.5);
    const pressure = point.tryk && point.tryk > 0 ? point.tryk : 0.5;
    return clamp(base * (0.65 + pressure), 1, base * 2.2);
  }

  get strokeColor() {
    return this.getAttribute('stroke-color') || getComputedStyle(this).getPropertyValue('--netsi-signature-stroke').trim() || '#111';
  }

  #scheduleDrawEvent() {
    if (this.#raf) return;
    this.#raf = requestAnimationFrame(async () => {
      this.#raf = 0;
      await this.#syncFromCanvas(false);
      await this.#emit('signature:draw');
    });
  }

  async #syncFromCanvas(updateValue = true) {
    const dataUrl = this.toDataURL();
    this.#updateOutputs(dataUrl);
    if (updateValue) this.value = dataUrl;
    this.#updateFormValue(dataUrl);
  }

  #updateOutputs(dataUrl) {
    this.#signature.src = dataUrl || '';
    this.#imageBase64Field.value = dataUrl ? dataUrlToBase64(dataUrl) : '';
    this.toggleAttribute('signed', Boolean(dataUrl && !this.#isCanvasBlank()));
  }

  #updateFormValue(dataUrl = this.value) {
    const value = dataUrl || '';
    this.#internals?.setFormValue?.(value);
    if (this.#fallbackInput) {
      this.#fallbackInput.name = this.getAttribute('name') || '';
      this.#fallbackInput.value = value;
      this.#fallbackInput.disabled = !this.#fallbackInput.name || this.disabled;
    }
    if (this.required && !this.signed) {
      this.#internals?.setValidity?.({ valueMissing: true }, 'Please provide a signature', this.#canvas);
    } else {
      this.#internals?.setValidity?.({});
    }
  }

  async #emit(type) {
    const detail = await this.getSignatureData();
    this.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail
    }));
  }

  #redraw() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    for (const stroke of this.#strokes) {
      const [first, ...rest] = stroke.points;
      if (!first) continue;
      this.#drawDot(first);
      let last = first;
      for (const point of rest) {
        this.#drawSegment(last, point);
        last = point;
      }
    }
    this.#updateOutputs(this.#strokes.length ? this.toDataURL() : '');
  }

  #resizeCanvasPreservingImage() {
    const rect = this.#canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const oldDataUrl = this.signed ? this.toDataURL() : '';
    const dpr = window.devicePixelRatio || 1;
    const nextWidth = Math.max(1, Math.round(rect.width * dpr));
    const nextHeight = Math.max(1, Math.round(rect.height * dpr));

    if (this.#canvas.width === nextWidth && this.#canvas.height === nextHeight) return;

    this.#canvas.width = nextWidth;
    this.#canvas.height = nextHeight;

    if (oldDataUrl) {
      const image = new Image();
      image.onload = () => {
        this.#ctx.clearRect(0, 0, nextWidth, nextHeight);
        this.#ctx.drawImage(image, 0, 0, nextWidth, nextHeight);
        this.#updateOutputs(this.toDataURL());
        this.#updateFormValue();
      };
      image.src = oldDataUrl;
    } else {
      this.#redraw();
    }
  }

  #loadDataUrl(dataUrl) {
    if (!this.#canvas || !dataUrl) {
      this.#updateOutputs('');
      return;
    }
    const image = new Image();
    image.onload = () => {
      this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#ctx.drawImage(image, 0, 0, this.#canvas.width, this.#canvas.height);
      this.#updateOutputs(dataUrl);
      this.#updateFormValue(dataUrl);
    };
    image.src = dataUrl;
  }

  #isCanvasBlank() {
    const pixels = this.#ctx.getImageData(0, 0, this.#canvas.width, this.#canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 0) return false;
    return true;
  }

  #updateButtons() {
    this.#buttons.get('undo').disabled = !this.#strokes.length;
    this.#buttons.get('redo').disabled = !this.#redo.length;
    this.#buttons.get('clear').disabled = !this.signed;
  }

  #applyI18n() {
    const lang = (this.getAttribute('lang') || document.documentElement.lang || 'en').slice(0, 2);
    const t = I18N[lang] || I18N.en;
    this.#hint.textContent = t.signHere;
    this.#status.textContent = t.ready;
    this.#buttons.get('undo').textContent = t.undo;
    this.#buttons.get('redo').textContent = t.redo;
    this.#buttons.get('clear').textContent = t.clear;
  }

  #t(key) {
    const lang = (this.getAttribute('lang') || document.documentElement.lang || 'en').slice(0, 2);
    return (I18N[lang] || I18N.en)[key] || I18N.en[key] || key;
  }

  #ensureFallbackInput() {
    if (this.#internals?.setFormValue) return;
    if (!this.#fallbackInput) {
      this.#fallbackInput = document.createElement('input');
      this.#fallbackInput.type = 'hidden';
      this.after(this.#fallbackInput);
    }
    this.#fallbackInput.name = this.getAttribute('name') || '';
  }

  #upgradeProperty(prop) {
    if (!Object.prototype.hasOwnProperty.call(this, prop)) return;
    const value = this[prop];
    delete this[prop];
    this[prop] = value;
  }
}

customElements.define('netsi-signature', NetsiSignature);
