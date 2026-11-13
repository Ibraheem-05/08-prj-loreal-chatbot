# Project 8: L'Oréal Beauty Advisor

An independent student chatbot that helps visitors explore L'Oréal skincare, haircare, makeup, fragrances, and beauty routines.

## Live site

GitHub Pages: https://ibraheem-05.github.io/08-prj-loreal-chatbot/

Cloudflare API Worker: https://08-prj-loreal-chatbot.hq3717.workers.dev

## Architecture

The public website is hosted with GitHub Pages. The `script.js` frontend POSTs conversation messages to the standalone Cloudflare Worker. The Worker reads the encrypted `OPENAI_API_KEY` secret and calls the OpenAI Chat Completions API. **No API key is included in GitHub or frontend code.**

Main project files:
- `index.html`: L'Oréal branding and the chatbot interface
- `style.css`: mobile-responsive black, white, cream and gold design
- `script.js`: UI, Worker endpoint, message bubbles and conversational context
- `RESOURCE_cloudflare-worker.js`: deployed Worker source, no ASSETS binding
- `img/loreal-logo.png`: provided brand logo

## Rubric and LevelUps

- L'Oréal logo and branded visual design
- L'Oréal-specific system prompt: redirect unrelated queries to beauty topics
- Cloudflare Worker + encrypted API key
- **LevelUp: Conversation History (10 points)**: the frontend maintains prior user and assistant messages and sends up to 10 recent messages per request.
- **LevelUp: Display User Question (5 points)**: a dedicated Latest exchange panel displays the newest user question above its answer and resets for each submission.
- **LevelUp: Chat Conversation UI (10 points)**: distinct left-aligned assistant and right-aligned user message bubbles.
- Responsive layout, new-chat button, safe text rendering, error messages and loading indicators.

## Important

The deployed Cloudflare Worker is a **JSON API**, not the website. Opening its URL in a browser performs a GET health check; the chatbot works by sending POST requests to that address.

Cloudflare secret name: `OPENAI_API_KEY`. To update a compromised or invalid API key, replace the secret in the **existing** Worker and redeploy. Do not put keys in `secrets.js` or browser code; a local `secrets.js` used as a temporary assignment note must remain gitignored and should be deleted when no longer needed.

The optional `functions/api/chat.js` Cloudflare Pages implementation is not used by GitHub Pages. This assignment deploys the standalone Worker from `RESOURCE_cloudflare-worker.js`.

## Testing

1. Visit the GitHub Pages link above after publishing.
2. Ask: "What L'Oréal skincare routine works for someone who prefers simple products?"
3. Ask a follow-up: "What about for sensitive skin?" to check conversation context.
4. Ask: "What's the weather?" to verify polite redirection from unrelated topics.
5. Confirm the Latest exchange panel resets and the full chat retains earlier bubbles.
6. Test in a private window and on a mobile-sized screen.

If the Worker returns a 502 credentials error, confirm the configured OpenAI key and project model access. If it returns a 503 quota error, check OpenAI API billing and limits. OpenAI API billing is separate from ChatGPT.

Before making this demo widely public, apply Cloudflare rate limiting or equivalent protections and set API usage limits to help prevent unexpected charges.
