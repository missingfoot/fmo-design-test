import "./style.css";
import { categories, navPages, getAllArticlesFlat, articleMatchesFuzzy, fuzzyContains, type FlatArticle, type PageId } from "./data";
import articlesContent from "./content/articles.json";
import type { ArticleMeta, ContentBlock } from "./content/types";

interface KbState {
  expandedCategories: Set<string>;
  articleId: string | null;
  query: string;
}

type View = { page: "knowledge-base"; kb: KbState } | { page: Exclude<PageId, "knowledge-base"> };

const BOOKMARKS_CATEGORY_ID = "__bookmarks__";
// Not a real article id (never appears in data.ts/articles.json), just a
// sentinel value stored in kb.articleId so the FAQ page reuses the same
// "what's open" state as a normal article without needing a second field.
const FAQ_PAGE_ID = "__faq__";

// Stand-in for whoever's actually signed in.
const CURRENT_USER_NAME = "James Sparkes";

function emptyKbState(): KbState {
  // Categories start collapsed; Bookmarks starts open since it's the point of it.
  return { expandedCategories: new Set([BOOKMARKS_CATEGORY_ID]), articleId: null, query: "" };
}

let state: View = { page: "knowledge-base", kb: emptyKbState() };

// Browser-style back/forward through whatever's been open in the main
// panel (an article, the FAQ page, or the welcome page/null), independent
// of the article-to-article "Previous/Next" footer pagination, which
// steps through the fixed category order rather than where the reader's
// actually been. Navigating to a new page discards any forward history
// past the current point, same as a real browser; going back/forward
// itself doesn't re-record a new entry.
let navHistory: (string | null)[] = [null];
let navHistoryIndex = 0;

function recordNavHistory(articleId: string | null) {
  if (navHistory[navHistoryIndex] === articleId) return;
  navHistory = navHistory.slice(0, navHistoryIndex + 1);
  navHistory.push(articleId);
  navHistoryIndex = navHistory.length - 1;
}

function resetNavHistory(articleId: string | null) {
  navHistory = [articleId];
  navHistoryIndex = 0;
}

function goHistory(delta: -1 | 1) {
  if (state.page !== "knowledge-base") return;
  const targetIndex = navHistoryIndex + delta;
  if (targetIndex < 0 || targetIndex >= navHistory.length) return;
  navHistoryIndex = targetIndex;
  const articleId = navHistory[navHistoryIndex];
  state = { page: "knowledge-base", kb: { ...state.kb, articleId } };
  if (articleId) revealArticleInSidebar(articleId);
  render();
  if (articleId) scrollArticleRowIntoView(articleId);
}

// Bookmarked articles persist across navigation/resets (unlike expand state,
// open article, or the filter), and survive a page reload.
const BOOKMARKED_STORAGE_KEY = "fmo-kb-bookmarked-articles";

function loadBookmarkedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARKED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveBookmarkedIds(ids: Set<string>) {
  try {
    localStorage.setItem(BOOKMARKED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable (private browsing, etc.), bookmarks just won't persist.
  }
}

let bookmarkedArticleIds = loadBookmarkedIds();

function toggleBookmark(articleId: string) {
  if (bookmarkedArticleIds.has(articleId)) {
    bookmarkedArticleIds.delete(articleId);
  } else {
    bookmarkedArticleIds.add(articleId);
  }
  saveBookmarkedIds(bookmarkedArticleIds);
}

const articleContent = articlesContent as unknown as Record<string, { blocks: ContentBlock[]; meta: ArticleMeta }>;

// Article bodies use a lightweight [[article-id|label]] (or [[article-id]],
// which falls back to that article's title) syntax to cross-link to other
// articles from inside a paragraph or list item, the way a real KB would.
// Parsed and escaped per-segment (rather than escaping the whole string then
// injecting HTML) so search highlighting still only ever matches real text,
// never markup.
const INLINE_LINK_PATTERN = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/gi;

function renderInlineText(text: string, h: (segment: string) => string): string {
  let out = "";
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_LINK_PATTERN)) {
    const [full, articleId, label] = match;
    const index = match.index ?? 0;
    out += h(text.slice(lastIndex, index));
    const target = getAllArticlesFlat().find((a) => a.id === articleId);
    if (target) {
      out += `<a href="#" class="article-inline-link" data-article="${target.id}">${h(label ?? target.title)}</a>`;
    } else {
      // Unknown id (typo, or article removed): render the raw label rather
      // than a dead/broken link.
      out += h(label ?? full);
    }
    lastIndex = index + full.length;
  }
  out += h(text.slice(lastIndex));
  return out;
}

function getArticleBodyText(articleId: string): string {
  const blocks = articleContent[articleId]?.blocks ?? [];
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
        case "paragraph":
          return b.text;
        case "list":
          return b.items.join(" ");
        case "image":
          return b.caption;
      }
    })
    .join(" ");
}

const SEARCH_INPUT_ID = "kb-search";
const SIDEBAR_LIST_SELECTOR = ".kb-sidebar-panel .kb-tree";
const MAIN_ARTICLE_SELECTOR = ".kb-main-panel .kb-main-article";

// Tracks which article was open on the previous render so switching to a
// different (or no) article always opens scrolled to the top, while
// re-rendering for an unrelated reason (typing in the filter, toggling a
// sidebar category) still preserves the reader's scroll position.
let lastMainArticleId: string | null = null;

