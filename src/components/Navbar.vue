<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import logo from '@/assets/img/logo.png';

const route = useRoute();
const isPathStartWith = (path: string) => route.path.startsWith(path);

onMounted(async () => {
	const { Collapse } = await import("bootstrap");
	const { Dropdown } = await import("bootstrap");

	const collapseElement = document.querySelector('.navbar-collapse');
	const bsCollapse = collapseElement ? new Collapse(collapseElement, { toggle: false }) : null;

	document.querySelectorAll('.nav-link:not(.dropdown-toggle)').forEach((link) => {
		link.addEventListener('click', () => {
			if (window.innerWidth <= 768) bsCollapse?.hide();
		});
	});

	document.querySelectorAll('.dropdown-menu .nav-link').forEach((link) => {
		link.addEventListener('click', () => {
			const parentToggle = link.closest('.dropdown')?.querySelector('.dropdown-toggle');
			if (parentToggle) {
				const bsDropdown = Dropdown.getInstance(parentToggle);
				bsDropdown?.hide();
			}
		});
	});
});
</script>

<template>
	<nav class="navbar navbar-expand-md bg-body-tertiary">
		<div class="container-xxl bd-gutter flex-wrap flex-lg-nowrap">
			<RouterLink class="navbar-brand" to="/">
				<img :src="logo" alt="RuESO" height="50">
			</RouterLink>

			<button class="navbar-toggler ms-auto order-1" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
				<span class="navbar-toggler-icon"></span>
			</button>

			<div class="collapse navbar-collapse order-2 order-md-1" id="navbarSupportedContent" style="flex-grow: initial;">
				<ul class="navbar-nav me-auto mb-0 mx-3">
					<li class="nav-item mx-2">
						<RouterLink activeClass="active" class="nav-link py-2 px-2" to="/" exact>Главная</RouterLink>
					</li>
					<li class="nav-item mx-2 dropdown">
						<a :class="`${isPathStartWith('/glossary-tes') || isPathStartWith('/library') ? 'active' : ''} nav-link py-2 px-2 dropdown-toggle`" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
							The Elder Scrolls
						</a>
						<ul class="dropdown-menu mx-2">
							<li>
								<RouterLink :class="`${isPathStartWith('/library') ? 'active' : ''} nav-link py-2 px-3 dropdown-item`" to="/library/eso">Библиотека ESO</RouterLink>
							</li>
							<li>
								<RouterLink :class="`${isPathStartWith('/glossary-tes') ? 'active' : ''} nav-link py-2 px-3 dropdown-item`" to="/glossary-tes">База текстов TES</RouterLink>
							</li>
						</ul>
					</li>
					<li class="nav-item mx-2 dropdown">
						<a :class="`${isPathStartWith('/glossary-fallout') || isPathStartWith('/f76-atomic-shop')  ? 'active' : ''} nav-link py-2 px-2 dropdown-toggle`" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
							Fallout
						</a>
						<ul class="dropdown-menu mx-2">
							<li>
								<RouterLink :class="`${isPathStartWith('/glossary-fallout') ? 'active' : ''} nav-link py-2 px-3 dropdown-item`" to="/glossary-fallout">База текстов Fallout</RouterLink>
							</li>
							<li>
								<RouterLink :class="`${isPathStartWith('/f76-atomic-shop') ? 'active' : ''} nav-link py-2 px-3 dropdown-item`" to="/f76-atomic-shop">Атомная лавка Fallout 76</RouterLink>
							</li>
						</ul>
					</li>
				</ul>
			</div>

			<div id="glossary-search-nav" class="d-flex flex-grow-1 justify-content-end order-md-2" style="flex: 1;"></div>
		</div>
	</nav>
</template>
