import { useQuery, keepPreviousData } from '@tanstack/vue-query';
import { prepareURL } from '@/utils';
import { useDebounceFn } from '@vueuse/core';

import type { Book, Category } from '@/types';
import type { UseQueryReturnType } from '@tanstack/vue-query'
import type { ComputedRef } from 'vue';

const DEBOUCE_DELAY = 200;
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

const fetchApi = async (url: string) => {
	const fetchParams: Record<string, string> = {};

	if (import.meta.env.SSR) {
		// @ts-ignore
		const isWindows = process.platform === 'win32';
		if (!isWindows) fetchParams['unix'] = '/tmp/apiRueso.sock';
	}

	console.time(`fetching: ${url}`);
	const response = await fetch(url, fetchParams);
	console.timeEnd(`fetching: ${url}`);

	if (!response.ok) {
		throw new Error(`Failed to: ${url}`);
	}
	return response.json();
}

// Fetches

export const useFetchBook = (bookId: number): UseQueryReturnType<Book, Error> => {
	return useQuery({
		queryKey: ['book', bookId],
		queryFn: () => fetchApi(prepareURL(`/api/library/books/${bookId}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export const useFetchBooks = (categoryId: ComputedRef<number>, currentPage: ComputedRef<number>, pageSize: number): UseQueryReturnType<Category, Error> => {
	return useQuery({
		queryKey: ['books', categoryId, { currentPage, pageSize }],
		queryFn: () => {
			if (categoryId.value === -1) return fetchApi(prepareURL(`/api/library/books?page=${currentPage.value}&page_size=${pageSize}`));
			else return fetchApi(prepareURL(`/api/library/categories/${categoryId.value}?page=${currentPage.value}&page_size=${pageSize}`));
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

// Prefetches

export const usePrefetchBook = useDebounceFn((queryClient: any, bookId: number) => {
	queryClient.prefetchQuery({
		queryKey: ['book', bookId],
		queryFn: () => fetchApi(prepareURL(`/api/library/books/${bookId}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}, DEBOUCE_DELAY);

export const usePrefetchCategory = useDebounceFn((queryClient: any, categoryId: number) => {
	queryClient.prefetchQuery({
		queryKey: ['books', categoryId, { currentPage: 1, pageSize: 100 }],
		queryFn: () => fetchApi(prepareURL(`/api/library/categories/${categoryId}?page=1&page_size=100`)),
		staleTime: DEFAULT_STALE_TIME
	});
}, DEBOUCE_DELAY);
