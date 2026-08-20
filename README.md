# Mask Taster

An unofficial, English-language fan analysis prototype built around one task:
the Series 10 basket-of-balls task.

## Current prototype

- Click a relationship type: Suspicion, Risk, or Countermove.
- Click two cards to connect them on the corkboard.
- Submit after all three relationship types are present.
- Each connection is reviewed as confirmed, interpretive, or untested.
- Historical programme facts remain separate from counterfactual strategies.
- Ask Alex Anything always returns: “All the information is on the task.”
- Progress is stored only in the current browser.

The current Alex panel and scene cards are deliberate asset placeholders. Pixel
art can be added later without changing the interaction model.

## Artwork slots

Future production assets should use transparent PNG, a consistent canvas and
integer scaling. Suggested structure:

```
public/
  art/
    alex/
      mask-100.png
      mask-70.png
      mask-35.png
      mask-0.png
    greg/
      verdict.png
    task-m/
      basket.png
      balls.png
      matchbox.png
```

## Development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Production validation:

```sh
npm run build
npm run lint
```

## GitHub and hosting

The source repository may be private. Repository visibility and website
visibility are independent choices.

This checkout currently includes its existing Sites hosting manifest and build
adapter. Before moving to a different host, keep a migration branch and remove
host-specific files only after the replacement deployment works.

For a public site backed by private source, a private GitHub repository can be
connected to a host such as Cloudflare Pages or Vercel. GitHub Pages plan and
visibility rules should be checked at migration time.

## Fan-project boundary

Mask Taster is not affiliated with the programme or its rights holders. Avoid
official video, audio, logos, fonts and screenshots. Keep direct quotations
limited to what the analysis genuinely requires, and distinguish broadcast
facts from interpretation.
