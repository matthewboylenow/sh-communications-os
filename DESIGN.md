# Design direction

Saint Helen Communications OS. Written before any production UI code, per the
product design brief. Section 4 records the selected direction and its tokens.

---

## 1. What this product actually is

### Who uses it

One person, most days. The communications director, working alone.
Usually a laptop at a desk, sometimes a phone while standing in a hallway at the
parish, often in the evening. Later, possibly one or two staff editors who can
write but cannot approve, and viewers who can only read.

This is not a team tool with an activity feed. It is one person's desk.

### What actually happens here

In order of how often it happens:

1. **Read what the overnight run drafted and decide.** Is the writing ours. Are
   the facts real. Does the photo carry rights.
2. **Approve, or send it back.**
3. **Fill in the fact that is missing.** A room number, a start time, a price.
4. **Attach media** and confirm it is cleared.
5. **Look at the shape of the coming fortnight** and see where the holes are.
6. **Check whether an angle has been used before.**

Five of those six are acts of judgement performed on a piece of writing. Only
one is data entry. That is the single most important fact about this design.

### The content hierarchy

The caption is the content. Everything else in the system is apparatus around a
piece of prose: status, platform, dates, flags, character counts, voice
findings, audit trail. Apparatus should never outweigh the thing it annotates.

Under the caption sits a second class of content that is genuinely tabular and
genuinely dense: the queue, the fortnight coverage, the publication record, the
history log. That content wants alignment and tabular numerals, not prose.

So the app has two kinds of screen, and a design that only answers one of them
is a design that fails half the product.

### Tone

Calm. Unhurried. It keeps a record and can be trusted with it. Institutional in
the good sense, the way a parish office is institutional.

It must not feel celebratory, gamified, or hurried. No "You are all caught up",
no confetti, no streak counters. When there is nothing to review, the correct
response is a quiet sentence, because a quiet week at a parish is a fine thing
and the tool should not imply otherwise.

### What the brand already tells us

The parish wordmark is one lockup of three parts:

- A square medallion holding a quatrefoil cross with four corner dots. Reads as
  carved stone or floor tile. Square frame, right angles, no rounding.
- **Saint** set in a high contrast transitional serif.
- **Helen** set in a light humanist sans.

The identity is achromatic in its primary form and already prescribes a serif
paired with a sans, and a square rather than a rounded rectangle. Any direction
that uses a geometric sans for headings and rounds every corner to 12px is
fighting the parish's own mark for no reason.

Second brand signal, from the art direction rules in the project brief. The
director explicitly rejects praying hands, church buildings, crosses, sunset
crosses and posed group photos as content imagery. That is somebody with an
allergy to the obvious ecclesiastical signifier. A design direction built out of
arches and stained glass would be the interface equivalent of the photography
they already said no to.

---

## 2. Three directions

These differ structurally, not in paint. Each answers "where does the apparatus
live relative to the writing" differently, which changes the grid, the
components and the page templates.

### A. The Galley

**Concept.** The screen is a proof. Prose is set at a real reading measure and
the system's apparatus lives in the margin beside it, the way a copy editor
marks a galley. The portal already computes voice findings, missing facts and
approval flags. The Galley says: those are proof marks, so put them where proof
marks go, in the margin, aligned to the thing they concern.

**Typography.** A screen text serif for captions and titles, set at 17px to 18px
at a 60 to 66 character measure. A neutral grotesque for apparatus. A mono for
marks, counts and timestamps. This mirrors the parish lockup directly: serif for
the name and the words, sans for everything around them.

**Colour.** Warm paper, ink, and one rust used only for editorial marks and for
actions a person must take. Status is carried by mark and position rather than
by a row of coloured pills. Gold for a fact that is missing. Nothing else.

**Layout.** A two track asymmetric grid. A fixed measure column and a narrower
margin column, held on every screen. Navigation is a spine on the left, not a
panel. The measure never widens to fill a large monitor, because a caption read
across 1400px is a caption read badly.

**Shape.** Rules and space. Almost no boxes. Radius 2px to 4px where a box is
genuinely an object. The square medallion sets the shape language.

**Imagery.** Media appears as a plate. One image at its true aspect ratio with a
mono caption beneath carrying source, rights and orientation, like a figure in a
book. Not a square crop in a grid, because the crop is a decision the system
should not silently make.

**Motion.** Close to none. 120ms colour and background only. A margin note
appears when its line is focused. No scroll animation anywhere.