// The header/logo/nav rail never actually change shape, only a couple of
// text/class details on them do. Building them once and updating those
// details in place (rather than tearing down and recreating every element,
// including the <img> logo, on every single render) is what stops the logo
// visibly flashing on renders with a lot of new content, like opening an
// article.
function renderShell() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `
    <div class="app-shell">
      <div class="workspace">
        <div class="crm-shell-context">
          <nav class="navigation">
            <div class="navigation-top">
              <div class="navigation-logo">
                <img class="logomark" src="/assets/logo.svg" alt="FMO" />
              </div>
              <div class="navigation-items">
                ${navPages
                  .map(
                    (p) => `
                  <button class="nav-icon" data-page="${p.id}" data-tooltip="${p.label}" aria-label="${p.label}">
                    <img src="/assets/${p.icon}.svg" alt="${p.label}" />
                  </button>
                `,
                  )
                  .join("")}
              </div>
            </div>
            <div class="nav-user">
              <button class="nav-avatar" id="nav-avatar-btn" aria-label="Account menu" aria-haspopup="true" aria-expanded="false">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              <div class="nav-user-menu" id="nav-user-menu" hidden>
                <div class="nav-user-menu-name">${CURRENT_USER_NAME}</div>
                <button class="nav-user-menu-logout" id="nav-logout-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  Log out
                </button>
              </div>
            </div>
          </nav>
        </div>

        <div class="knowledge-base" id="kb-content"></div>
      </div>
    </div>
  `;

  document.querySelectorAll<HTMLButtonElement>(".nav-icon").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.dataset.page as View["page"];
      if (pageId === state.page) return;
      state = pageId === "knowledge-base" ? { page: "knowledge-base", kb: emptyKbState() } : { page: pageId };
      if (pageId === "knowledge-base") resetNavHistory(null);
      render();
    });
  });

  const avatarBtn = document.getElementById("nav-avatar-btn");
  const userMenu = document.getElementById("nav-user-menu");
  const closeUserMenu = () => {
    if (!userMenu || userMenu.hidden) return;
    userMenu.hidden = true;
    avatarBtn?.setAttribute("aria-expanded", "false");
  };
  avatarBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!userMenu) return;
    userMenu.hidden = !userMenu.hidden;
    avatarBtn.setAttribute("aria-expanded", String(!userMenu.hidden));
  });
  userMenu?.addEventListener("click", (e) => e.stopPropagation());
  // Not wired to anything real, logging out isn't part of this prototype's
  // scope, same as the rest of the surrounding CRM shell.
  document.getElementById("nav-logout-btn")?.addEventListener("click", closeUserMenu);
  document.addEventListener("click", closeUserMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeUserMenu();
    if (state.page === "knowledge-base" && hasActiveQuery(state.kb.query)) clearFilter();
  });
}

function render() {
  const currentPage = navPages.find((p) => p.id === state.page)!;
  const focusInfo = captureSearchFocus();
  const sidebarScroll = captureScroll(SIDEBAR_LIST_SELECTOR);
  const mainScroll = captureScroll(MAIN_ARTICLE_SELECTOR);
  const currentArticleId = state.page === "knowledge-base" ? state.kb.articleId : null;

  document.querySelectorAll<HTMLButtonElement>(".nav-icon").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.page === state.page);
  });

  const content = document.getElementById("kb-content")!;
  content.innerHTML =
    state.page === "knowledge-base" ? renderKnowledgeBase(state.kb) : renderPlaceholderPage(currentPage);

  wireContentEvents();
  restoreSearchFocus(focusInfo);
  restoreScroll(SIDEBAR_LIST_SELECTOR, sidebarScroll);
  if (currentArticleId === lastMainArticleId) {
    restoreScroll(MAIN_ARTICLE_SELECTOR, mainScroll);
  }
  lastMainArticleId = currentArticleId;
  wireArticleHeaderBorder();
  wireTableOfContents();
}

function wireArticleHeaderBorder() {
  const article = document.querySelector(MAIN_ARTICLE_SELECTOR);
  const header = document.querySelector(".kb-main-article-header");
  if (!article || !header) return;
  const update = () => header.classList.toggle("is-scrolled", article.scrollTop > 0);
  update();
  article.addEventListener("scroll", update, { passive: true });
}

function wireTableOfContents() {
  const container = document.querySelector<HTMLElement>(MAIN_ARTICLE_SELECTOR);
  const links = document.querySelectorAll<HTMLAnchorElement>(".article-toc-link");
  if (!container || !links.length) return;

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(link.getAttribute("href")!.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const headingEls = Array.from(container.querySelectorAll<HTMLElement>(".section-heading[id]"));
  if (!headingEls.length) return;

  // Band-based IntersectionObserver approaches (marking a heading active
  // only while it sits within some "top N%" region) turned out unreliable
  // two different ways: a short article could put more than one heading in
  // that band at once, and a long gap between headings (e.g. either side of
  // a big image block) could put zero headings in it, leaving nothing
  // marked active until scrolling caught back up. Instead, directly derive
  // the active heading from position on every scroll: it's simply the last
  // heading (in document order) whose top has reached the trigger line , 
  // always exactly one answer, well-defined at any scroll position,
  // including the very top (first heading) and the very bottom (last one).
  let ticking = false;

  const updateActiveLink = () => {
    ticking = false;
    const containerRect = container.getBoundingClientRect();
    const triggerLine = containerRect.top + containerRect.height * 0.3;

    // Default to the first heading, before any heading has reached the
    // trigger line (e.g. still reading the intro above "Overview"), that
    // first section is still the most useful thing to show as current,
    // rather than leaving the whole table of contents unhighlighted.
    let activeId: string | null = headingEls[0].id;
    for (const el of headingEls) {
      if (el.getBoundingClientRect().top <= triggerLine) {
        activeId = el.id;
      } else {
        break;
      }
    }

    document.querySelectorAll(".article-toc-link.is-active").forEach((el) => el.classList.remove("is-active"));
    if (activeId) document.querySelector(`.article-toc-link[href="#${activeId}"]`)?.classList.add("is-active");
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateActiveLink);
  };

  updateActiveLink();
  container.addEventListener("scroll", onScroll, { passive: true });
}

