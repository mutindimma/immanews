"""
Build the "Before They Became Famous" series pages from
series/before-they-became-famous/editions.json.

    python tools/build_series.py            # published editions only (use before publishing)
    python tools/build_series.py --preview  # also builds drafts, marked DRAFT + noindex, for local review

Outputs:
    history/before-they-became-famous/index.html        series landing page
    history/before-they-became-famous/<slug>.html       one page per edition
    series-feed.js                                      homepage feature + History & Heritage tab
    sitemap.xml                                         published editions added
"""
import html, json, math, pathlib, re, sys, datetime
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parent.parent
if sys.platform == "win32" and not str(ROOT).startswith("\\\\?\\"):
    ROOT = pathlib.Path("\\\\?\\" + str(ROOT))   # allow paths longer than 260 characters on Windows
SITE = "https://immanews.com"
DATA = ROOT / "series" / "before-they-became-famous" / "editions.json"
OUT = ROOT / "history" / "before-they-became-famous"
PREVIEW = "--preview" in sys.argv

e = lambda s: html.escape(str(s or ""), quote=True)


def fmt_date(d):
    if not d:
        return "Unpublished draft"
    x = datetime.date.fromisoformat(d)
    return f"{x.day} {x.strftime('%B %Y')}"


def words(text):
    return len(re.findall(r"[A-Za-z0-9’']+", re.sub(r"\{\{figure:\w+\}\}", "", text)))


def figure(img, eager=False):
    mod = f" {e(img['modified'])}" if img.get("modified") else ""
    return f'''
      <figure class="bf-figure">
        <img src="{e(img['src'])}" alt="{e(img['alt'])}" {"" if eager else 'loading="lazy" '}decoding="async">
        <figcaption>
          <span class="bf-cap">{e(img['caption'])}</span>
          <span class="bf-credit">Photo: <a href="{e(img['sourceUrl'])}" target="_blank" rel="noopener">{e(img['credit'])}</a> ·
            <a href="{e(img['licenceUrl'])}" target="_blank" rel="noopener">{e(img['licence'])}</a>.{mod}</span>
        </figcaption>
      </figure>'''


def render_body(ed):
    out, first = [], True
    for block in ed["body"].split("\n\n"):
        block = block.strip()
        m = re.fullmatch(r"\{\{figure:(\w+)\}\}", block)
        if m:
            out.append(figure(ed["images"][m.group(1)]))
        elif block.startswith("## "):
            out.append(f'      <div class="bf-rule" aria-hidden="true"><span>✦</span></div>\n      <h2>{e(block[3:])}</h2>')
        elif block:
            cls = ' class="bf-lede"' if first else ""
            out.append(f"      <p{cls}>{e(block)}</p>")
            first = False
    return "\n".join(out)


def head(title, desc, url, image, image_alt, extra="", noindex=False, og_type="website"):
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}">
  {'<meta name="robots" content="noindex, nofollow">' if noindex else ''}
  <link rel="canonical" href="{e(url)}">
  <link rel="icon" type="image/png" href="/images/favicon.png">
  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="IMMA News">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:url" content="{e(url)}">
  <meta property="og:image" content="{e(SITE + image)}">
  <meta property="og:image:alt" content="{e(image_alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(title)}">
  <meta name="twitter:description" content="{e(desc)}">
  <meta name="twitter:image" content="{e(SITE + image)}">
  <meta name="theme-color" content="#04163a">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/pages.css">
  <link rel="stylesheet" href="/series.css">
{extra}</head>
<body class="bf">
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a href="/index.html" class="logo" aria-label="IMMA News home"><img src="/images/imma-news-emblem.png" alt=""><span class="logo-text"><b>IMMA</b><i>NEWS</i></span></a>
      <form class="searchbox" action="/index.html" method="get" role="search">
        <input type="search" name="q" placeholder="Search the news" aria-label="Search the news">
        <button type="submit" aria-label="Search"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/></svg></button>
      </form>
      <div class="top-links">
        <a href="/about.html">About Us</a>
        <a href="/signin.html" data-auth-link>Sign in</a>
        <a href="/contact.html" class="pill">Contact</a>
      </div>
    </div>
    <nav class="catbar" aria-label="News categories"><div class="wrap catbar-inner" id="filters" data-links></div></nav>
  </header>
