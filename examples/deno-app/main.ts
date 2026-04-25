const ROOT = new URL('../../', import.meta.url);
const PUBLIC = new URL('./public/', import.meta.url);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isDataImage(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(value);
}

async function readText(url: URL): Promise<string> {
  return await Deno.readTextFile(url);
}

async function staticResponse(pathname: string): Promise<Response> {
  const map: Record<string, { url: URL; type: string }> = {
    '/': { url: new URL('./index.html', PUBLIC), type: 'text/html; charset=utf-8' },
    '/app.js': { url: new URL('./app.js', PUBLIC), type: 'text/javascript; charset=utf-8' },
    '/styles.css': { url: new URL('./styles.css', PUBLIC), type: 'text/css; charset=utf-8' },
    '/netsi-signature.js': { url: new URL('./src/netsi-signature.js', ROOT), type: 'text/javascript; charset=utf-8' },
  };

  const item = map[pathname];
  if (!item) return html('<h1>404</h1><p>Not found.</p>', 404);

  return new Response(await readText(item.url), {
    headers: { ...corsHeaders, 'content-type': item.type },
  });
}

async function parseSubmittedSignature(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return await req.json();
  }

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }

  const body = await req.text();
  return { rawBody: body };
}

function normalizeSubmission(input: Record<string, unknown>) {
  const signature = input.signature ?? input.image ?? input.dataUrl ?? input.signatureDataUrl ?? '';
  const fullName = input.fullName ?? input.name ?? '';
  let metadata: unknown = input.signature_meta ?? input.metadata ?? {};

  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = { raw: metadata };
    }
  }

  return {
    receivedAt: new Date().toISOString(),
    fullName,
    signature,
    metadata,
    fields: Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'signature')),
  };
}

function receiptPage(submission: ReturnType<typeof normalizeSubmission>): string {
  const signatureHtml = isDataImage(submission.signature)
    ? `<img class="signature-preview" src="${escapeHtml(submission.signature)}" alt="Submitted signature">`
    : '<p class="warning">No valid data:image/* signature was submitted.</p>';

  return `<!doctype html>
<html lang="en" data-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Netsi Signature receipt</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="page narrow">
    <a href="/">← Back to demo</a>
    <h1>Submitted signature</h1>
    <section class="card">
      <h2>Signature</h2>
      ${signatureHtml}
    </section>
    <section class="card">
      <h2>Metadata</h2>
      <dl class="meta">
        <dt>Received at</dt><dd>${escapeHtml(submission.receivedAt)}</dd>
        <dt>Full name</dt><dd>${escapeHtml(submission.fullName)}</dd>
      </dl>
      <pre><code>${escapeHtml(JSON.stringify(submission.metadata, null, 2))}</code></pre>
    </section>
  </main>
</body>
</html>`;
}

async function handleSubmit(req: Request): Promise<Response> {
  const parsed = await parseSubmittedSignature(req);
  const submission = normalizeSubmission(parsed);

  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('application/json')) {
    return json({ ok: true, submission });
  }

  return html(receiptPage(submission));
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === 'POST' && (url.pathname === '/submit' || url.pathname === '/api/signatures')) {
    return await handleSubmit(req);
  }

  if (req.method === 'GET') {
    return await staticResponse(url.pathname);
  }

  return json({ ok: false, error: 'Method not allowed' }, 405);
});
