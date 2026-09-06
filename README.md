# kodozen.github.io

The Kodozen studio site and five example projects. One folder of HTML, CSS and
JavaScript — no build step, no package manager, no dependencies.

**Live:** https://kodozen.github.io/

---

## What's here

```
index.html          home page
styles.css          one stylesheet
app.js              one script — no libraries
favicon.svg
is/                 case studies (how each site was made)
demo/               five working example sites
img/                screenshots and palette frames
video/              hero backdrop, showcase scroll, 3D object
```

## Examples

| Site | Type | Address |
|---|---|---|
| Avlu | Courtyard restaurant, separate menu page | [/demo/avlu/](https://kodozen.github.io/demo/avlu/) |
| Ardın | Perfume brand, scroll-driven narrative | [/demo/ardin/](https://kodozen.github.io/demo/ardin/) |
| Sakız | Meyhane, evening in four acts | [/demo/sakiz/](https://kodozen.github.io/demo/sakiz/) |
| Atölye | Car service, corporate | [/demo/atolye/](https://kodozen.github.io/demo/atolye/) |
| Kemer | Members' club, single page | [/demo/kemer/](https://kodozen.github.io/demo/kemer/) |

The sites themselves are in Turkish and English; use the TR/EN switch in the
top right of each one.

## Running it locally

It looks like it needs no server, but it does: `fetch` and `<video>` sources
don't work over `file://`. Shortest path:

```bash
python -m http.server 5180
```

Then open http://localhost:5180.

## Decisions

A few, with reasons:

- **Zero dependencies.** The site claims "no plugins, no libraries, no
  subscriptions", so the scroll effects, the rotating dial and the reveal
  animations are all written by hand rather than pulled from a package.
- **The page stays fully readable with JavaScript off.** Reveal animations only
  apply under an `html.js` class, and a 1600 ms timer force-opens anything left
  behind if IntersectionObserver never fires.
- **Videos download conditionally.** The showcase clip loads only above 900 px
  and the 3D object above 700 px; on a phone the still frame does the same job.
- **Loop seams are measured.** For every background video the first and last
  frames are compared and a ping-pong pass applied — a 7.8% seam came down
  to 0.6%.
- **Images are art-directed.** `<picture>` serves a portrait crop on phones and
  a landscape crop on desktop — separate frames, not one photo cropped twice.

## About the photographs

Some of the photographs under `demo/` are customer photos taken from the
businesses' Google reviews, used **as design examples only**. Copyright belongs
to the people who took them. The code is mine; the photographs are not covered
by that permission. See [LICENSE.md](LICENSE.md).

The business names in the demos are fictional. See the note in the licence file.

---

Mert Pehlivan · [kodozen.github.io](https://kodozen.github.io/) ·
[@kodozen.studio](https://instagram.com/kodozen.studio)
