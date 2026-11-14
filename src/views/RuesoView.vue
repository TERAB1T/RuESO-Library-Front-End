<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useHead } from '@unhead/vue';
import { useItemLightbox } from '@/composables/useItemLightbox';
import { RouterLink } from 'vue-router';
import F76ItemGallery from '@/components/F76ItemGallery.vue';
import type { ItemGallerySlide } from '@/types';
import {
	ruesoScreenshots, ruesoFaq, ruesoChangelog,
	RUESO_ESOUI_URL, RUESO_LIBADDONMENU_URL, RUESO_DISCORD_URL,
} from '@/ruesoData';
import type { RuesoRelease } from '@/ruesoData';
import { formatIsoDateGenitive as formatDate, ONEST_PRELOAD } from '@/utils';
import { useCopyOnClick } from '@/composables/useCopyOnClick';

const IMG = '/public/img/rueso/';
const VISIBLE_RELEASES = 4;
const installPaths = [
	{ system: 'Windows', path: '%USERPROFILE%\\Documents\\Elder Scrolls Online\\live\\AddOns' },
	{ system: 'Mac', path: '~/Documents/Elder Scrolls Online/live/AddOns' },
];

const current = ruesoChangelog[0] as RuesoRelease;
const gallerySlides: ItemGallerySlide[] = ruesoScreenshots.map((shot) => ({
	href: `${IMG}${shot.file}.webp`,
	src: `${IMG}${shot.file}-thumb.webp`,
	alt: shot.alt,
}));
const recentReleases = ruesoChangelog.slice(0, VISIBLE_RELEASES);
const olderReleases = ruesoChangelog.slice(VISIBLE_RELEASES);

const metaTitle = 'RuESO — модификация для The Elder Scrolls Online | RuESO';
const metaDescription = 'RuESO дополняет официальную русскую локализацию ESO: оригинальные названия предметов, способностей, локаций и имен персонажей, двуязычный поиск наборов и быстрое переключение языка игры.';
const metaLink = 'https://rueso.ru/rueso';
const metaIcon = 'https://rueso.ru/public/img/main-card-rueso.jpg';

const tabs = [
	{ id: 'about', label: 'Описание' },
	{ id: 'install', label: 'Установка' },
	{ id: 'faq', label: 'Вопросы и ответы' },
	{ id: 'changelog', label: 'История изменений' },
];

useHead({
	title: metaTitle,
	meta: [
		{ name: 'description', content: metaDescription },
		{ name: 'robots', content: 'index, follow' },

		{ property: 'og:title', content: metaTitle },
		{ property: 'og:description', content: metaDescription },
		{ property: 'og:image', content: metaIcon },
		{ property: 'og:url', content: metaLink },
		{ property: 'og:locale', content: 'ru_RU' },
		{ property: 'og:site_name', content: 'RuESO' },

		{ name: 'twitter:title', content: metaTitle },
		{ name: 'twitter:description', content: metaDescription },
		{ name: 'twitter:image', content: metaIcon },
		{ name: 'twitter:card', content: 'summary' },
		{ name: 'twitter:creator', content: '@TERAB1T' },
	],
	link: [
		{ rel: 'canonical', href: metaLink },
		...ONEST_PRELOAD,
	],
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: 'RuESO',
				description: metaDescription,
				applicationCategory: 'GameApplication',
				operatingSystem: 'Windows, macOS',
				softwareVersion: current.version,
				dateModified: current.date,
				downloadUrl: RUESO_ESOUI_URL,
				image: metaIcon,
				inLanguage: 'ru',
				url: metaLink,
				offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
			})
		},
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: ruesoFaq.map((item) => ({
					'@type': 'Question',
					name: item.question,
					acceptedAnswer: { '@type': 'Answer', text: item.answer },
				})),
			})
		},
		// The server never sees the hash, so it renders the first tab. Before the first paint this marks the tab
		// from the hash, and the styles show it until mount switches the tabs for real (no flash, no layout shift).
		// Server only: on a client-side navigation the tabs are switched before anything is painted.
		...(import.meta.env.SSR ? [{
			innerHTML: `(() => { const tab = location.hash.slice(1); if (${JSON.stringify(tabs.slice(1).map((tab) => tab.id))}.includes(tab)) document.documentElement.dataset.ruesoTab = tab; })();`,
		}] : []),
	]
});