function renderKnowledgeBase(kb: KbState) {
  return `
    <div class="kb-layout">
      <div class="kb-panels-row">
        <div class="kb-sidebar-panel">
          ${renderSidebar(kb)}
        </div>
        <div class="kb-main-panel">
          ${renderMainBody(kb)}
        </div>
      </div>
    </div>
  `;
}

const BOOKMARK_ICON_PATH = '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>';

const COPY_ICON = '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/>';
const COPIED_ICON = '<polyline points="20 6 9 17 4 12"/>';

// Browser-style back/forward for whatever's been open in the main panel,
// see navHistory. Sits at the very left of the header, as plain flex
// children (no absolute positioning/reserved-width tricks needed once the
// header stopped trying to keep its icons lined up with the body column
// below it), so it renders identically across the article, FAQ, and
// welcome-page headers.
function renderNavHistoryButtons() {
  const canGoBack = navHistoryIndex > 0;
  const canGoForward = navHistoryIndex < navHistory.length - 1;
  return `
    <div class="kb-nav-history">
      <button type="button" class="kb-nav-history-btn" data-nav-back title="Back" aria-label="Back" ${canGoBack ? "" : "disabled"}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button type="button" class="kb-nav-history-btn" data-nav-forward title="Forward" aria-label="Forward" ${canGoForward ? "" : "disabled"}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  `;
}

