# Live Chat on sringeri.net

The same Sringeri Live Chat that devotees use inside the app can run on the
public website. Website visitors are anonymous — the AI assistant answers first,
a live agent can take over when the team is online, and when nobody is online the
concern is captured by email with the usual 2–4 hour promise. Everything lands in
the same queue under **Admin → Support & Live Chat**, tagged **Website**.

## Installing it

Paste one line just before `</body>` on every page of the website:

```html
<script src="https://<sringeri-app-domain>/embed/live-chat.js" defer></script>
```

The exact line, with the correct domain already filled in, is shown in the admin
console under **Chat on sringeri.net → Copy install code**.

That is the only change the website ever needs. Colour, corner, greeting and the
on/off switch are all controlled from the admin console afterwards.

Optional per-page overrides, if a particular page needs something different:

```html
<script src="https://<domain>/embed/live-chat.js" defer
        data-accent="#0F766E" data-position="bottom-left"></script>
```

## What the team controls remotely

In **Admin → Support & Live Chat → Chat on sringeri.net**:

- **Show the chat widget** — turns the widget off on the whole website instantly.
- **Opening greeting** — the first message website visitors see.
- **Colour** and **Corner** — the launcher and panel styling.
- **Extra websites allowed** — additional sites permitted to use the chat.

## How it is kept safe

- Only allow-listed sites may talk to the chat API. `sringeri.net`,
  `www.sringeri.net`, `sringerimutt.org` and `www.sringerimutt.org` are always
  allowed; anything else must be added in the admin console (or via the
  `CHAT_EMBED_ORIGINS` environment variable). Any other site gets a clear refusal.
- The widget renders inside a shadow root, so the website's CSS cannot affect it
  and it cannot affect the website.
- Each visitor gets a random id stored in their own browser. Returning to the
  site on the same device resumes the same conversation; there is no link to a
  devotee account.
- The chat API is rate limited per network address: 30 messages a minute, and a
  separate, roomier ceiling for the background polling the widget does while a
  chat is open.
- If the chat service is unreachable, the script fails silently — the website is
  never broken by it.

## Notes

- The bundle is cached for five minutes, so improvements reach the website
  without the website team doing anything.
- The bundle is plain JavaScript with no dependencies and no build step; it lives
  at `client/public/embed/live-chat.js`.
