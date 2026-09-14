# Landing Page Build Prompt (Reusable Template)

Paste this as your opening prompt whenever you start a new landing page — in Claude Design, Claude Code, or plain chat. It heads off the exact bug you just hit: Claude Design's "export as HTML" can produce a self-unpacking bundle (base64 images/fonts, a JS "unpacker," and `<image-slot>` placeholder tags) instead of a real static file. That bundle can silently fail to render on mobile even though it looks fine on desktop.

---

## The prompt

```
Build me a [describe: retreat / course / event] landing page with these
sections: [hero, course info, agenda, faculty, pricing, FAQ, registration —
edit as needed].

Critical technical requirements for the final deliverable — this matters
more than it might sound like:

1. Output a single, plain, self-contained static index.html (plus a small
   /images and /fonts folder if needed) — NOT a Claude Design "export/
   bundler" file. The final file must NOT contain:
   - Any <script type="__bundler/..."> blocks
   - Any embedded base64 image or font data
   - Any <image-slot> or other non-standard placeholder element — use real
     <img src="..."> tags pointing to real image files

2. The page must render fully and correctly with JavaScript completely
   disabled. No Blob URLs, no client-side "unpacking" step, nothing that
   depends on DecompressionStream or postMessage just to display content.

3. Mobile-first responsive: a real viewport meta tag, fluid typography via
   clamp(), and flexible grid/flexbox layouts. Explicitly consider a
   phone-width layout, not just desktop.

4. Images: real separate files in efficient formats (WebP or JPEG for
   photos — not PNG for photographic images), sized reasonably for web
   (hero image well under 500KB, not multiple MB).

5. Fonts: self-hosted local files or a CDN link (e.g. Google Fonts) — never
   inlined as base64.

6. Before calling it done, verify and tell me: total page weight (should be
   low hundreds of KB to a couple MB, not 5–7MB), no leftover UUID-style
   placeholder references, and that it renders correctly as a plain local
   file with JavaScript disabled.

Let me know once it's built so I can review before deploying to Netlify.
```

---

## Quick check before you trust any future export

If you ever export from Claude Design again and want to sanity-check it yourself before testing on mobile, open the file and search for:

- `__bundler` — if present, it's the fragile export format, not a deployable file
- `image-slot` — a design-tool-only placeholder, not real markup
- A file size in the megabytes for what should be a lightweight page

Any of those means: ask for a rebuild into plain static files using the prompt above, rather than debugging it on-device.