// Sits at the very right of the header: copy-link on every page, plus
// bookmark only where one applies (a real article, not the FAQ/welcome
// pages). Copying just grabs the page's current URL, this prototype has no
// per-article routing to make that link unique, same spirit as the nav
// rail's logout button, present for the UI but not wired to anything real.
function renderHeaderActions(bookmarkArticleId?: string) {
  return `
    <div class="kb-header-actions">
      ${
        bookmarkArticleId
          ? (() => {
              const isBookmarked = bookmarkedArticleIds.has(bookmarkArticleId);
              return `
          <button type="button" class="kb-header-action-btn kb-header-bookmark${isBookmarked ? " is-bookmarked" : ""}" data-bookmark="${bookmarkArticleId}" title="${isBookmarked ? "Remove bookmark" : "Bookmark this article"}" aria-label="${isBookmarked ? "Remove bookmark" : "Bookmark this article"}">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${isBookmarked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${BOOKMARK_ICON_PATH}</svg>
          </button>
        `;
            })()
          : ""
      }
      <button type="button" class="kb-header-action-btn" data-copy-url title="Copy link" aria-label="Copy link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${COPY_ICON}</svg>
      </button>
    </div>
  `;
}

// Below this many characters, typing hasn't narrowed anything down yet, at
// 1-2 letters almost every article would match something, which reads as
// broken rather than helpful. 3 letters is enough for a short acronym
// (e.g. "SMS", "OTA") to filter meaningfully on its own; fuzzy substring
// matching (see fuzzyContains in data.ts) only kicks in above that.
const MIN_FILTER_LENGTH = 3;

function hasActiveQuery(query: string): boolean {
  return query.trim().length >= MIN_FILTER_LENGTH;
}

function renderSidebar(kb: KbState) {
  const isFiltering = hasActiveQuery(kb.query);

  return `
    <div class="kb-sidebar-heading">Knowledge Base</div>

    <div class="kb-sidebar-search">
      <div class="kb-search-bar">
        <img class="kb-search-icon" src="/assets/icon-search.svg" alt="" />
        <input type="text" class="kb-search-input" id="${SEARCH_INPUT_ID}" placeholder="Search articles..." autocomplete="off" value="${escapeHtml(kb.query)}" />
        ${
          kb.query
            ? `
          <button type="button" class="kb-search-clear" id="kb-search-clear" title="Clear filter">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><line x1="18" x2="12" y1="9" y2="15"/><line x1="12" x2="18" y1="9" y2="15"/></svg>
          </button>
        `
            : ""
        }
      </div>
    </div>

    <div class="kb-tree">
      ${isFiltering ? "" : renderGettingStartedNode(kb)}
      ${isFiltering ? "" : renderFaqNode(kb)}
      ${isFiltering ? "" : renderBookmarksNode(kb)}
      ${categories
        .map((c) => renderCategoryNode(c, kb, isFiltering))
        .filter((node): node is string => node !== null)
        .join("")}
    </div>
  `;
}

function renderGettingStartedNode(kb: KbState) {
  const isSelected = kb.articleId === null;
  return `
    <button class="kb-tree-row kb-tree-row--category kb-tree-row--welcome${isSelected ? " is-selected" : ""}" data-welcome>
      <svg class="kb-tree-category-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      <span class="kb-tree-label">Getting Started</span>
    </button>
  `;
}

function renderFaqNode(kb: KbState) {
  const isSelected = kb.articleId === FAQ_PAGE_ID;
  return `
    <button class="kb-tree-row kb-tree-row--category kb-tree-row--welcome${isSelected ? " is-selected" : ""}" data-faq>
      <svg class="kb-tree-category-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
      <span class="kb-tree-label">FAQ</span>
    </button>
  `;
}

function renderBookmarksNode(kb: KbState) {
  const bookmarkedArticles = getAllArticlesFlat().filter((a) => bookmarkedArticleIds.has(a.id));
  const isExpanded = kb.expandedCategories.has(BOOKMARKS_CATEGORY_ID);

  return `
    <div class="kb-tree-category">
      <button class="kb-tree-row kb-tree-row--category" data-category="${BOOKMARKS_CATEGORY_ID}">
        <svg class="kb-tree-category-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${BOOKMARK_ICON_PATH}</svg>
        <span class="kb-tree-label">Bookmarks</span>
        <span class="kb-tree-count">${bookmarkedArticles.length}</span>
      </button>

      ${
        isExpanded
          ? `
        <div class="kb-tree-children">
          ${
            bookmarkedArticles.length
              ? bookmarkedArticles.map((a) => renderArticleRow(a, kb, escapeHtml(a.title))).join("")
              : `<div class="kb-tree-empty">No bookmarks yet</div>`
          }
        </div>
      `
          : ""
      }
    </div>
  `;
}

function renderCategoryNode(category: (typeof categories)[number], kb: KbState, isFiltering: boolean) {
  const articles = isFiltering
    ? category.articles.filter((a) => articleMatchesFuzzy(a, kb.query, getArticleBodyText(a.id)))
    : category.articles;

  if (isFiltering && articles.length === 0) return null;

  const isExpanded = isFiltering || kb.expandedCategories.has(category.id);

  return `
    <div class="kb-tree-category">
      <button class="kb-tree-row kb-tree-row--category" data-category="${category.id}">
        <svg class="kb-tree-category-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${category.icon}</svg>
        <span class="kb-tree-label">${category.label}</span>
        <span class="kb-tree-count">${articles.length}</span>
      </button>

      ${
        isExpanded
          ? `
        <div class="kb-tree-children">
          ${
            articles.length
              ? articles
                  .map((a) => renderArticleRow(a, kb, isFiltering ? highlightMatches(a.title, kb.query) : escapeHtml(a.title)))
                  .join("")
              : `<div class="kb-tree-empty">No articles yet</div>`
          }
        </div>
      `
          : ""
      }
    </div>
  `;
}

function renderArticleRow(article: { id: string; title: string }, kb: KbState, labelHtml: string) {
  return `
    <button class="kb-tree-row kb-tree-row--article${article.id === kb.articleId ? " is-selected" : ""}" data-article="${article.id}">
      <span class="kb-tree-label">${labelHtml}</span>
    </button>
  `;
}

function renderMainBody(kb: KbState) {
  if (kb.articleId === FAQ_PAGE_ID) return renderFaqPage(kb.query);

  const openArticle = kb.articleId ? getAllArticlesFlat().find((a) => a.id === kb.articleId) : undefined;

  if (openArticle) {
    const h = (text: string) => (hasActiveQuery(kb.query) ? highlightMatches(text, kb.query) : escapeHtml(text));
    return `
      <div class="kb-main-article-header">
        <div class="kb-main-article-header-inner">
          ${renderNavHistoryButtons()}
          <div class="kb-main-article-header-title-row article-column-row">
            <span class="kb-main-article-title">${h(openArticle.title)}</span>
            <div class="kb-main-article-header-toc-spacer" aria-hidden="true"></div>
          </div>
          ${renderHeaderActions(openArticle.id)}
        </div>
      </div>
      <div class="kb-main-article">${renderArticleBody(openArticle, kb.query)}</div>
    `;
  }

  if (hasActiveQuery(kb.query)) {
    const count = countMatchingArticles(kb.query);
    const message =
      count === 0
        ? "No articles match your search."
        : `${count} article${count === 1 ? "" : "s"} match${count === 1 ? "es" : ""} your search. Choose one on the left to open it.`;
    return `<div class="kb-main-empty"><div class="empty-state">${escapeHtml(message)}</div></div>`;
  }

  return renderKbWelcome();
}

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "What is FMO?",
    answer:
      "FMO is a takeaway and restaurant ordering platform built around a 0% commission model: shops pay a flat monthly subscription instead of a cut of every order, and pass on a [[mkt-minimum-discount|minimum 3% customer discount]] as part of the [[mkt-fmo-movement|FMO Movement]]. See [[sales-subscription-commission|Subscription & Commission]] for how the pricing actually breaks down.",
  },
  {
    question: "How much does it cost for a shop to join?",
    answer:
      "There's a flat monthly subscription and no per-order commission. [[sales-subscription-commission|Subscription & Commission: How Pricing Works]] covers the exact numbers and what's included.",
  },
  {
    question: "How do I sign up a new shop?",
    answer: "Walk through [[sales-signing-up-new-shop|Sales & Accounts: Signing Up a New Shop]] for the full onboarding steps, from account creation to the terminal shipping out.",
  },
  {
    question: "What hardware does a shop actually need?",
    answer:
      "Just the AP Smart Link terminal, it's shipped pre-configured with the shop's menu and payment details already loaded. [[hw-smart-link-getting-started|AP Smart Link: Getting Started]] covers unboxing and first power-on.",
  },
  {
    question: "How does a shop get hold of its takings?",
    answer:
      "Card takings land in [[sales-ap-funds|AP Funds]] automatically. From there a shop can draw on the [[sales-advantage-card|Advantage Card]] instantly, wait for a standard bank transfer, or pay a small fee for a [[request-funds-same-day|same-day transfer]].",
  },
  {
    question: "A shop's account has been suspended, what do we tell them?",
    answer: "Don't promise a timeline on the call. [[acc-account-suspension|Account Suspension: Causes and Reinstatement]] covers common causes and the reinstatement process to walk them through.",
  },
  {
    question: "Where do I report a bug or request a feature?",
    answer:
      "Log it with the Product team rather than promising a fix date to the shop, most terminal-facing changes ship through the same OTA process covered in [[hw-smart-link-firmware-updates|Managing Firmware Updates]].",
  },
  {
    question: "I can't find an answer to my question here, what next?",
    answer: "Try a broader search across the Knowledge Base first, most day-to-day questions are already covered in one of the category articles on the left. If it's genuinely not documented, escalate it so the article can be added.",
  },
];

