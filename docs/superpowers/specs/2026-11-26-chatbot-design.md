# JSC Oscars chatbot: design

Status: awaiting approval. Nothing is built.

## Intent and why
Members want to ask the app questions in plain language: how to do something, stats and trivia about the group, a bit of fun, and "where is X" with a quick link. A chat helper replaces hunting through screens. Audience: the 14 members (committee included).

## Goals
- One chat that handles four things: how to use the app, stats and trivia, light jokes, and quick links to pages.
- Answers about stats and winners are accurate (read from the real data, never guessed).
- Free to run, always on, and swappable to another model later without changing the app.
- Per-person daily limit, plus an overall cap under the free quota, with friendly messages when hit.

## Non-goals
- Training or fine-tuning a model. Facts come from lookups at question time.
- Voting, editing, or any action in the app. The bot only answers and links.
- Remembering past conversations across days (a chat lasts as long as the open sheet).
- Hosting our own model for now (Hugging Face Space / Ollama is a possible later swap).

## Anti-goals (a failure even if it technically works)
- Leaking anything the member couldn't already see: unreleased results, other people's votes, emails, other people's private data (e.g. Trophy shelf).
- Teasing or roasting people. Humor is allowed (puns, light jokes about the app and the Oscars), never digs at a member's wins, losses, nominations or personal traits. Decided by the user: "no teasing".
- Made-up links or made-up stats.

## Constraints
- Stack today: static React app on Vercel, Supabase (Postgres, Auth, RLS). No server functions exist yet.
- Free tiers only. Model host: Groq (user's choice). Groq limits requests and tokens per minute and per day; exact free-tier numbers must be read from the Groq console before launch.
- Data privacy: free-tier providers may log prompts, so only non-sensitive, member-visible, group-level data goes in a prompt.

## Approaches considered
- A. Put everything in the prompt every time. Simple, but burns tokens and gets less reliable as data grows.
- B. Tools only (model calls lookups). Accurate and cheap, but the how-to and personality still need a place to live.
- C. Hybrid (chosen by the user): short fixed system prompt (app guide, personality, allowed links) plus tools for live data.

## Design (decided)
Parts:
1. **Edge function `chat`** (Supabase Edge Function, Deno/TypeScript).
   - Input: the member's login token and the chat messages so far. Output: the assistant's reply text.
   - Verifies the token. Runs all database lookups as that member, so existing row-level security keeps unreleased data hidden.
   - Calls Groq's chat API (OpenAI-compatible) with tool calling. The API key is a Supabase secret, never in the app.
   - Loops: model asks for a tool, function runs it, result goes back, until the model answers (max a few steps).
2. **System prompt**: what the app is, a short how-to guide, the friendly no-teasing personality, rules (only answer from tool results or the guide; say when it doesn't know; keep answers short), and the list of linkable pages.
3. **Tools** (first set): member's own stats, leaderboard and group stats (past seasons and released current season), winners of a season or category, ballots and when they close, ceremony date/place, Make Your Own Categories window status. More can be added later.
4. **Quick links**: the model writes a marker like `[[go:/app/results|Results]]`. The function and the app both check the path against an allowlist of real routes; anything else is shown as plain text. The allowlist is derived from the app's routes.
5. **Limits**: a small table counts questions per member per day (starting cap: 20) and a global daily counter (cap kept below the Groq free quota). Over the cap returns a friendly message, not an error. The cap values are settings.
6. **Model**: a Llama 70B-class model on Groq, with a smaller, faster one as automatic fallback if the main one is rate-limited. Exact current model names confirmed at build time. The model name and base URL are settings so another provider can be swapped in.

Build order (from the user): (1) the edge function and model, tested by itself with curl; (2) integration, meaning the tools, data and links working end to end; (3) the chat UI in the app (a floating button opening a chat sheet, link markers rendered as buttons, limit and error states, a "thinking" state).

## Left to the builder
- Exact tool names and return shapes, and how much data each returns (keep small).
- Where the usage-count table and its policies live (a new manual migration the user runs in the SQL Editor, as with earlier features).
- Streaming vs. whole-answer replies (whole answer is fine to start).
- The chat UI design, within the app's existing tokens, Sheet and Button components.
- Choosing the starting caps once the real Groq free-tier numbers are known.

## Open items for the user to do later
- Create a Groq account and API key; add it as a Supabase secret.
- Run the usage-table migration when it exists.
- Check the Groq console for the free-tier limits.
