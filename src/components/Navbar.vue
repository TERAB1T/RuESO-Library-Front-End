<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import logo from '@/assets/img/logo.png';

const route = useRoute();

const isPathStartWith = (path: string) => {
    return route.path.startsWith(path);
};
</script>

<template>
    <nav class="navbar navbar-expand-sm bg-body-tertiary">
        <div class="container-xxl bd-gutter flex-wrap flex-lg-nowrap">
            <RouterLink class="navbar-brand" to="/">
                <img :src="logo" alt="Bootstrap" height="50">
            </RouterLink>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse flex-grow-1" id="navbarSupportedContent">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0 mx-3">
                    <li class="nav-item mx-2">
                        <RouterLink activeClass="active" class="nav-link py-2 px-0 px-lg-2" to="/" exact>Главная</RouterLink>
                    </li>
                    <li class="nav-item mx-2">
                        <RouterLink :class="`${isPathStartWith('/library') ? 'active' : ''} nav-link py-2 px-0 px-lg-2`" to="/library">Библиотека ESO</RouterLink>
                    </li>
                    <li class="nav-item mx-2">
                        <RouterLink :class="`${isPathStartWith('/glossary') ? 'active' : ''} nav-link py-2 px-0 px-lg-2`" to="/glossary">База текстов TES</RouterLink>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</template>
