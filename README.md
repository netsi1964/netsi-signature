# netsi-signature

A modern vanilla JavaScript signature custom element.

Vibecoded by Netsi1964 using ChatGPT 5.5.

## Install

```bash
npm install netsi-signature
```

```ts
import 'netsi-signature';
```

With JSR / Deno:

```ts
import '@netsi1964/netsi-signature';
```

Or explicitly:

```ts
import 'jsr:@netsi1964/netsi-signature';
```

## Use

```html
<form method="post">
  <label>
    Full name
    <input name="fullName" autocomplete="name" required>
  </label>

  <netsi-signature name="signature" required show-base64></netsi-signature>

  <button>Submit</button>
</form>
```

```js
import 'netsi-signature';

const signature = document.querySelector('netsi-signature');

signature.addEventListener('signature:end', (event) => {
  console.log(event.detail.dataUrl);
  console.log(event.detail.base64);
  console.log(event.detail.blob);
  console.log(event.detail.imageData);
  console.log(event.detail.timeline);
});
```

## Simple test of using `netsi-signature` from NPM (CodePen)

See a simple test that imports `netsi-signature` from npm:

```txt
https://codepen.io/netsi1964/pen/NPRQbPz?editors=1010
```

## Event detail

Events include:

1. `signature:start`
2. `signature:draw`
3. `signature:end`
4. `signature:clear`

The event payload contains:

```ts
{
  blob: Blob | null,
  file: File | null,
  imageData: ImageData | null,
  dataUrl: string,
  base64: string,
  timeline: Array<{
    time: number,
    coordinate: { x: number, y: number },
    tryk: number | null
  }>,
  strokes: Array<Array<TimelinePoint>>,
  mimeType: string,
  timestamp: string,
  isEmpty: boolean,
  width: number,
  height: number
}
```

`tryk` is based on PointerEvent pressure when supported by the browser and input device.

## Run the Deno demo app

```bash
deno task demo
```

Then open:

```txt
http://localhost:8000
```

The demo submits to `/submit`, which renders a receipt route showing metadata and the signature image.

## Deno Deploy EA

Deploy the Deno demo app:

```bash
deno deploy create
```

or from the repo root:

```bash
deno task deploy
```

The app exposes:

1. `GET /` — demo form
2. `POST /submit` — HTML receipt for normal form submits
3. `POST /api/signatures` — JSON endpoint for CodePen/fetch demos
4. `GET /netsi-signature.js` — local module for the demo

The demo backend returns permissive CORS headers for examples and CodePen usage. Tighten this for production.

## Publish

### npm

Recommended: configure npm Trusted Publishing for this GitHub repository, then publish from GitHub Actions.

Local fallback:

```bash
npm publish --provenance --access public
```

### JSR

Create the package on JSR as:

```txt
@netsi1964/netsi-signature
```

Then publish:

```bash
deno publish --dry-run
deno publish
```

For tokenless GitHub Actions publishing, link the JSR package to this GitHub repository in the package settings.

## Buy me a coffee

Replace this URL if needed:

```txt
https://www.buymeacoffee.com/Netsi1964
```

## License

MIT
