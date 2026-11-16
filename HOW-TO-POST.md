# Posting to zayeedbinkabir.com

GitHub Pages rebuilds the site about a minute after every push to `main`.
The homepage's Writing and Travel sections, the /writing/ and /travel/ pages,
and the RSS feed (/feed.xml) all update automatically.

## Weekly writing (1 to 2 per week)

1. Copy `templates/weekly-post.md` to `_posts/2026-11-17-your-slug.md`.
   The date in the filename is the publish date and decides which week it's grouped under.
2. Fill in the title, dek, tags and sources, then write the body in Markdown.
3. If it also ran in The Ticker, add `ticker_url:` and a link card appears.
4. Commit and push. It goes live at `/writing/2026/11/17/your-slug/`.

## Monthly travel

1. Make a folder `assets/travel/2026-11-place/` and add `cover.jpg` plus the photos.
   Resize them first to about 2000px on the long edge and under 500 KB each.
   On a Mac: open them in Preview, then Tools → Adjust Size.
2. Copy `templates/trip.md` to `_travel/2026-11-place.md` and fill it in.
3. Commit and push. It goes live at `/travel/2026-11-place/`.

## Tips

- Add `hidden: true` to the front matter to publish a page at its URL without
  listing it anywhere. Handy for previewing before it goes public.
- You can also post from your phone: on github.com open the repo, go to the
  `_posts` folder, then Add file → Create new file.
