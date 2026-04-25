const signature = document.querySelector('#signature');
const meta = document.querySelector('#signature-meta');
const form = document.querySelector('#signature-form');
const fetchExample = document.querySelector('#fetch-example');

function lightMetadata(detail) {
  return {
    timestamp: detail.timestamp,
    mimeType: detail.mimeType,
    width: detail.width,
    height: detail.height,
    isEmpty: detail.isEmpty,
    timeline: detail.timeline,
    strokes: detail.strokes,
  };
}

signature.addEventListener('signature:end', (event) => {
  meta.value = JSON.stringify(lightMetadata(event.detail));
});

signature.addEventListener('signature:clear', () => {
  meta.value = '';
});

form.addEventListener('reset', () => {
  signature.clear();
  meta.value = '';
});

fetchExample.textContent = `import 'https://esm.sh/netsi-signature';

const signature = document.querySelector('netsi-signature');

signature.addEventListener('signature:end', async (event) => {
  await fetch('https://YOUR-DENO-DEPLOY-APP.deno.dev/api/signatures', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      fullName: 'Ada Lovelace',
      signature: event.detail.dataUrl,
      metadata: {
        timestamp: event.detail.timestamp,
        timeline: event.detail.timeline,
        strokes: event.detail.strokes
      }
    })
  });
});`;
