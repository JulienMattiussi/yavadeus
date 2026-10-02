import { normalizeText, textMatches, uniqueYearsDesc, yearFromTimestamp } from './home-view';

// Progressive enhancement: client-side search + view switching.
// Views: "categories" (server-rendered rubrics, default) and two global
// timelines grouped by year ("created" / "updated"). Without JS, the
// categories view stays visible and search/timeline are simply unavailable.
const search = document.getElementById('project-search') as HTMLInputElement | null;
const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view]'));
const categoriesView = document.getElementById('view-categories');
const timelineView = document.getElementById('view-timeline');
const empty = document.getElementById('search-empty');
const latest = document.getElementById('latest');
// Featured copies in the "latest" group stay put; only the originals are filtered and moved.
const cards = Array.from(document.querySelectorAll<HTMLElement>('.card:not([data-featured])'));
const unknownYear = timelineView?.dataset.unknownYear ?? '?';

// Remember each card's original order, to restore it in the categories view.
cards.forEach((card, i) => {
  card.dataset.order = String(i);
});

// Keep sticky offsets in sync with the real bar heights (they change when the
// toolbar wraps on narrow screens), so stacked sticky headers never overlap.
const topbar = document.querySelector<HTMLElement>('.topbar-bar');
const toolbar = document.querySelector<HTMLElement>('.toolbar');
function measureSticky() {
  const root = document.documentElement.style;
  if (topbar) root.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
  if (toolbar) root.setProperty('--toolbar-h', `${toolbar.offsetHeight}px`);
}
measureSticky();
window.addEventListener('resize', measureSticky);
if (document.fonts?.ready) document.fonts.ready.then(measureSticky);

// Flag a category header as `stuck` once it reaches the sticky line, so its
// description can collapse on mobile.
const catHeads = Array.from(document.querySelectorAll<HTMLElement>('.cat-head'));
let stuckTicking = false;
function updateStuck() {
  stuckTicking = false;
  const line = (topbar?.offsetHeight ?? 0) + (toolbar?.offsetHeight ?? 0);
  for (const h of catHeads) h.classList.toggle('stuck', h.getBoundingClientRect().top <= line + 1);
}
window.addEventListener(
  'scroll',
  () => {
    if (!stuckTicking) {
      stuckTicking = true;
      requestAnimationFrame(updateStuck);
    }
  },
  { passive: true },
);
updateStuck();

type View = 'categories' | 'created' | 'updated';
let view: View = 'categories';

const matches = (card: HTMLElement, query: string) => textMatches(card.dataset.search ?? '', query);

const yearOf = (card: HTMLElement, key: View) => yearFromTimestamp(Number(card.dataset[key] ?? 0));

function renderCategories(query: string) {
  if (!categoriesView) return;
  for (const card of cards) {
    const grid = categoriesView.querySelector<HTMLElement>(
      `[data-grid="${card.dataset.category}"]`,
    );
    grid?.appendChild(card);
  }
  for (const grid of categoriesView.querySelectorAll<HTMLElement>('[data-grid]')) {
    Array.from(grid.children)
      .sort(
        (a, b) =>
          Number((a as HTMLElement).dataset.order) - Number((b as HTMLElement).dataset.order),
      )
      .forEach((card) => grid.appendChild(card));
  }
  for (const section of categoriesView.querySelectorAll<HTMLElement>('.category')) {
    let count = 0;
    section.querySelectorAll<HTMLElement>('.card').forEach((c) => {
      const ok = matches(c, query);
      c.hidden = !ok;
      if (ok) count++;
    });
    section.hidden = count === 0;
    const countEl = section.querySelector<HTMLElement>('.cat-count');
    if (countEl) {
      const total = Number(countEl.dataset.total ?? count);
      const unit = (countEl.textContent ?? '').trim().replace(/^[\d/]+\s*/, '');
      countEl.textContent = `${count < total ? `${count}/${total}` : total} ${unit}`.trimEnd();
    }
  }
  // Hidden while searching: its cards would show up twice among the results.
  if (latest) latest.hidden = query !== '';
  categoriesView.hidden = false;
  if (timelineView) timelineView.hidden = true;
}

function renderTimeline(key: View, query: string) {
  if (!timelineView) return;
  timelineView.textContent = '';
  if (categoriesView) categoriesView.hidden = true;
  timelineView.hidden = false;

  const visibleCards = cards.filter((c) => matches(c, query));
  const years = uniqueYearsDesc(visibleCards.map((c) => yearOf(c, key)));

  for (const year of years) {
    const group = visibleCards
      .filter((c) => yearOf(c, key) === year)
      .sort((a, b) => Number(b.dataset[key] ?? 0) - Number(a.dataset[key] ?? 0));
    if (group.length === 0) continue;

    const section = document.createElement('section');
    section.className = 'year-group';
    const head = document.createElement('h2');
    head.className = 'year-title mono';
    head.innerHTML =
      `<span class="year-num">${year === 0 ? unknownYear : year}</span>` +
      `<span class="year-count">${group.length}</span>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const card of group) {
      card.hidden = false;
      grid.appendChild(card);
    }
    section.append(head, grid);
    timelineView.appendChild(section);
  }
}

function apply() {
  const query = normalizeText(search?.value.trim() ?? '');
  if (view === 'categories') renderCategories(query);
  else renderTimeline(view, query);
  if (empty) empty.hidden = cards.some((card) => matches(card, query));
}

search?.addEventListener('input', apply);
for (const button of viewButtons) {
  button.addEventListener('click', () => {
    view = (button.dataset.view as View) ?? 'categories';
    for (const other of viewButtons) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    apply();
  });
}

apply();
search?.focus({ preventScroll: true });
