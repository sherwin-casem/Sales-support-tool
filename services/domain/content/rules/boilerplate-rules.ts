export const BOILERPLATE_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  '[aria-hidden="true"]',
  "form[role='search']",
];

export const BOILERPLATE_CLASS_ID_PATTERNS = [
  "nav",
  "navbar",
  "menu",
  "breadcrumb",
  "cookie",
  "consent",
  "gdpr",
  "onetrust",
  "sidebar",
  "social",
  "share",
  "advert",
  "ad-slot",
  "pagination",
  "pager",
  "site-footer",
  "site-header",
];

export const REMOVABLE_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "canvas",
  "video",
  "audio",
]);

export const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "main",
  "li",
  "td",
  "th",
  "dd",
  "dt",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "tr",
]);

export const MAIN_CONTENT_SELECTORS = ["main", '[role="main"]', "article"];

export const JSON_LD_TYPES = new Set([
  "Organization",
  "LocalBusiness",
  "Corporation",
  "WebSite",
  "ProfessionalService",
]);