const copiedPath = ref('');
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const copyPath = async (path: string) => {
	try {
		await navigator.clipboard.writeText(path);
	} catch (err) {
		console.error('Ошибка копирования:', err);
		return;
	}
	copiedPath.value = path;
	clearTimeout(copiedTimer);
	copiedTimer = setTimeout(() => (copiedPath.value = ''), 1500);
};

const page = ref<HTMLElement | null>(null);
const hero = ref<HTMLElement | null>(null);
const tabsBar = ref<HTMLElement | null>(null);

useCopyOnClick(page, { title: 'Команда скопирована' });
// Screenshots that page into each other are grouped in .lightbox-group, so the lightbox never pages into
// a hidden tab or into the desktop grid, which is hidden on mobile (the slider there has its own lightbox).
// The addon's screenshots are 16:9.
const { initLightbox, destroyLightbox } = useItemLightbox('.rueso .lightbox-group', { width: 1920, height: 1080 });

const onTabShown = (event: Event) => {
	const id = (event.target as HTMLElement).id.replace(/-tab$/, '');
	// The hash makes the open tab linkable. Not router.replace: every navigation counts as a page view.
	// vue-router rewrites the entry with state.current before its next push, so that has to carry the hash too.
	const url = location.pathname + location.search + (id === tabs[0]!.id ? '' : `#${id}`);
	history.replaceState({ ...history.state, current: url }, '', url);

	// A tab switched far down the page would otherwise open somewhere in its middle. Measured from
	// the hero: a stuck tab bar reports its stuck position, not where it sits in the page.
	if (!hero.value || !tabsBar.value) return;
	const stuckAt = parseFloat(getComputedStyle(tabsBar.value).top) || 0;
	const target = hero.value.getBoundingClientRect().bottom + window.scrollY - stuckAt;
	if (window.scrollY > target) window.scrollTo({ top: target });
};

onMounted(async () => {
	if (!page.value) return;

	initLightbox();

	// The tab from the hash is switched synchronously, by hand, rather than with Bootstrap's Tab (an async import):
	// vue-router restores the scroll position right after mount, and it must find that tab's content already there.
	const linked = tabs.find((tab) => `#${tab.id}` === location.hash);
	if (linked) {
		for (const { id } of tabs) {
			const isLinked = id === linked.id;
			document.getElementById(`${id}-tab`)?.classList.toggle('active', isLinked);
			document.getElementById(`${id}-tab`)?.setAttribute('aria-selected', String(isLinked));
			document.getElementById(`${id}-pane`)?.classList.toggle('active', isLinked);
			document.getElementById(`${id}-pane`)?.classList.toggle('show', isLinked);
		}
	}

	delete document.documentElement.dataset.ruesoTab;

	// Registers Bootstrap's data-api, which handles clicks on the data-bs-toggle="tab" buttons.
	await import('bootstrap');
	page.value.addEventListener('shown.bs.tab', onTabShown);
});

onBeforeUnmount(() => {
	clearTimeout(copiedTimer);
	page.value?.removeEventListener('shown.bs.tab', onTabShown);
	destroyLightbox();
});
</script>