'''


FOOT = '''
  <footer class="footer">
    <div class="wrap footer-inner">
      <a href="/index.html" class="footer-logo"><img src="/images/imma-news-logo.png" alt="IMMA News"></a>
      <nav aria-label="Footer"><a href="/about.html">About Us</a><a href="/contact.html">Contact</a><a href="/about.html#editorial">Editorial Standards</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></nav>
      <p class="owner">A publication of <img src="/images/imma-media-logo.png" alt="IMMA Media"></p>
      <p>© <span id="year"></span> IMMA Media · Content • Broadcast • Production. IMMA News is owned and published by IMMA Media.</p>
    </div>
  </footer>
  <script src="/config.js"></script>
  <script src="/news.js"></script>
  <script src="/series-feed.js"></script>
  <script src="/series-feed-merge.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
  <script src="/auth.js"></script>
  <script src="/site.js"></script>
  <script src="/series.js"></script>
</body>
</html>
'''


def article_page(series, ed, eds):
    url = f"{SITE}/history/{series['slug']}/{ed['slug']}.html"
    cover = ed["images"][ed["cover"]]
    mins = max(1, math.ceil(words(ed["body"]) / 220))
    draft = ed["status"] != "published"
    ld_article = {
        "@context": "https://schema.org", "@type": "Article",
        "headline": ed["title"], "description": ed["metaDescription"],
        "image": [SITE + cover["src"]],
        "author": {"@type": "Organization", "name": ed["author"]},
        "publisher": {"@type": "Organization", "name": "IMMA News", "logo": {"@type": "ImageObject", "url": SITE + "/images/imma-news-logo.png"}},
        "mainEntityOfPage": url, "articleSection": series["category"], "keywords": ", ".join(ed["tags"]),
        "isPartOf": {"@type": "CreativeWorkSeries", "name": series["name"], "url": f"{SITE}/history/{series['slug']}/"},
    }
    if ed.get("date"):
        ld_article["datePublished"] = ed["date"]
    ld_crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": series["category"], "item": SITE + "/index.html?c=History%20%26%20Heritage"},
        {"@type": "ListItem", "position": 3, "name": series["name"], "item": f"{SITE}/history/{series['slug']}/"},
        {"@type": "ListItem", "position": 4, "name": f"Edition {ed['edition']}", "item": url}]}
    extra = (f'  <meta property="article:section" content="{e(series["category"])}">\n'
             + (f'  <meta property="article:published_time" content="{e(ed["date"])}">\n' if ed.get("date") else "")
             + f'  <script type="application/ld+json">{json.dumps(ld_article, ensure_ascii=False)}</script>\n'
             + f'  <script type="application/ld+json">{json.dumps(ld_crumbs, ensure_ascii=False)}</script>\n')
    others = [o for o in eds if o is not ed]
    more = "".join(f'''
          <a class="bf-mini" href="/history/{series['slug']}/{o['slug']}.html">
            <img src="{e(o['images'][o['cover']]['src'])}" alt="" loading="lazy">
            <span><small>Edition {e(o['edition'])}</small><b>{e(o['title'])}</b></span>
          </a>''' for o in others[:3]) or '<p class="bf-soon">More editions are on the way: a new story every Sunday.</p>'
    share_text = f"{ed['title']} — {series['name']}, IMMA News"
    sources = "".join(f'''
          <li><a href="{e(s['url'])}" target="_blank" rel="noopener">{e(s['name'])}</a><span>{e(s['supports'])}</span></li>''' for s in ed["sources"])
    return head(ed["seoTitle"] + " · IMMA News", ed["metaDescription"], url, cover["src"], cover["alt"], extra, noindex=draft, og_type="article") + f'''
  <main class="bf-page">
    {'<p class="bf-draft-banner" role="status">DRAFT PREVIEW — not published. Only visible on your computer.</p>' if draft else ''}
    <nav class="bf-crumbs wrap" aria-label="Breadcrumb">
      <a href="/index.html">Home</a><span>›</span>
      <a href="/index.html?c=History%20%26%20Heritage">{e(series['category'])}</a><span>›</span>
      <a href="/history/{series['slug']}/">{e(series['name'])}</a><span>›</span>
      <span aria-current="page">Edition {e(ed['edition'])}</span>
    </nav>

    <article class="bf-article">
      <header class="bf-head">
        <p class="bf-kicker">{e(series['category'])} <i>·</i> {e(series['name'])} <i>·</i> Edition {e(ed['edition'])}</p>
        <h1>{e(ed['title'])}</h1>
        <p class="bf-dek">{e(ed['dek'])}</p>
        <p class="bf-meta">By <b>{e(ed['author'])}</b> <i>·</i> <time{f' datetime="{e(ed["date"])}"' if ed.get('date') else ''}>{e(fmt_date(ed.get('date')))}</time> <i>·</i> {mins} min read</p>
      </header>
{figure(cover, eager=True)}

      <div class="bf-body">
{render_body(ed)}
      </div>

      <div class="bf-share" aria-label="Share this article">
        <span>Share</span>
        <a class="bf-share-btn" target="_blank" rel="noopener" href="https://wa.me/?text={e(quote(share_text + ' ' + url))}">WhatsApp</a>
        <a class="bf-share-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u={e(quote(url, safe=''))}">Facebook</a>
        <a class="bf-share-btn" target="_blank" rel="noopener" href="https://x.com/intent/post?url={e(quote(url, safe=''))}&amp;text={e(quote(share_text))}">X</a>
        <button type="button" class="bf-share-btn" data-copy-link="{e(url)}">Copy link</button>
      </div>

      <section class="bf-sources" aria-labelledby="bf-src-title">
        <h2 id="bf-src-title">Sources &amp; Historical References</h2>
        <ol>{sources}
        </ol>
        <p class="bf-note">{e(series['editorialNote'])} The written article is © IMMA Media; each photograph remains under the licence shown in its caption.</p>
      </section>
    </article>

    <aside class="bf-more wrap" aria-labelledby="bf-more-title">
      <div class="bf-rule" aria-hidden="true"><span>✦</span></div>
      <h2 id="bf-more-title">More from {e(series['name'])}</h2>
      <div class="bf-more-list">{more}
      </div>
      <p><a class="bf-link" href="/history/{series['slug']}/">View all editions →</a></p>
    </aside>
  </main>
