import { html } from 'lit-html';
import type {
	Dashboard,
	FileTranslationStatus,
	Locale,
	LunariaConfig,
	LunariaRendererConfig,
	TranslationStatus,
} from '../types.js';
import { getTextFromFormat } from '../utils/misc.js';
import { Styles } from './styles.js';

export const Page = (
	opts: LunariaConfig,
	rendererOpts: LunariaRendererConfig,
	translationStatus: FileTranslationStatus[]
) => {
	const { dashboard } = opts;
	const { slots, overrides } = rendererOpts;

	return html`
		<!doctype html>
		<html dir="${dashboard.ui.dir}" lang="${dashboard.ui.lang}">
			<head>
				<!-- Built-in/custom meta tags -->
				${overrides.meta?.(opts) ?? Meta(dashboard)}
				<!-- Additional head tags -->
				${slots.head?.(opts) ?? ''}
				<!-- Built-in/custom styles -->
				${overrides.styles?.(opts) ?? Styles}
			</head>
			<body>
				<!-- Built-in/custom body content -->
				${overrides.body?.(opts, translationStatus) ?? Body(opts, rendererOpts, translationStatus)}
			</body>
		</html>
	`;
};

export const Meta = (dashboard: Dashboard) => html`
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
	<title>${dashboard.title}</title>
	<meta name="description" content="${dashboard.description}" />
	${dashboard.site ? html`<link rel="canonical" href="${dashboard.site}" />` : ''}
	<meta property="og:title" content="${dashboard.title}" />
	<meta property="og:type" content="website" />
	${dashboard.site ? html`<meta property="og:url" content="${dashboard.site}" />` : ''}
	<meta property="og:description" content="${dashboard.description}" />
`;

export const Body = (
	opts: LunariaConfig,
	rendererOpts: LunariaRendererConfig,
	translationStatus: FileTranslationStatus[]
) => {
	const { dashboard } = opts;
	const { slots, overrides } = rendererOpts;

	return html`
		<main>
			<div class="limit-to-viewport">
				${slots.beforeTitle?.(opts) ?? ''}
				<h1>${dashboard.title}</h1>
				${slots.afterTitle?.(opts) ?? ''}
				${overrides.statusByLocale?.(opts, translationStatus) ??
				StatusByLocale(opts, translationStatus)}
			</div>
			${overrides.statusByContent?.(opts, translationStatus) ??
			StatusByContent(opts, translationStatus)}
		</main>
	`;
};

export const StatusByLocale = (opts: LunariaConfig, translationStatus: FileTranslationStatus[]) => {
	const { dashboard, locales } = opts;
	return html`
		<h2 id="by-locale">
			<a href="#by-locale">${dashboard.ui['statusByLocale.heading']}</a>
		</h2>
		${locales.map((locale) => LocaleDetails(translationStatus, dashboard, locale))}
	`;
};

export const LocaleDetails = (
	translationStatus: FileTranslationStatus[],
	dashboard: Dashboard,
	locale: Locale
) => {
	const { label, lang } = locale;

	const missingPages = translationStatus.filter((content) => content.translations[lang]?.isMissing);
	const outdatedPages = translationStatus.filter(
		(content) =>
			content.translations[lang]?.isOutdated || !content.translations[lang]?.completeness.complete
	);
	const doneLength = translationStatus.length - outdatedPages.length - missingPages.length;

	return html`
		<details>
			<summary>
				<strong
					>${getTextFromFormat(dashboard.ui['statusByLocale.detailsTitleFormat'], {
						'{locale_name}': label,
						'{locale_tag}': lang,
					})}</strong
				>
				<br />
				<span class="progress-summary"
					>${getTextFromFormat(dashboard.ui['statusByLocale.detailsSummaryFormat'], {
						'{done_amount}': doneLength.toString(),
						'{done_word}': dashboard.ui['status.done'],
						'{outdated_amount}': outdatedPages.length.toString(),
						'{outdated_word}': dashboard.ui['status.outdated'],
						'{missing_amount}': missingPages.length.toString(),
						'{missing_word}': dashboard.ui['status.missing'],
					})}</span
				>
				<br />
				${ProgressBar(translationStatus.length, outdatedPages.length, missingPages.length)}
			</summary>
			${outdatedPages.length > 0 ? OutdatedPages(outdatedPages, lang, dashboard) : ''}
			${missingPages.length > 0
				? html`<h3 class="capitalize">${dashboard.ui['status.missing']}</h3>
						<ul>
							${missingPages.map(
								(page) => html`
									<li>
										${page.gitHostingFileURL
											? Link(page.gitHostingFileURL, page.sharedPath)
											: page.sharedPath}
										${page.translations[lang]?.gitHostingFileURL
											? CreatePageLink(
													page.translations[lang]?.gitHostingFileURL!,
													dashboard.ui['statusByLocale.createFileLink']
											  )
											: ''}
									</li>
								`
							)}
						</ul>`
				: ''}
			${missingPages.length == 0 && outdatedPages.length == 0
				? html`<p>${dashboard.ui['statusByLocale.completeTranslation']}</p>`
				: ''}
		</details>
	`;
};

export const OutdatedPages = (
	outdatedPages: FileTranslationStatus[],
	lang: string,
	dashboard: Dashboard
) => {
	return html`
		<h3 class="capitalize">${dashboard.ui['status.outdated']}</h3>
		<ul>
			${outdatedPages.map(
				(page) => html`
					<li>
						${!page.translations[lang]?.completeness.complete
							? html`
									<details>
										<summary>${ContentDetailsLinks(page, lang, dashboard)}</summary>
										${html`
											<h4>${dashboard.ui['statusByLocale.missingKeys']}</h4>
											<ul>
												${page.translations[lang]?.completeness.missingKeys!.map(
													(key) => html`<li>${key}</li>`
												)}
											</ul>
										`}
									</details>
							  `
							: html` ${ContentDetailsLinks(page, lang, dashboard)} `}
					</li>
				`
			)}
		</ul>
	`;
};