// A separate static page alongside the welcome page, not a real article
// (it has no entry in data.ts/articles.json and isn't part of
// getAllArticlesFlat, so it never shows up in search results, bookmarks,
// or prev/next pagination), for the small set of questions support staff
// get asked constantly that don't map cleanly onto a single feature.
function renderFaqPage(query: string) {
  const h = (text: string) => (hasActiveQuery(query) ? highlightMatches(text, query) : escapeHtml(text));
  return `
    <div class="kb-main-article-header">
      <div class="kb-main-article-header-inner">
        ${renderNavHistoryButtons()}
        <div class="kb-main-article-header-title-row article-column-row">
          <span class="kb-main-article-title">FAQ</span>
          <div class="kb-main-article-header-toc-spacer" aria-hidden="true"></div>
        </div>
        ${renderHeaderActions()}
      </div>
    </div>
    <div class="kb-main-article">
      <div class="article-reader-layout article-column-row">
        <div class="article-reader">
          <p class="section-body">${h("Quick answers to the questions support staff get asked most often. For anything more detailed, search the Knowledge Base or open the relevant article directly.")}</p>
          ${FAQ_ITEMS.map(
            (item) => `
            <div class="section-heading">${h(item.question)}</div>
            <p class="section-body">${renderInlineText(item.answer, h)}</p>
          `,
          ).join("")}
        </div>
      </div>
    </div>
  `;
}

// The resting state when no article is open, written and laid out like an
// actual article (same header/column classes as a real one) rather than a
// dashboard, since a KB's own "how this is organized" page is exactly the
// kind of thing a real team would write as an article in Notion/Confluence.
function renderKbWelcome() {
  const bookmarkedArticles = getAllArticlesFlat().filter((a) => bookmarkedArticleIds.has(a.id));

  const recentlyUpdated = getAllArticlesFlat()
    .map((article) => ({ article, meta: articleContent[article.id]?.meta }))
    .filter((entry): entry is { article: FlatArticle; meta: ArticleMeta } => !!entry.meta)
    .sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt))
    .slice(0, 5);

  return `
    <div class="kb-main-article-header">
      <div class="kb-main-article-header-inner">
        ${renderNavHistoryButtons()}
        <div class="kb-main-article-header-title-row article-column-row">
          <span class="kb-main-article-title">Welcome to the Knowledge Base</span>
          <div class="kb-main-article-header-toc-spacer" aria-hidden="true"></div>
        </div>
        ${renderHeaderActions()}
      </div>
    </div>
    <div class="kb-main-article">
      <div class="article-reader-layout article-column-row">
        <div class="article-reader">
          <p class="section-body">
            This is FMO's internal knowledge base, the place shop-support staff look things up while on a call or helping a shop directly, whether that's how a feature works, what a setting does, or what to say when something's gone wrong.
          </p>

          <div class="section-heading">Jump to a category</div>
          <ul class="kb-welcome-links">
            ${categories
              .map(
                (c) => `
              <li>
                <button class="kb-welcome-link" data-category-card="${c.id}">
                  <svg class="kb-welcome-link-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>
                  <span class="kb-welcome-link-main">
                    <span class="kb-welcome-link-title">${escapeHtml(c.label)}</span>
                    <span class="kb-welcome-link-description">${escapeHtml(c.description)}</span>
                  </span>
                  <span class="kb-welcome-link-aside">${c.articles.length} articles</span>
                </button>
              </li>
            `,
              )
              .join("")}
          </ul>

          ${
            bookmarkedArticles.length
              ? `
            <div class="section-heading">Your bookmarks</div>
            <ul class="kb-welcome-links">
              ${bookmarkedArticles
                .map(
                  (article) => `
                <li>
                  <button class="kb-welcome-link" data-article="${article.id}">
                    <span class="kb-welcome-link-main">
                      <span class="kb-welcome-link-title">${escapeHtml(article.title)}</span>
                      <span class="kb-welcome-link-description">${escapeHtml(article.categoryLabel)}</span>
                    </span>
                  </button>
                </li>
              `,
                )
                .join("")}
            </ul>
          `
              : ""
          }

          <div class="section-heading">Recently updated</div>
          <ul class="kb-welcome-links">
            ${recentlyUpdated
              .map(
                ({ article, meta }) => `
              <li>
                <button class="kb-welcome-link" data-article="${article.id}">
                  <span class="kb-welcome-link-main">
                    <span class="kb-welcome-link-title">${escapeHtml(article.title)}</span>
                    <span class="kb-welcome-link-description">${escapeHtml(article.categoryLabel)}</span>
                  </span>
                  <span class="kb-welcome-link-aside">Updated ${formatDate(meta.updatedAt)}</span>
                </button>
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function renderArticleBody(article: FlatArticle, query: string) {
  const h = (text: string) => (hasActiveQuery(query) ? highlightMatches(text, query) : escapeHtml(text));
  const content = articleContent[article.id];
  const blocks = content?.blocks ?? [];
  const headings = getArticleHeadingSlugs(blocks);

  let headingIndex = 0;
  const blocksHtml = blocks
    .map((block) => renderContentBlock(block, h, block.type === "heading" ? headings[headingIndex++].id : undefined))
    .join("");

  const allArticles = getAllArticlesFlat();
  const index = allArticles.findIndex((a) => a.id === article.id);
  const prevArticle = index > 0 ? allArticles[index - 1] : null;
  const nextArticle = index >= 0 && index < allArticles.length - 1 ? allArticles[index + 1] : null;

  return `
    <div class="article-reader-layout article-column-row">
      <div class="article-reader">
        ${content?.meta ? renderArticleMeta(content.meta, article.categoryLabel) : ""}
        ${blocksHtml}
        ${prevArticle || nextArticle ? renderArticlePagination(prevArticle, nextArticle) : ""}
      </div>
      ${headings.length >= 2 ? renderTableOfContents(headings) : ""}
    </div>
  `;
}

