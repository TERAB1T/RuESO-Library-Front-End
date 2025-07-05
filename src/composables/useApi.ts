import { useQuery, keepPreviousData } from '@tanstack/vue-query';
import { prepareURL } from '@/utils';
import { useDebounceFn } from '@vueuse/core';

import type { Book, Category, Patch } from '@/types';
import type { UseQueryReturnType } from '@tanstack/vue-query'
import type { ComputedRef, Ref } from 'vue';

const DEBOUCE_DELAY = 200;
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

const fetchApi = async (url: string) => {
	const fetchParams: Record<string, string> = {};

	if (import.meta.env.SSR) {
		// @ts-ignore
		const isWindows = process.platform === 'win32';
		if (!isWindows) fetchParams['unix'] = '/tmp/apiRueso.sock';
	}

	// console.time(`fetching: ${url}`);
	const response = await fetch(url, fetchParams);
	// console.timeEnd(`fetching: ${url}`);

	if (!response.ok) {
		throw new Error(`Failed to: ${url}`);
	}
	return response.json();
}

// Fetches

export const useFetchBook = (bookId: ComputedRef<number>): UseQueryReturnType<Book, Error> => {
	return useQuery({
		queryKey: ['book', bookId],
		queryFn: () => fetchApi(prepareURL(`/api/library/books/${bookId.value}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export const useFetchBooks = (categoryId: ComputedRef<number>, patchVersion: ComputedRef<string>, currentPage: ComputedRef<number>, pageSize: number, filter: Ref<string>): UseQueryReturnType<Category, Error> => {
	return useQuery({
		queryKey: ['books', categoryId, patchVersion, { currentPage, pageSize, filter }],
		queryFn: () => {
			if (categoryId.value !== -1) return fetchApi(prepareURL(`/api/library/categories/${categoryId.value}?page=${currentPage.value}&page_size=${pageSize}&filter=${filter.value}`));
			else if (patchVersion.value !== '-1') return fetchApi(prepareURL(`/api/library/patches/${patchVersion.value}?page=${currentPage.value}&page_size=${pageSize}&filter=${filter.value}`));
			else return fetchApi(prepareURL(`/api/library/books?page=${currentPage.value}&page_size=${pageSize}&filter=${filter.value}`));
		},
		staleTime: DEFAULT_STALE_TIME,
		placeholderData: keepPreviousData
	});
}

export const useFetchCategories = (): UseQueryReturnType<Category[], Error> => {
	return useQuery({
		queryKey: ['categories'],
		queryFn: () => fetchApi(prepareURL('/api/library/categories')),
		staleTime: Infinity,
	});
}

export const useFetchPatches = (): UseQueryReturnType<Patch[], Error> => {
	return useQuery({
		queryKey: ['patches'],
		queryFn: () => fetchApi(prepareURL('/api/library/patches')),
		staleTime: Infinity,
	});
}

// Prefetches

export const usePrefetchBook = useDebounceFn((queryClient: any, bookId: number) => {
	queryClient.prefetchQuery({
		queryKey: ['book', bookId],
		queryFn: () => fetchApi(prepareURL(`/api/library/books/${bookId}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}, DEBOUCE_DELAY);

export const usePrefetchCategory = useDebounceFn((queryClient: any, categoryId: number | undefined) => {
	if (categoryId === undefined || categoryId === -1) return;

	queryClient.prefetchQuery({
		queryKey: ['books', categoryId, '-1', { currentPage: 1, pageSize: 50, filter: '' }],
		queryFn: () => fetchApi(prepareURL(`/api/library/categories/${categoryId}?page=1&page_size=50`)),
		staleTime: DEFAULT_STALE_TIME
	});
}, DEBOUCE_DELAY);

export const usePrefetchPatch = useDebounceFn((queryClient: any, patchVersion: string | undefined) => {
	if (patchVersion === undefined) return;

	queryClient.prefetchQuery({
		queryKey: ['books', -1, patchVersion, { currentPage: 1, pageSize: 50, filter: '' }],
		queryFn: () => fetchApi(prepareURL(`/api/library/patches/${patchVersion}?page=1&page_size=50`)),
		staleTime: DEFAULT_STALE_TIME
	});
}, DEBOUCE_DELAY);