<template>
	<main ref="page" class="rueso">
		<header ref="hero" class="hero">
			<img class="hero-art" :src="`${IMG}hero-bg.webp`" width="1600" height="779" alt="" aria-hidden="true">
			<div class="container-xl hero-inner">
				<div class="hero-title">
					<h1>RuESO</h1>
					<p>Дополнительные функции для официальной русской локализации The Elder Scrolls Online</p>
				</div>
				<div class="hero-actions">
					<a :href="RUESO_ESOUI_URL" target="_blank" rel="noopener" class="btn btn-primary">Скачать на ESOUI</a>
					<span>Версия <b>{{ current.version }}</b> (<time :datetime="current.date">{{ current.date.split('-').reverse().join('.') }}</time>)</span>
				</div>
			</div>
		</header>

		<div ref="tabsBar" class="tabs-bar">
			<div class="container-xl">
				<ul class="nav nav-tabs" role="tablist">
					<li v-for="(tab, index) in tabs" :key="tab.id" class="nav-item" role="presentation">
						<button :id="`${tab.id}-tab`" class="nav-link" :class="{ active: index === 0 }" data-bs-toggle="tab" :data-bs-target="`#${tab.id}-pane`" type="button" role="tab" :aria-controls="`${tab.id}-pane`" :aria-selected="index === 0">{{ tab.label }}</button>
					</li>
				</ul>
			</div>
		</div>

		<div class="container-xl layout">
			<div class="tab-content">
				<section id="about-pane" class="tab-pane show active" role="tabpanel" aria-labelledby="about-tab" tabindex="0">
					<p class="prose"><strong>RuESO</strong> — это модификация для <strong>The Elder Scrolls Online</strong>, которая содержит ряд полезных функций для тех, кто играет в <strong>ESO</strong> на русском.</p>
					<p class="prose">Изначально проект <strong>RuESO</strong> создавался для перевода игры на русский язык, но с выходом официальной локализации его направленность изменилась — модификация больше ничего не переводит, а лишь делает игру с локализацией комфортнее.</p>
					<p class="prose"><strong>RuESO</strong> может показывать оригинальные английские названия вместо русских или рядом с ними — отдельно для имен персонажей, названий локаций, способностей (в том числе в системе героя), предметов с их зачарованиями и особенностями, а также наборов на ремесленных станках и в меню коллекций. Кроме того, с <strong>RuESO</strong> в меню коллекций можно искать названия наборов на английском.</p>
					<p class="prose">Все параметры <strong>RuESO</strong> регулируются в специальном меню настроек. Чтобы в него попасть, нажмите ESC, щелкните по пункту «Настройки», перейдите в раздел «Дополнения» (или «Модификации») и в открывшемся меню выберите «RuESO» (<span class="lightbox-group"><a class="screenshot-link text-link" :href="`${IMG}settings1.webp`">скриншот</a></span>).</p>

					<div class="fo-sect-h section-heading">
						<span class="fo-bar"></span>
						<h2 class="fo-h3">Галерея</h2>
					</div>
					<!-- As on Atomic Shop item pages: a grid of thumbnails on desktop, the slider on mobile. -->
					<div class="row g-3 d-none d-lg-flex lightbox-group">
						<div v-for="slide in gallerySlides" :key="slide.href" class="col-12 col-md-4">
							<a :href="slide.href" class="screenshot-link">
								<img :src="slide.src" class="img-fluid screenshot-img" width="640" height="360" loading="lazy" :alt="slide.alt">
							</a>
						</div>
					</div>
					<F76ItemGallery class="d-lg-none" :slides="gallerySlides" :image-width="640" :image-height="360" :image-fallback="false" />
				</section>

				<section id="install-pane" class="tab-pane lightbox-group" role="tabpanel" aria-labelledby="install-tab" tabindex="0">
					<div class="fo-sect-h">
						<span class="fo-bar"></span>
						<h2 class="fo-h3">Через Minion</h2>
					</div>
					<p class="prose">Проще всего установить RuESO с помощью <a href="https://minion.mmoui.com" target="_blank" rel="noopener">Minion</a> — удобного менеджера модификаций.</p>

					<ol class="steps">
						<li>Установите Minion. Подробная инструкция есть <a href="https://www.esoui.com/forums/showthread.php?t=238" target="_blank" rel="noopener">на ESOUI</a> (на английском).</li>
						<li>На вкладке «Find More» найдите «LibAddonMenu» и нажмите «Install».</li>
						<li>Там же найдите «RuESO» и нажмите «Install».</li>
						<li>Запустите ESO и войдите в мир игры (после создания или выбора персонажа).</li>
						<li>Появится сообщение о необходимости обновить базу RuESO. Нажмите «Обновить базу» и дождитесь окончания.</li>
						<li>Откройте настройки модификации (ESC → Настройки → Дополнения → RuESO) и установите нужные параметры.</li>
					</ol>
					<p class="prose muted">После крупных обновлений ESO заглядывайте в Minion: если у RuESO или LibAddonMenu есть новая версия, нажмите напротив нее «Update».</p>
					<a class="screenshot-link inline-shot inline-shot-strip" :href="`${IMG}minion-update.webp`">
						<img :src="`${IMG}minion-update.webp`" class="img-fluid screenshot-img" width="818" height="74" loading="lazy" alt="Кнопка «Update» напротив модификации в Minion">
					</a>

					<div class="fo-sect-h section-heading">
						<span class="fo-bar"></span>
						<h2 class="fo-h3">Без Minion</h2>
					</div>
					<p class="prose">Скачайте архивы <a :href="RUESO_ESOUI_URL" target="_blank" rel="noopener">RuESO</a> и <a :href="RUESO_LIBADDONMENU_URL" target="_blank" rel="noopener">LibAddonMenu</a> и скопируйте папки из обоих в каталог аддонов:</p>
					<div class="paths">
						<div v-for="{ system, path } in installPaths" :key="system" class="path">
							<label :for="`path-${system}`">{{ system }}</label>
							<div class="input-group">
								<input :id="`path-${system}`" type="text" class="form-control" :value="path" readonly spellcheck="false" @focus="($event.target as HTMLInputElement).select()">
								<button type="button" class="btn path-copy" :aria-label="`Скопировать путь для ${system}`" :title="copiedPath === path ? 'Скопировано' : 'Скопировать'" @click="copyPath(path)">
									<svg v-if="copiedPath === path" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
										<path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
									</svg>
									<svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
										<path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z" />
									</svg>
								</button>
							</div>
						</div>
						<span class="visually-hidden" aria-live="polite">{{ copiedPath ? 'Скопировано' : '' }}</span>
					</div>
					<p class="prose">Дальше — как с Minion, начиная с шага 4. Чтобы обновить модификацию, скачайте и скопируйте архивы заново.</p>

					<div class="fo-sect-h section-heading">
						<span class="fo-bar"></span>
						<h2 class="fo-h3">Настройки и база названий</h2>
					</div>
					<p class="prose">Все параметры RuESO находятся в меню ESC → Настройки → Дополнения (или «Модификации») → RuESO; туда же ведет команда <span class="support-item-name">/rueso</span> в чате. Оригинальные названия включаются в подразделах «Оригинальные названия», горячие клавиши для языков — в ESC → Управление → Общее → RuESO.</p>
					<a class="screenshot-link inline-shot" :href="`${IMG}settings1.webp`">
						<img :src="`${IMG}settings1.webp`" class="img-fluid screenshot-img" width="1920" height="1080" loading="lazy" alt="Меню настроек RuESO">
					</a>
					<p class="prose">Большинству функций нужна база оригинальных названий. Она создается при установке и обновляется после крупных обновлений ESO или RuESO — игра сама предложит это сделать. Обновить базу вручную можно кнопкой «Обновить базу» в настройках.</p>
					<a class="screenshot-link inline-shot" :href="`${IMG}settings2.webp`">
						<img :src="`${IMG}settings2.webp`" class="img-fluid screenshot-img" width="1920" height="1080" loading="lazy" alt="Кнопка «Обновить базу» в настройках RuESO">
					</a>
				</section>

				<section id="faq-pane" class="tab-pane" role="tabpanel" aria-labelledby="faq-tab" tabindex="0">
					<div class="faq">
						<details v-for="item in ruesoFaq" :key="item.question">
							<summary>{{ item.question }}</summary>
							<p v-html="item.answer"></p>
						</details>
					</div>
				</section>

				<section id="changelog-pane" class="tab-pane" role="tabpanel" aria-labelledby="changelog-tab" tabindex="0">
					<div class="release" v-for="release in recentReleases" :key="release.version">
						<h3>{{ release.version }}</h3>
						<time :datetime="release.date">{{ formatDate(release.date) }}</time>
						<ul>
							<li v-for="change in release.changes" :key="change" v-html="change"></li>
						</ul>
					</div>
					<details class="older">
						<summary>Более ранние версии: {{ olderReleases.length }}</summary>
						<div class="release" v-for="release in olderReleases" :key="release.version">
							<h3>{{ release.version }}</h3>
							<time :datetime="release.date">{{ formatDate(release.date) }}</time>
							<ul>
								<li v-for="change in release.changes" :key="change" v-html="change"></li>
							</ul>
						</div>
					</details>
				</section>
			</div>

			<aside class="sidebar">
				<dl class="facts">
					<dt>Версия</dt>
					<dd>{{ current.version }}</dd>
					<dt>Последнее обновление</dt>
					<dd><time :datetime="current.date">{{ formatDate(current.date) }}</time></dd>
					<dt>Платформы</dt>
					<dd>ПК: Windows и macOS</dd>
					<dt>Требуется</dt>
					<dd><a :href="RUESO_LIBADDONMENU_URL" target="_blank" rel="noopener">LibAddonMenu</a></dd>
				</dl>
				<h2>Ссылки</h2>
				<ul class="links">
					<li><a :href="RUESO_ESOUI_URL" target="_blank" rel="noopener">Страница на ESOUI</a></li>
					<li><a :href="RUESO_DISCORD_URL" target="_blank" rel="noopener">Discord: вопросы и предложения</a></li>
					<li><a href="https://discord.gg/95xsYd4C6D" target="_blank" rel="noopener">Сообщить об ошибке в локализации</a></li>
					<li><RouterLink to="/glossary-tes">База текстов TES</RouterLink></li>
				</ul>
			</aside>
		</div>
	</main>
