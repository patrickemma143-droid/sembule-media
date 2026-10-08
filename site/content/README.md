# Website content contract

`site-content.json` is the public, structured content source for the Homepage, About, and Services pages. The OS editor can be connected to this contract later without placing editing controls or credentials on the public website.

## Runtime behavior

- These pages read the URL in the `sembule-site-content` meta tag. It currently points to `./content/site-content.json`.
- The website requests the document without browser caching when a page loads.
- A document is accepted only when `schemaVersion` is `1`.
- If the request fails, times out, or returns a different schema version, the page keeps its existing HTML copy and its normal navigation and interactions continue to work.
- Text is inserted with `textContent`. Links and images accept same-origin paths or HTTPS URLs; the public site never receives OS write credentials.

## Editable content

- `home.hero`: four existing story slides, their image and alt text, the sample video URL, and both hero actions.
- `home.servicesIntro`, `home.aboutIntro`, and `home.callToAction`.
- `about.hero`, `about.story`, the three value statements, coverage copy, statement, and call to action.
- `services.hero`, the eight existing service entries, and the service callout.

The current page templates have fixed slots: four hero slides, three featured services, three About values, and eight service rows. The editor can update the content in each slot; changing the number or order of slots needs a coordinated template change, especially because the final hero slide contains the video player.

## OS integration boundary

The OS should authenticate and authorize editors when saving and publishing content. It can later publish a schema-versioned JSON document to an approved public read endpoint and update the meta URL on the three pages. Keep write tokens server-side in the OS/backend. Use HTTPS image URLs or paths hosted under the website, and retain useful alt text. Do not point the public read URL at draft content.

The current JSON file is the website’s fallback source and example document. This prepares the front end for a later OS connection; it does not yet provide OS editing, draft storage, publishing, or live updates to pages that are already open.