function renderArticlePagination(prev: FlatArticle | null, next: FlatArticle | null) {
  const chevronLeft = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  const chevronRight = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;

  return `
    <div class="article-pagination">
      ${
        prev
          ? `
        <button class="article-pagination-link article-pagination-prev" data-article="${prev.id}">
          <span class="article-pagination-label">${chevronLeft}<span>Previous</span></span>
          <span class="article-pagination-title">${escapeHtml(prev.title)}</span>
        </button>
      `
          : "<div></div>"
      }
      ${
        next
          ? `
        <button class="article-pagination-link article-pagination-next" data-article="${next.id}">
          <span class="article-pagination-label"><span>Next</span>${chevronRight}</span>
          <span class="article-pagination-title">${escapeHtml(next.title)}</span>
        </button>
      `
          : "<div></div>"
      }
    </div>
  `;
}

// Nice-to-have: a jump-to-heading rail, shown only when there's room and the
// article has enough headings to be worth it. Easy to descope entirely if
// it's cut at design review, it's additive and doesn't touch anything else.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getArticleHeadingSlugs(blocks: ContentBlock[]): { text: string; id: string }[] {
  const seen = new Map<string, number>();
  const headings: { text: string; id: string }[] = [];
  for (const block of blocks) {
    if (block.type !== "heading") continue;
    const base = slugify(block.text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.push({ text: block.text, id: count === 0 ? base : `${base}-${count}` });
  }
  return headings;
}