</template>

<style scoped lang="scss">
.rueso {
	--rueso-rule: rgba(255, 255, 255, 0.08);
	--rueso-indent: 1.75em;

	margin-bottom: 64px;
	line-height: 1.6;
}

h3 {
	font-size: 1.1rem;
	font-weight: 600;
	line-height: 1.35;
}

.prose {
	margin: 0 0 14px;
}

.muted {
	color: var(--fo-text2);
}

/* Same band as the home page hero: art edge to edge, hard bottom edge, no box. */
.hero {
	position: relative;
	border-bottom: 1px solid #3f3f46;
	background: var(--bs-block-bg);
	overflow: hidden;
	isolation: isolate;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(90deg, rgba(18, 18, 18, 0.92) 0%, rgba(18, 18, 18, 0.78) 50%, rgba(18, 18, 18, 0.66) 100%);
	}
}

.hero-art {
	position: absolute;
	inset: 0;
	z-index: -2;
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: 70% 45%;
}

.hero-inner {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 28px;
	padding-block: 48px;
}

.hero-title {
	h1 {
		margin: 0 0 6px;
		font-family: 'Onest', sans-serif;
		font-weight: 700;
		font-size: clamp(2rem, 1.5rem + 1.6vw, 2.75rem);
		line-height: 1.1;
		letter-spacing: -0.015em;
		color: #fff;
	}

	p {
		max-width: 56ch;
		margin: 0;
		font-size: 1.1rem;
		line-height: 1.5;
		color: #c9ccd1;
	}
}