''' + FOOT


def landing_page(series, eds):
    url = f"{SITE}/history/{series['slug']}/"
    latest = eds[0] if eds else None
    def card(ed):
        img = ed["images"][ed["cover"]]
        return f'''
        <a class="bf-card" href="/history/{series['slug']}/{ed['slug']}.html">
          <img src="{e(img['src'])}" alt="{e(img['alt'])}" loading="lazy">
          <span class="bf-card-text">
            <small>Edition {e(ed['edition'])} · {e(fmt_date(ed.get('date')))} · {max(1, math.ceil(words(ed['body']) / 220))} min read</small>
            <b>{e(ed['title'])}</b>
            <span>{e(ed['excerpt'])}</span>
            <em>Read more →</em>
          </span>
        </a>'''
    feat = ""
    if latest:
        img = latest["images"][latest["cover"]]
        feat = f'''
      <section class="bf-feature wrap" aria-labelledby="bf-latest">
        <a class="bf-feature-img" href="/history/{series['slug']}/{latest['slug']}.html"><img src="{e(img['src'])}" alt="{e(img['alt'])}"></a>
        <div>
          <p class="bf-kicker">Latest · Edition {e(latest['edition'])} · {e(latest['topic'])}</p>
          <h2 id="bf-latest"><a href="/history/{series['slug']}/{latest['slug']}.html">{e(latest['title'])}</a></h2>
          <p class="bf-dek">{e(latest['excerpt'])}</p>
          <p class="bf-meta">{e(latest['author'])} <i>·</i> {max(1, math.ceil(words(latest['body']) / 220))} min read</p>
          <a class="bf-btn" href="/history/{series['slug']}/{latest['slug']}.html">Read the story</a>
          <p class="bf-photo-credit">Photo: {e(img['credit'])} · {e(img['licence'])}</p>
        </div>
      </section>'''
    previous = "".join(card(x) for x in eds[1:]) or '<p class="bf-soon">Earlier editions will appear here. A new story is published every Sunday.</p>'
    return head(f"{series['name']} · IMMA News", series["description"], url, (latest["images"][latest["cover"]]["src"] if latest else "/images/og-image.png"),
                "Before They Became Famous", noindex=bool(latest and latest["status"] != "published")) + f'''
  <main class="bf-page">
    <nav class="bf-crumbs wrap" aria-label="Breadcrumb">
      <a href="/index.html">Home</a><span>›</span>
      <a href="/index.html?c=History%20%26%20Heritage">{e(series['category'])}</a><span>›</span>
      <span aria-current="page">{e(series['name'])}</span>
    </nav>
    <header class="bf-masthead wrap">
      <p class="bf-kicker">IMMA News <i>·</i> {e(series['category'])}</p>
      <h1>{e(series['name'])}</h1>
      <p class="bf-tagline">{e(series['tagline'])}</p>
      <div class="bf-rule" aria-hidden="true"><span>✦</span></div>
      <p class="bf-intro">{e(series['description'])}</p>
    </header>
{feat}
    <section class="bf-archive wrap" aria-labelledby="bf-prev">
      <h2 id="bf-prev">Previous editions</h2>
      <div class="bf-grid">{previous}
      </div>
    </section>
  </main>
