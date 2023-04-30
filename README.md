# gamejolt-dl
Extremely barebones Gamejolt game scraper in NodeJS. Originally made this to scrape every EXE game off GJ for halloween and couldn't be bothered to download several thousand games by hand. 

*WARNING*: It is probably fairly buggy and is very aggressive with the API -- try not to get ratelimited/blacklisted.

*WARNING*: It is indiscriminate and will probably download literal gigabytes of garbage content for any moderately-popular search term.

```npm install```

```node index.js -s "<search term>"```

You can optionally supply the `-all` flag to download games that have any downloadable build, instead of specifically Windows.