**Signature element.** **The margin mark.** A voice warning, an unfilled
placeholder, an uncleared flag each render as a small mark in the margin, on the
line they concern, with the note beside it. The caption is proofread on screen
rather than described by a summary box underneath it.

**Where it strains.** The queue and the fortnight are not prose. The Galley has
to borrow ruled table discipline for those, which is exactly what a printed book
does for its index and tables, but it has to be done deliberately.

---

### B. The Ledger

**Concept.** The app is a bound register. The product brief is emphatic that
this system is the editorial record and that a history log which lies is worse
than no log. The Ledger takes that literally and makes the record the dominant
surface. Everything is a ruled sheet with real columns.

**Typography.** Small caps with wide tracking for column headings. An economical
text face for entries. Mono tabular numerals for every number in the app, always
aligned on the decimal. Four sizes total across the whole interface.

**Colour.** Aged paper, iron rules, one oxblood reserved for exceptions. Status
renders as a filled cell or a single letter in a column, never as a coloured
pill, because a list where every row is a different colour is a list nobody
scans.

**Layout.** A strict ruled grid with visible vertical rules. Detail views open
as a folio, a two page spread, item on the left page and its full record on the
right, with the audit trail treated as an equal citizen rather than a footnote.

**Shape.** Right angles. Radius 0 to 2px. Rules do all the dividing.

**Imagery.** Contact sheet strips. Small, uniform, gridded, ruled.

**Motion.** Row highlight on hover. Nothing else. Navigation is instant.

**Signature element.** **The spread.** Every item is a two page folio where the
record sits opposite the draft, permanently visible, never behind a tab.

**Where it strains.** Superb for the queue, the history and the publication
record. Actively hostile to writing and reading a caption, which is the thing
the user does most. Also one step away from skeuomorphic pastiche if the ruled
grid is drawn too literally.

---

### C. The Sacristy

**Concept.** The visual language of the parish year, abstracted. The organising
device is the season: the interface knows it is Ordinary Time or Advent or Lent,
and a single band of liturgical colour runs through it accordingly. Structure
borrows the nave arcade, a rhythm of thin vertical rules that content hangs
from.

**Typography.** A warm humanist serif for display at generous leading, a
neutral humanist sans for UI. Big quiet headings.

**Colour.** Linen and stone neutrals with the liturgical accent as the one
variable: green, violet, rose, white, red, changing with the season.

**Layout.** A single wide column right of a persistent left arcade, with
marginalia hung in the arcade itself. Asymmetric by construction.

**Shape.** The arch, used once per screen on the primary panel and never
repeated.

**Imagery.** Warm, soft light, generous crops, slight warm grade.

**Motion.** Slower, 250ms, ease out. A gentle vertical reveal on navigation.

**Signature element.** **The liturgical band.** The app is visibly in a season.

**Where it strains.** Two real problems. First, it couples the accent colour to
a variable, which breaks the rule that one accent means "a person must act"; in
Lent the entire app would go violet and the approve button would stop reading as
the approve button. Second, and worse, it is the direction most likely to feel
churchy, and the person using it has already told us in writing that he does not
want the obvious ecclesiastical signifier. It is the prettiest of the three in a
screenshot and the most likely to be wrong in use.

---

## 3. Recommendation

**Direction A, the Galley, with the Ledger's table discipline for the data
screens.**

Three reasons.

**It matches the actual work.** The core act here is judging prose. A is the
only direction in which the writing is the hero and the apparatus knows its
place. B inverts that. C is indifferent to it.

**It matches the brand without costume.** A serif for words and a sans for
apparatus is not a decorative choice here, it is the parish lockup applied to an
interface. The square medallion sets a square shape language. Nothing has to be
invented, and nothing has to be dressed up as a church.

**The two hard screens both have an answer.** The prose screens get the measure
and the margin. The queue, the fortnight, the publication record and the history
get ruled tables, tabular numerals and letter status, which is what a book does
with an index. That is one coherent system, not two.

C is a real direction and it is the one I would put in a portfolio. It is also
the one I would expect to be quietly turned off in a month, and I would rather
not build that.

The recommendation is a recommendation. If the parish reads its own character
as warmer than the Galley allows, C is worth building with the seasonal band
demoted to a hairline rather than a field of colour, so it never competes with
the accent.

---

## 4. Selected direction

**Direction A, the Galley.** Selected 6 August 2026.

It should feel **edited**, **unhurried** and **kept**.

It should not feel like a technology startup, a component gallery, an admin
template, artificially futuristic, overdecorated or churchy.

### The grid

One two track grid, on every screen, at every width.

```
 spine     measure                       margin
 14.5rem   40rem (about 64 characters)   16.5rem
```

