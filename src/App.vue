<script setup lang="ts">
import { onServerPrefetch } from 'vue';
import Navbar from '@/components/Navbar.vue';
import { RouterLink, RouterView } from 'vue-router';
import { useFetchUpdated } from '@/composables/useApi';

const { suspense: updatedSuspense } = useFetchUpdated();
onServerPrefetch(() => updatedSuspense());
</script>

<template>
	<Navbar />
	<Suspense>
		<RouterView />
	</Suspense>
</template>