function renderTableOfContents(headings: { text: string; id: string }[]) {
  return `
    <nav class="article-toc">
      <ul class="article-toc-list">
        ${headings
          .map(
            (h, i) => `
          <li><a class="article-toc-link${i === 0 ? " is-active" : ""}" href="#${h.id}">${escapeHtml(h.text)}</a></li>
        `,
          )
          .join("")}
      </ul>
    </nav>
  `;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderArticleMeta(meta: ArticleMeta, categoryLabel: string) {
  const wasEdited = meta.updatedAt !== meta.publishedAt;
  const editedByOther = wasEdited && meta.updatedBy !== meta.author;

  return `
    <div class="article-meta">
      <span class="article-meta-category">${escapeHtml(categoryLabel)}</span>
      <span class="article-meta-sep">&middot;</span>
      <span>Written by <span class="article-meta-name">${escapeHtml(meta.author)}</span></span>
      <span class="article-meta-sep">&middot;</span>
      <span>Published ${formatDate(meta.publishedAt)}</span>
      ${
        wasEdited
          ? `
        <span class="article-meta-sep">&middot;</span>
        <span>Updated ${formatDate(meta.updatedAt)}${editedByOther ? ` by <span class="article-meta-name">${escapeHtml(meta.updatedBy)}</span>` : ""}</span>
      `
          : ""
      }
    </div>
  `;
}

function renderContentBlock(block: ContentBlock, h: (text: string) => string, headingId?: string) {
  switch (block.type) {
    case "heading":
      return `<div class="section-heading"${headingId ? ` id="${headingId}"` : ""}>${h(block.text)}</div>`;
    case "paragraph":
      return `<p class="section-body">${renderInlineText(block.text, h)}</p>`;
    case "list":
      return `<ul class="section-body">${block.items.map((item) => `<li>${renderInlineText(item, h)}</li>`).join("")}</ul>`;
    case "image":
      return `
        <figure class="article-figure">
          <div class="article-image">Image</div>
          <figcaption class="article-image-caption">${h(block.caption)}</figcaption>
        </figure>
      `;
  }
}

function renderPlaceholderPage(page: (typeof navPages)[number]) {
  return `
    <div class="knowledge-base-panel">
      <div class="placeholder-page">
        <div class="placeholder-title">${page.label}</div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

// A single transient toast, reused rather than stacked, kept as a plain
// DOM element outside the app's normal render() cycle since it's
// ephemeral UI feedback (a click "did something") rather than state
// anything else in the app needs to know about or that should survive a
// re-render/navigation.
let toastEl: HTMLDivElement | null = null;
let toastTimer: number | undefined;

function showToast(message: string) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "kb-toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  // Force a reflow so re-triggering the toast while one is already visible
  // (e.g. bookmarking two articles in quick succession) restarts the
  // fade-in transition instead of it silently no-op'ing because the class
  // was already present.
  toastEl.classList.remove("is-visible");
  void toastEl.offsetWidth;
  toastEl.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl?.classList.remove("is-visible");
  }, 2000);
}

// A word/hyphenated-compound token in the original text, with its position,
// used both to find literal matches and as the unit fuzzy matching snaps to
// (so a fuzzy hit always highlights a whole word, never a stray substring).
// Also includes each pair of adjacent, single-space-separated words as one
// combined span (mirroring tokenize()'s word-pair joining in data.ts), so a
// query merging a two-word phrase into one word (e.g. "smartlink" against
// "Smart Link") has a whole span to highlight instead of finding nothing.
function findWordSpans(text: string): { start: number; end: number; text: string }[] {
  const spans: { start: number; end: number; text: string }[] = [];
  for (const match of text.matchAll(/[a-z0-9]+(?:-[a-z0-9]+)*/gi)) {
    spans.push({ start: match.index!, end: match.index! + match[0].length, text: match[0] });
  }
  const baseCount = spans.length;
  for (let i = 0; i < baseCount - 1; i++) {
    const a = spans[i];
    const b = spans[i + 1];
    if (b.start - a.end === 1 && text[a.end] === " ") {
      spans.push({ start: a.start, end: b.end, text: a.text + b.text });
    }
  }
  return spans;
}

function mergeRanges(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

// Highlights every query word, exact substrings and fuzzy/typo matches
// alike, so a match that only found the article via fuzzyContains (a typo,
// or "preorders" against "pre-orders") still shows the reader why it
// matched, the same way a plain substring hit already did. A word that
// matches literally somewhere is left to that literal pass everywhere it
// appears; only words with no literal occurrence at all fall back to
// highlighting whichever whole word/compound token fuzzy-matched them.
function highlightMatches(text: string, query: string, className = "kb-highlight") {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return escapeHtml(text);

  const lowerText = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];

  for (const word of words) {
    let fromIndex = 0;
    let foundLiteral = false;
    while (fromIndex <= lowerText.length) {
      const idx = lowerText.indexOf(word, fromIndex);
      if (idx === -1) break;
      foundLiteral = true;
      ranges.push({ start: idx, end: idx + word.length });
      fromIndex = idx + word.length;
    }

    if (!foundLiteral) {
      for (const span of findWordSpans(text)) {
        const normalized = span.text.toLowerCase().replace(/-/g, "");
        if (fuzzyContains(normalized, word)) {
          ranges.push({ start: span.start, end: span.end });
        }
      }
    }
  }

  if (!ranges.length) return escapeHtml(text);

  let out = "";
  let cursor = 0;
  for (const range of mergeRanges(ranges)) {
    out += escapeHtml(text.slice(cursor, range.start));
    out += `<mark class="${className}">${escapeHtml(text.slice(range.start, range.end))}</mark>`;
    cursor = range.end;
  }
  out += escapeHtml(text.slice(cursor));
  return out;
}

function captureSearchFocus() {
  const active = document.activeElement as HTMLInputElement | null;
  if (!active || active.id !== SEARCH_INPUT_ID) return null;
  return { start: active.selectionStart, end: active.selectionEnd };
}

function restoreSearchFocus(info: { start: number | null; end: number | null } | null) {
  if (!info) return;
  const el = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
  if (!el) return;
  el.focus();
  el.setSelectionRange(info.start ?? el.value.length, info.end ?? el.value.length);
}

function captureScroll(selector: string): number | null {
  const el = document.querySelector(selector);
  return el ? el.scrollTop : null;
}

function restoreScroll(selector: string, value: number | null) {
  if (value === null) return;
  const el = document.querySelector(selector);
  if (el) el.scrollTop = value;
}

function toggleCategory(categoryId: string) {
  if (state.page !== "knowledge-base") return;
  const expandedCategories = new Set(state.kb.expandedCategories);
  if (expandedCategories.has(categoryId)) {
    expandedCategories.delete(categoryId);
  } else {
    expandedCategories.add(categoryId);
  }
  state = { page: "knowledge-base", kb: { ...state.kb, expandedCategories } };
}

function goToWelcome() {
  if (state.page !== "knowledge-base") return;
  state = { page: "knowledge-base", kb: { ...state.kb, articleId: null, query: "" } };
  recordNavHistory(null);
}

function goToFaq() {
  if (state.page !== "knowledge-base") return;
  state = { page: "knowledge-base", kb: { ...state.kb, articleId: FAQ_PAGE_ID, query: "" } };
  recordNavHistory(FAQ_PAGE_ID);
}

function browseCategory(categoryId: string) {
  if (state.page !== "knowledge-base") return;
  const expandedCategories = new Set(state.kb.expandedCategories);
  expandedCategories.add(categoryId);
  state = { page: "knowledge-base", kb: { ...state.kb, expandedCategories } };
}

function openArticle(articleId: string) {
  if (state.page !== "knowledge-base") return;
  const article = getAllArticlesFlat().find((a) => a.id === articleId);
  if (!article) return;
  // Deliberately doesn't auto-expand the article's real category, opening
  // it from Bookmarks (or a filtered result) shouldn't also force it open and
  // highlighted a second time somewhere else in the tree.
  state = {
    page: "knowledge-base",
    kb: { ...state.kb, articleId: article.id },
  };
  recordNavHistory(article.id);
}

// Expands the article's real category in the sidebar tree (used for entry
// points that start from a state where it isn't visible anywhere yet: an
// inline in-article link, a welcome-page link, or back/forward landing on
// an article that wasn't reached via the tree itself).
function revealArticleInSidebar(articleId: string) {
  const article = getAllArticlesFlat().find((a) => a.id === articleId);
  if (article) browseCategory(article.categoryId);
}

function scrollArticleRowIntoView(articleId: string) {
  document.querySelector(`.kb-tree-row--article[data-article="${articleId}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function countMatchingArticles(query: string): number {
  return getAllArticlesFlat().filter((a) => articleMatchesFuzzy(a, query, getArticleBodyText(a.id))).length;
}

function updateQuery(query: string) {
  if (state.page !== "knowledge-base") return;
  state = { page: "knowledge-base", kb: { ...state.kb, query } };
}

// Content area is fully replaced on every render, so these are safe to
// re-attach each time (the old elements, and their listeners, are gone).
function wireContentEvents() {
  document.querySelectorAll<HTMLButtonElement>(".kb-tree-row--category[data-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleCategory(btn.dataset.category!);
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-welcome]").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToWelcome();
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-faq]").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToFaq();
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-article]:not(.kb-welcome-link):not(.article-inline-link)").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openArticle(btn.dataset.article!);
      render();
    });
  });

  // Unlike opening an article from the sidebar tree or Bookmarks, a
  // "Recently updated" link on the welcome page (or an inline cross-link
  // from inside another article's body) starts from a state where the
  // target article's category isn't already visible anywhere in the
  // sidebar, so here (and only here) it's worth also expanding that
  // category and highlighting the row, otherwise the sidebar looks like it
  // did nothing at all.
  document.querySelectorAll<HTMLButtonElement>(".kb-welcome-link[data-article], .article-inline-link[data-article]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const articleId = btn.dataset.article!;
      openArticle(articleId);
      revealArticleInSidebar(articleId);
      render();
      scrollArticleRowIntoView(articleId);
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-nav-back]").forEach((btn) => {
    btn.addEventListener("click", () => goHistory(-1));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-nav-forward]").forEach((btn) => {
    btn.addEventListener("click", () => goHistory(1));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-category-card]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const categoryId = btn.dataset.categoryCard!;
      browseCategory(categoryId);
      const firstArticle = categories.find((c) => c.id === categoryId)?.articles[0];
      if (firstArticle) openArticle(firstArticle.id);
      render();
      document
        .querySelector(`.kb-tree-row--category[data-category="${categoryId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-bookmark]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const articleId = btn.dataset.bookmark!;
      toggleBookmark(articleId);
      render();
      showToast(bookmarkedArticleIds.has(articleId) ? "Bookmarked" : "Bookmark removed");
    });
  });

  // Swaps the icon in place for a moment rather than going through
  // render(), copying a link is a transient "it worked" blip, not a
  // change to anything render() actually reflects.
  document.querySelectorAll<HTMLButtonElement>("[data-copy-url]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        return;
      }
      const svg = btn.querySelector("svg");
      if (svg) {
        svg.innerHTML = COPIED_ICON;
        btn.title = "Copied!";
        window.setTimeout(() => {
          svg.innerHTML = COPY_ICON;
          btn.title = "Copy link";
        }, 1500);
      }
      showToast("Link copied");
    });
  });

  document.getElementById(SEARCH_INPUT_ID)?.addEventListener("input", (e) => {
    updateQuery((e.target as HTMLInputElement).value);
    render();
  });

  document.getElementById("kb-search-clear")?.addEventListener("click", clearFilter);
}

// Clearing the filter shouldn't collapse categories that were only showing
// because the filter forced them open; carry those over as explicitly
// expanded so the sidebar stays put. Shared by the search box's own clear
// button and by pressing Escape from anywhere (including from inside an
// open article, not just while the search input is focused).
function clearFilter() {
  const query = state.page === "knowledge-base" ? state.kb.query : "";
  if (state.page === "knowledge-base" && query) {
    const expandedCategories = new Set(state.kb.expandedCategories);
    for (const category of categories) {
      if (category.articles.some((a) => articleMatchesFuzzy(a, query, getArticleBodyText(a.id)))) {
        expandedCategories.add(category.id);
      }
    }
    state = { page: "knowledge-base", kb: { ...state.kb, expandedCategories } };
  }
  updateQuery("");
  render();
  document.getElementById(SEARCH_INPUT_ID)?.focus();
}

renderShell();
render();