.hero-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8px;

	.btn {
		padding: 10px 24px;
		font-weight: 600;
	}

	span {
		font-size: 0.875rem;
		color: #c9ccd1;
	}

	b {
		font-weight: 600;
		color: #fff;
	}
}

.tabs-bar {
	position: sticky;
	/* Right under the site navbar, which is sticky too. */
	top: 67px;
	z-index: 3;
	border-bottom: 1px solid var(--rueso-rule);
	background: var(--bs-body-bg);
}

/* The global .nav-tabs / .tab-content look is a card; here the tabs are a plain bar over the page. */
.nav-tabs {
	flex-wrap: nowrap;
	gap: 28px;
	border: 0;
	border-radius: 0;
	background: none;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: none;

	.nav-link {
		margin: 0;
		padding: 14px 0 12px;
		border: 0;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		font-size: 1rem;
		white-space: nowrap;
		color: var(--bs-body-color);

		&:hover {
			color: var(--bs-primary);
		}

		&.active {
			border-bottom: 2px solid var(--bs-primary);
			color: var(--bs-primary);
		}
	}
}

.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 280px;
	gap: 56px;
	align-items: start;
}

.sidebar {
	position: sticky;
	/* Below the sticky navbar and tab bar. */
	top: 120px;
	padding-top: 32px;
	font-size: 0.95rem;

	h2 {
		margin: 28px 0 10px;
		font-family: 'Onest', sans-serif;
		font-size: 1.1rem;
		font-weight: 700;
	}
}

.facts {
	margin: 0;

	dt {
		font-size: 0.85rem;
		font-weight: 400;
		color: var(--fo-text2);
	}

	dd {
		margin: 0 0 14px;
	}
}

.links {
	margin: 0;
	padding: 0;
	list-style: none;

	li + li {
		margin-top: 8px;
	}
}

.tab-content {
	padding: 0;
	border-radius: 0;
	background: none;
	/* Same text size and leading as a library book (.book-main). */
	font-size: 1.0325rem;
	line-height: 1.6;
}

.tab-pane {
	padding-top: 32px;

	&:focus-visible {
		outline: none;
	}
}

/* The tab from the link's hash until mount (see the head script); the ids are those of `tabs` after the first. */
:root[data-rueso-tab] {
	.tab-pane.active {
		display: none;
	}

	.nav-tabs .nav-link.active {
		border-bottom-color: transparent;
		color: var(--bs-body-color);
	}
}