''' + FOOT


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    series = data["series"]
    allowed = [x for x in data["editions"] if x["status"] == "published" or PREVIEW]
    allowed.sort(key=lambda x: x["edition"], reverse=True)
    OUT.mkdir(parents=True, exist_ok=True)
    # Remove pages for editions that are no longer allowed (e.g. drafts when not previewing)
    # The series page only exists once there is at least one edition to show.
    keep = {f"{x['slug']}.html" for x in allowed} | ({"index.html"} if allowed else set())
    for f in OUT.glob("*.html"):
        if f.name not in keep:
            f.unlink(); print("removed", f.relative_to(ROOT).as_posix())
    for ed in allowed:
        (OUT / f"{ed['slug']}.html").write_text(article_page(series, ed, allowed), encoding="utf-8")
        print("wrote", f"history/{series['slug']}/{ed['slug']}.html", "(DRAFT preview)" if ed["status"] != "published" else "")
    if allowed:
        (OUT / "index.html").write_text(landing_page(series, allowed), encoding="utf-8")
        print("wrote", f"history/{series['slug']}/index.html")

    feed = [{
        "title": x["title"], "category": series["category"], "date": x.get("date") or datetime.date.today().isoformat(),
        "image": x["images"][x["cover"]]["src"], "summary": x["excerpt"], "url": f"/history/{series['slug']}/{x['slug']}.html",
        "series": series["name"], "edition": x["edition"], "draft": x["status"] != "published",
        "credit": f"{x['images'][x['cover']]['credit']} · {x['images'][x['cover']]['licence']}",
    } for x in allowed]
    (ROOT / "series-feed.js").write_text(
        "// Generated by tools/build_series.py — do not edit by hand.\n"
        f"window.SERIES_FEED = {json.dumps(feed, ensure_ascii=False, indent=2)};\n"
        f"window.SERIES_INFO = {json.dumps({'name': series['name'], 'tagline': series['tagline'], 'url': '/history/' + series['slug'] + '/'}, ensure_ascii=False)};\n",
        encoding="utf-8")
    print("wrote series-feed.js with", len(feed), "edition(s)")

    sm = ROOT / "sitemap.xml"
    s = re.sub(r"\s*<url><loc>https://immanews\.com/history/[^<]*</loc></url>", "", sm.read_text(encoding="utf-8"))
    pub = [x for x in data["editions"] if x["status"] == "published"]
    if pub:
        urls = [f"{SITE}/history/{series['slug']}/"] + [f"{SITE}/history/{series['slug']}/{x['slug']}.html" for x in pub]
        s = s.replace("</urlset>", "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>")
    sm.write_text(s, encoding="utf-8")
    print("sitemap: published editions =", len(pub))


if __name__ == "__main__":
    main()