The measure never grows. A caption read across 1400px is a caption read badly,
so on a wide monitor the slack goes to the right of the margin and the whole
composition stays left aligned. The asymmetry is the point and it is the same
asymmetry on all five screens.

Responsive behaviour is designed, not stacked:

| Width | Spine | Measure | Margin |
|---|---|---|---|
| 1180 and up | fixed left column | 40rem | beside the measure |
| 820 to 1180 | fixed left column | fills | drops below its own block, indented, still attached by a rule |
| under 820 | top bar, nav scrolls horizontally | full width | marks fold inline, directly under the paragraph they concern |

### The signature element

**The margin mark.** The master caption renders as prose. Every voice finding,
unfilled placeholder, missing fact and uncleared flag renders as a mark in the
margin, on the line of the paragraph it concerns, with the offending words
underlined in rust in the prose itself. The caption is proofread on screen.

This is why the content detail screen opens in **proof** rather than in a form.
Reading and deciding is the job. Editing is the exception, one click away, and
every mark links straight to the field that fixes it.

### Shape language

The parish medallion is a square. Radius is 2px on controls, 0 on plates,
rules and tables. No pills. Nothing is rounded to look friendly.

### Colour

One accent, one exception marker, everything else warm greyscale.

| Token | Light | Dark | Means |
|---|---|---|---|
| `--paper` | `#f2efe7` | `#131417` | the page |
| `--sheet` | `#fbf9f4` | `#1a1c20` | a raised sheet, used sparingly |
| `--sunk` | `#e7e2d6` | `#0e0f12` | a well, a plate ground |
| `--ink` | `#1b1f26` | `#eae6de` | prose and headings, never pure black |
| `--ink-2` | `#4d5560` | `#a5acb6` | apparatus |
| `--ink-3` | `#7f8894` | `#727a85` | marks at rest |
| `--rule` | `#d8d1c0` | `#282c32` | hairlines |
| `--rule-heavy` | `#1b1f26` | `#eae6de` | masthead rules |
| `--accent` | `#a8451f` | `#d4744c` | a person must act. Nothing else. |
| `--gold` | `#8a6a1e` | `#c5a154` | a fact is missing |

No green. "Clean and ready to approve" is stated in ink with a checked mark,
because inventing a third colour to say "fine" is how an interface ends up with
five accents.

### Type

The parish lockup is a serif locked to a light sans. The app uses the same
split, plus a mono for anything with a unit.

- **Newsreader** for prose, titles and any number worth reading across a room.
  Screen text serif with optical sizing, high enough contrast to answer the
  wordmark's "Saint".
- **Instrument Sans** for apparatus: labels, buttons, table headers, navigation.
- **IBM Plex Mono** for marks, counts, character totals and timestamps.

One fixed size table. Six sizes, no drift.

| Token | Size | Face | Used for |
|---|---|---|---|
| `mark` | 12px | mono | margin marks, counts, timestamps |
| `apparatus` | 14px | sans | labels, meta, table cells, nav |
| `ui` | 16px | sans | form values, buttons, body UI |
| `read` | 17px | serif | caption prose, at 1.62 leading |
| `head` | 22px | serif | section headings |
| `masthead` | 32px | serif | page titles |

One display size above the table, 56px, for the single queue figure on Today.
It is the only number in the app set that large, which is what makes it read.

---

## 5. Rules adopted for this build

Drawn from the product design brief, from StyleSeed's rule set and from the
existing voice spec, which already governs the words in this app and may as well
govern the labels too.

### Colour

- One accent. Rust. It means one thing: a person must act. Gold is the single
  exception marker for a missing fact. Everything else is greyscale warm.
- No pure black text. No pure white surface in the light theme.
- Colour marks the exception. A normal row is not coloured.
- Semantic tokens only. No hex in a component, ever.
- Status colour never carries meaning alone. It is always paired with a word.

### Typography

- Body text 16px minimum on desktop. Caption prose 17px to 18px.
- One fixed size table. Four to six sizes for the whole app, no drift.
- Tabular numerals for every count, character total and timestamp.
- Measure capped at 66 characters for prose. Line height 1.55 body, 1.15
  headings.
- No uppercase mono label above every heading. Mono is for measurements and
  marks. If a label is not a measurement, it is set in the sans, sentence case.

### Structure

- A card only when the content is a discrete, movable or selectable object. Not
  to create separation. Separation comes from rules, alignment and space.
- One radius personality. One icon set, drawn at one weight, no library.
- No four column metric row as a dashboard opener.
- Padding varies by role. A prose panel and a table do not get identical
  padding.