@each $tab in install, faq, changelog {
	:root[data-rueso-tab='#{$tab}'] {
		##{$tab}-pane {
			display: block;
		}

		.nav-tabs ##{$tab}-tab {
			border-bottom-color: var(--bs-primary);
			color: var(--bs-primary);
		}
	}
}

.screenshot-link.text-link {
	display: inline;
	overflow: visible;
	border-radius: 0;
}

.inline-shot {
	width: fit-content;
	max-width: min(100%, 560px);
	margin: 4px auto 18px;
}

/* The Minion row is a thin strip: kept at its own width. */
.inline-shot-strip {
	max-width: 100%;
}

.section-heading {
	margin-top: 36px;
}

/* Numbers drawn with a counter instead of ::marker, so their left edge is known and the paths can share it. */
.steps {
	margin: 0 0 14px;
	padding-left: var(--rueso-indent);
	list-style: none;
	counter-reset: step;

	li {
		position: relative;
		padding-left: 1.3em;
		margin-bottom: 6px;
		counter-increment: step;

		&::before {
			content: counter(step) '.';
			position: absolute;
			left: 0;
		}
	}
}

.paths {
	display: grid;
	grid-template-columns: max-content minmax(0, 640px);
	justify-content: start;
	gap: 10px 16px;
	align-items: center;
	margin: 4px 0 16px;
	/* Labels start where the .steps numbers do. */
	padding-left: var(--rueso-indent);
}

/* Each row's label and field sit in the shared grid, so the fields line up. */
.path {
	display: contents;

	label {
		color: var(--fo-text2);
	}
}

/* Same look as the site's filter and search fields (input[type="search"] in main.scss). */
.path .input-group {
	--path-bg: #21222d;

	.form-control,
	.path-copy {
		border: 0;
		background-color: var(--path-bg);
		box-shadow: none;
		transition: background-color 200ms cubic-bezier(0, 0, 0.2, 1);
	}

	.form-control {
		font-family: var(--bs-font-monospace);
		font-size: 0.875rem;
		color: #f7f7f7;
		text-overflow: ellipsis;
	}

	&:hover {
		--path-bg: #2c2d33;
	}

	&:focus-within {
		--path-bg: #2b2b36;
	}
}

.path-copy {
	display: flex;
	align-items: center;
	color: var(--fo-text2);

	&:hover {
		color: var(--bs-body-color);
	}

	&:focus-visible {
		outline: 2px solid var(--bs-primary);
		outline-offset: -2px;
	}
}

.faq {
	border-top: 1px solid var(--rueso-rule);

	details {
		border-bottom: 1px solid var(--rueso-rule);

		p {
			margin: 0;
			padding: 0 32px 16px 0;
			color: var(--fo-text2);
		}
	}

	summary {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 0;
		font-weight: 500;
		list-style: none;
		cursor: pointer;

		&::-webkit-details-marker {
			display: none;
		}

		&::after {
			content: '+';
			flex: none;
			width: 1em;
			text-align: center;
			font-size: 1.25rem;
			line-height: 1.2;
			color: var(--fo-text2);
		}

		&:hover {
			color: var(--bs-primary);
		}
	}

	details[open] summary::after {
		content: '−';
	}
}

.release {
	display: grid;
	grid-template-columns: 4.5rem minmax(0, 1fr);
	column-gap: 16px;
	padding: 14px 0;
	border-top: 1px solid var(--rueso-rule);

	h3 {
		grid-row: span 2;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	time {
		font-size: 0.875rem;
		color: var(--fo-text2);
	}

	ul {
		margin: 4px 0 0;
		padding-left: 1.1em;
	}

	li + li {
		margin-top: 4px;
	}
}

.older {
	border-top: 1px solid var(--rueso-rule);

	summary {
		padding: 14px 0;
		color: var(--bs-link-color);
		cursor: pointer;

		&:hover {
			color: var(--bs-link-hover-color);
		}
	}
}

@media (max-width: 991.98px) {
	.layout {
		grid-template-columns: minmax(0, 1fr);
		gap: 0;
	}

	/* Everything in it is also in the hero, the FAQ or the install steps. */
	.sidebar {
		display: none;
	}
}

@media (max-width: 767.98px) {
	.hero-inner {
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		padding-block: 32px;
	}

	.hero-actions {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
	}

	.tabs-bar {
		/* The navbar is lower here: its logo shrinks to 40 px. */
		top: 57px;
	}

	.nav-tabs {
		gap: 20px;
	}
}
</style>
