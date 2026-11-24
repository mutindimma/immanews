// Adds series editions (from series-feed.js) to the main story list, so they
// appear in "Latest Stories", Trending and the "History & Heritage" tab.
// Each links to its own page instead of opening in the pop-up reader.
(() => {
  if (typeof NEWS === "undefined" || !Array.isArray(window.SERIES_FEED)) return;
  window.SERIES_FEED.forEach((f) => {
    if (NEWS.some((n) => n.url === f.url)) return;
    NEWS.push({
      title: f.title, category: f.category, date: f.date, image: f.image,
      summary: f.summary, url: f.url, caption: f.credit, body: "", series: f.series
    });
  });
})();
