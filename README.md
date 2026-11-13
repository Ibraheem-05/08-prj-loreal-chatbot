# Project 8: L'Oréal-Inspired Beauty Advisor

A student demo chatbot for discovering skincare, makeup, haircare, fragrance, and beauty routines. Not an official L'Oréal product or an official recommendation engine.

## How it works

- `index.html`, `style.css` and `script.js`: frontend interface and chat history.
- `functions/api/chat.js`: server-side Cloudflare Pages Function at `POST /api/chat`.
- The browser **never** receives `OPENAI_API_KEY`. The backend calls OpenAI's Chat Completions API with `gpt-6-luna`.

## Run in GitHub Codespaces (or locally)

1. Create or rotate your API key at https://platform.openai.com/api-keys. Do not reuse a key that was shared in chat or committed to Git.
2. Make a copy of `.dev.vars.example` named `.dev.vars` in the project root.
3. Add your **new** key to `.dev.vars` as `OPENAI_API_KEY="sk-proj-..."`. The file is gitignored.
4. In a terminal at the repository root run:

   ```bash
   npx wrangler pages dev .
   ```

5. Open the forwarded port in Codespaces (usually port 8788). Do **not** open `index.html` with a static-only preview: the `/api/chat` endpoint requires Wrangler.

## Deploy to Cloudflare Pages

1. In https://dash.cloudflare.com, open **Workers & Pages** and create a **Pages** project using this GitHub repository as the Git source.
2. Select the `main` branch, use no build command, and set the build output directory to `.`.
3. In Pages **Settings → Variables and Secrets**, add `OPENAI_API_KEY` with your new OpenAI key and enable **Encrypt**. Save and redeploy if necessary.
4. Visit the Pages URL and ask a product question.

Cloudflare Pages automatically routes `functions/api/chat.js` to `/api/chat`. No Node backend or client-side API key is required.

## API request example

```json
{
  "messages": [{ "role": "user", "content": "Suggest a simple skincare routine." }]
}
```

Successful response: `{ "reply": "..." }`. Failures return a JSON `error` and an HTTP error status.

## Troubleshooting

- 503 saying key missing: configure `OPENAI_API_KEY` in Cloudflare or `.dev.vars`.
- 502 about credentials: rotate/check the key, project permissions, and OpenAI API access.
- 503 about rate limits: check your OpenAI API usage, credits and rate limits.
- 404 on `/api/chat`: the website was opened with a static server rather than Cloudflare Pages Functions.
- OpenAI API billing is separate from ChatGPT subscriptions. Before sharing this demo publicly, set project spend controls and Cloudflare rate-limiting/WAF rules to reduce abuse.

Keep API secrets out of the browser, Git commits, screenshots and logs.
