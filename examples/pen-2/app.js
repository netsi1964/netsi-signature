import './netsi-signature.js';

const translations = {
  en: {
    heroLead: 'A modern signature custom element with live events, image export, form participation and copy-ready code.',
    language: 'Language', theme: 'Theme', tryIt: 'Try it', fullName: 'Full name', submit: 'Submit form', reset: 'Reset',
    customize: 'Customize', strokeColor: 'Stroke color', strokeWidth: 'Stroke width', format: 'Output format', quality: 'Quality',
    features: 'Features', generatedCode: 'Generated code', copy: 'Copy', eventLog: 'Event log'
  },
  da: {
    heroLead: 'Et moderne signaturelement med live events, billedeksport, formular-understøttelse og copy-ready kode.',
    language: 'Sprog', theme: 'Tema', tryIt: 'Prøv det', fullName: 'Fulde navn', submit: 'Send formular', reset: 'Nulstil',
    customize: 'Tilpas', strokeColor: 'Stregfarve', strokeWidth: 'Stregtykkelse', format: 'Outputformat', quality: 'Kvalitet',
    features: 'Features', generatedCode: 'Genereret kode', copy: 'Kopiér', eventLog: 'Eventlog'
  },
  es: {
    heroLead: 'Un elemento moderno de firma con eventos en vivo, exportación de imagen, formularios y código listo para copiar.',
    language: 'Idioma', theme: 'Tema', tryIt: 'Pruébalo', fullName: 'Nombre completo', submit: 'Enviar formulario', reset: 'Restablecer',
    customize: 'Personalizar', strokeColor: 'Color del trazo', strokeWidth: 'Grosor del trazo', format: 'Formato de salida', quality: 'Calidad',
    features: 'Funciones', generatedCode: 'Código generado', copy: 'Copiar', eventLog: 'Registro de eventos'
  },
  zh: {
    heroLead: '一个现代签名自定义元素，支持实时事件、图像导出、表单参与和可复制代码。',
    language: '语言', theme: '主题', tryIt: '试用', fullName: '全名', submit: '提交表单', reset: '重置',
    customize: '自定义', strokeColor: '笔画颜色', strokeWidth: '笔画宽度', format: '输出格式', quality: '质量',
    features: '功能', generatedCode: '生成代码', copy: '复制', eventLog: '事件日志'
  }
};

const $ = selector => document.querySelector(selector);

const signature = $('#signature');
const language = $('#language');
const theme = $('#theme');
const strokeColor = $('#strokeColor');
const strokeWidth = $('#strokeWidth');
const strokeWidthValue = $('#strokeWidthValue');
const format = $('#format');
const quality = $('#quality');
const qualityValue = $('#qualityValue');
const generatedCode = $('#generatedCode');
const eventLog = $('#eventLog');
const copyCode = $('#copyCode');
const form = $('#signature-form');

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  signature.setAttribute('lang', lang);
  const dictionary = translations[lang] || translations.en;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = dictionary[node.dataset.i18n] || translations.en[node.dataset.i18n] || node.textContent;
  });
  updateGeneratedCode();
}

function updateGeneratedCode() {
  const code = `<netsi-signature
  name="signature"
  lang="${language.value}"
  required
  show-base64
  stroke-color="${strokeColor.value}"
  stroke-width="${strokeWidth.value}"
  format="${format.value}"
  quality="${quality.value}">
</netsi-signature>

<script type="module">
  import './netsi-signature.js';

  const signature = document.querySelector('netsi-signature');

  signature.addEventListener('signature:start', event => {
    console.log('Started', event.detail);
  });

  signature.addEventListener('signature:draw', event => {
    console.log('Drawing', event.detail.timeline.at(-1));
  });

  signature.addEventListener('signature:end', async event => {
    const { blob, dataUrl, base64, timeline } = event.detail;

    await fetch('/api/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signatureBase64: base64,
        signatureDataUrl: dataUrl,
        timeline
      })
    });
  });
</script>`;

  generatedCode.textContent = code;
}

function addEventLog(type, detail) {
  const item = document.createElement('li');
  const latest = detail.timeline.at(-1);
  const pressure = latest?.tryk == null ? 'n/a' : latest.tryk.toFixed(2);
  item.textContent = `${new Date().toLocaleTimeString()} · ${type} · ${detail.width}×${detail.height} · points: ${detail.timeline.length} · tryk: ${pressure}`;
  eventLog.prepend(item);
  while (eventLog.children.length > 8) eventLog.lastElementChild.remove();
}

function syncControls() {
  signature.setAttribute('stroke-color', strokeColor.value);
  signature.setAttribute('stroke-width', strokeWidth.value);
  signature.setAttribute('format', format.value);
  signature.setAttribute('quality', quality.value);
  strokeWidthValue.textContent = strokeWidth.value;
  qualityValue.textContent = quality.value;
  updateGeneratedCode();
}

language.addEventListener('change', () => applyLanguage(language.value));
theme.addEventListener('change', () => document.documentElement.dataset.theme = theme.value);
[strokeColor, strokeWidth, format, quality].forEach(control => control.addEventListener('input', syncControls));

copyCode.addEventListener('click', async () => {
  await navigator.clipboard.writeText(generatedCode.textContent);
  copyCode.textContent = translations[language.value]?.copy === 'Kopiér' ? 'Kopieret' : 'Copied';
  setTimeout(() => copyCode.textContent = translations[language.value]?.copy || 'Copy', 1000);
});

for (const type of ['signature:start', 'signature:draw', 'signature:end', 'signature:clear']) {
  signature.addEventListener(type, event => addEventLog(type, event.detail));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  console.table(Object.fromEntries(data.entries()));
});

applyLanguage('en');
syncControls();