- Shadows only on things that genuinely float above the page, which in this app
  means the command palette and nothing else.

### Motion

- 120ms to 160ms, colour and background only.
- No scroll animation. No fade up on section entry.
- `prefers-reduced-motion` fully honoured.

### Content

- Real copy, in the Saint Helen voice, everywhere. No lorem, no placeholder
  marketing sentences.
- Every empty state says what to do next, in a sentence, without cheerfulness.
- No em dashes anywhere in the interface, per the voice spec.
- No emoji as UI icons.

### Banned outright

Inter as the primary face. Centred headline over three identical cards.
Everything rounded to `rounded-xl`. Floating white cards on grey. Purple to blue
gradients. Gradient text. Blurred colour blobs. Glassmorphism without a reason.
Pills everywhere. Icons in pale rounded squares. Sparkle, rocket and lightning
icons. Uniform section padding down the page. Animation for the look of it.

---

## 6. Review protocol

The first working render is a draft.

After each major page: run the app against seeded data, capture 390px, 768px and
1440px, compare against this file, name at least five specific weaknesses, fix
them, then recapture. Check typography, spacing rhythm, alignment, contrast,
focus states, touch targets and whether the copy is real.

---

## 7. Review record

Run against the seeded August queue in a local Postgres, captured at 390, 768
and 1440 in both themes. Four rounds.

### Round one, what was wrong

1. **The galley grid was not applying to any list row.** `.ruled-row` sets
   `display: block` and is defined after `.galley` in the same layer, so equal
   specificity meant source order won and every margin note fell to full width
   underneath its row. Fixed by nesting the grid inside the row rather than
   combining the two classes.
2. **The medallion read as a sparkle.** The quatrefoil turned to mud at 20px and
   looked like the generic AI star icon the brief bans outright. Redrawn as
   concentric squares with four corner dots.
3. **The wordmark read as one word,** "SaintHelen". No space, and both halves at
   the same optical weight. Given the lockup is the one piece of real parish
   identity in here, that was the worst detail on the screen.
4. **The dateline was orphaned below the nameplate rule.** A nameplate puts the
   date on the rule beside the title. Split the prop into `dateline` (short,
   beside the title) and `lede` (a sentence, below, in the reading face).
5. **Section counts were exiled** to the far side of the hairline, where a bare
   "8" reads as a stray number rather than as a count of the thing named on the
   left. Moved next to the words they count.
6. **The queue meter did not read.** A bar and a detached grey block with no
   scale. Added the 0, min and max ticks so the figure sits against something.

### Round two, what was still wrong

7. **The detail screen opened with six buttons of equal weight**, of which one
   was the actual decision. Approve now sits alone in the nameplate; the rest of
   the status machine moved to a quiet "move to" row set as apparatus.
8. **The platform section printed the same caption twice**, once for Facebook
   and once for Instagram. That is precisely what the master draft exists to
   prevent, restated as a UI bug. A platform that inherits now shows one line
   saying so, and only a genuine delta gets its text set out again.
9. **An empty media plate occupied 640 by 585 pixels** to say "no preview".
   Capped, and an asset with no thumbnail now gets a single line instead.
10. **The `facts` list rules broke at the column gap,** so every row looked
    slightly fractured. Gap moved into the label's padding so the rule runs
    unbroken.
11. **Retiring shouted louder than approving.** `btn-danger` at rest on a
    non destructive action. Now quiet, accent on hover only.
12. **A timestamp wrapped mid value** in the record column. Widened and pinned.

### Round three

13. **In the top bar the active nav marker read as a divider.** A rule to the
    left of the live link looks like a separator between two links when the nav
    runs horizontally. Under 820px it is now an underline.
14. **Margin notes quoted the words they pointed at.** The wavy underline in the
    prose already identifies the placeholder, so repeating "[TIME NEEDED]" in
    the margin made the reader check the same thing twice. Notes shortened.

### What is working and should not be traded away

The proof reads. On the Blood Drive draft the two unfilled placeholders carry a
rust wavy underline in the prose while the margin holds the three missing facts
in gold and the two blocking placeholders in rust, level with the paragraph. On
a phone the same marks fold in directly beneath that paragraph behind a rule,
which is the behaviour the direction specified rather than a stacked desktop
layout.

### Known, accepted

- The margin runs longer than the prose when one paragraph carries five
  objections. That is honest. The draft really does have five problems.
- Sections whose content is a table leave the margin track empty. The asymmetry
  is the composition, not a gap to fill.