export const StatusByContent = (
	opts: LunariaConfig,
	translationStatus: FileTranslationStatus[]
) => {
	const { dashboard, locales } = opts;
	return html`
		<h2 id="by-content">
			<a href="#by-content">${dashboard.ui['statusByContent.heading']}</a>
		</h2>
		<table class="status-by-content">
			<thead>
				<tr>
					${[dashboard.ui['statusByContent.tableRowPage'], ...locales.map(({ lang }) => lang)].map(
						(col) => html`<th>${col}</th>`
					)}
				</tr>
			</thead>
			${TableBody(translationStatus, locales, dashboard)}
		</table>
		<sup class="capitalize"
			>${getTextFromFormat(dashboard.ui['statusByContent.tableSummaryFormat'], {
				'{missing_emoji}': dashboard.ui['status.emojiMissing'],
				'{missing_word}': dashboard.ui['status.missing'],
				'{outdated_emoji}': dashboard.ui['status.emojiOutdated'],
				'{outdated_word}': dashboard.ui['status.outdated'],
				'{done_emoji}': dashboard.ui['status.emojiDone'],
				'{done_word}': dashboard.ui['status.done'],
			})}
		</sup>
	`;
};

export const TableBody = (
	translationStatus: FileTranslationStatus[],
	locales: Locale[],
	dashboard: Dashboard
) => {
	return html`
		<tbody>
			${translationStatus.map(
				(page) =>
					html`
				<tr>
					<td>${page.gitHostingFileURL ? Link(page.gitHostingFileURL, page.sharedPath) : page.sharedPath}</td>
						${locales.map(({ lang }) => {
							return TableContentStatus(page.translations, lang, dashboard);
						})}
					</td>
				</tr>`
			)}
		</tbody>
	`;
};

export const TableContentStatus = (
	translations: { [locale: string]: TranslationStatus },
	lang: string,
	dashboard: Dashboard
) => {
	return html`
		<td>
			${translations[lang]?.isMissing
				? EmojiFileLink(dashboard.ui, translations[lang]?.gitHostingFileURL!, 'missing')
				: translations[lang]?.isOutdated || !translations[lang]?.completeness.complete
				? EmojiFileLink(dashboard.ui, translations[lang]?.gitHostingFileURL!, 'outdated')
				: EmojiFileLink(dashboard.ui, translations[lang]?.gitHostingFileURL!, 'done')}
		</td>
	`;
};

export const ContentDetailsLinks = (
	page: FileTranslationStatus,
	lang: string,
	dashboard: Dashboard
) => {
	return html`
		${page.gitHostingFileURL ? Link(page.gitHostingFileURL, page.sharedPath) : page.sharedPath}
		${page.translations[lang]
			? page.translations[lang]?.gitHostingFileURL || page.translations[lang]?.gitHostingHistoryURL
				? html`(${page.translations[lang]?.gitHostingFileURL
						? Link(
								page.translations[lang]?.gitHostingFileURL!,
								!page.translations[lang]?.completeness.complete
									? dashboard.ui['statusByLocale.incompleteTranslationLink']
									: dashboard.ui['statusByLocale.outdatedTranslationLink']
						  )
						: ''},
				  ${page.translations[lang]?.gitHostingHistoryURL
						? Link(
								page.translations[lang]?.gitHostingHistoryURL!,
								dashboard.ui['statusByLocale.sourceChangeHistoryLink']
						  )
						: ''})`
				: ''
			: ''}
	`;
};

export const EmojiFileLink = (
	ui: Dashboard['ui'],
	href: string | null,
	status: 'missing' | 'outdated' | 'done'
) => {
	const statusTextOpts = {
		missing: 'status.missing',
		outdated: 'status.outdated',
		done: 'status.done',
	} as const;

	const statusEmojiOpts = {
		missing: 'status.emojiMissing',
		outdated: 'status.emojiOutdated',
		done: 'status.emojiDone',
	} as const;

	return href
		? html`<a href="${href}" title="${ui[statusTextOpts[status]]}">
				<span aria-hidden="true">${ui[statusEmojiOpts[status]]}</span>
		  </a>`
		: html`<span title="${ui[statusTextOpts[status]]}">
				<span aria-hidden="true">${ui[statusEmojiOpts[status]]}</span>
		  </span>`;
};

export const Link = (href: string, text: string) => {
	return html`<a href="${href}">${text}</a>`;
};

export const CreatePageLink = (href: string, text: string) => {
	return html`<a class="create-button" href="${href}">${text}</a>`;
};

export const ProgressBar = (
	total: number,
	outdated: number,
	missing: number,
	{ size = 20 }: { size?: number } = {}
) => {
	const outdatedBlocks = Math.round((outdated / total) * size);
	const missingBlocks = Math.round((missing / total) * size);
	const doneBlocks = size - outdatedBlocks - missingBlocks;
	return html`
		<span class="progress-bar" aria-hidden="true">
			${[
				[doneBlocks, '🟪'],
				[outdatedBlocks, '🟧'],
				[missingBlocks, '⬜'],
			]
				.map(([length, icon]) => Array(length).fill(icon))
				.flat()
				.join('')}
		</span>
	`;
};
