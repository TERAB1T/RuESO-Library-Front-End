import { useQuery, keepPreviousData } from '@tanstack/vue-query';
import { prepareURL, getAtomicShopSortOrder } from '@/utils';
import { useDebounceFn } from '@vueuse/core';

import type {
	Book,
	Category,
	Patch,
	LastModified,
	AtomicShopCategoryWithSubcategories,
	AtomicShopItem,
	AtomicShopItemsResponse
} from '@/types';
import type { UseQueryReturnType } from '@tanstack/vue-query'
import type { ComputedRef, Ref } from 'vue';

const DEBOUNCE_DELAY = 200;
const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const LIBRARY_PAGE_SIZE = 50;
const ATX_PAGE_SIZE = 15;

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
			if (categoryId.value !== -1) return fetchApi(prepareURL(`/api/library/categories/${categoryId.value}?page=${currentPage.value}&page_size=${pageSize}&filter=${encodeURIComponent(filter.value)}`));
			else if (patchVersion.value !== '-1') return fetchApi(prepareURL(`/api/library/patches/${patchVersion.value}?page=${currentPage.value}&page_size=${pageSize}&filter=${encodeURIComponent(filter.value)}`));
			else return fetchApi(prepareURL(`/api/library/books?page=${currentPage.value}&page_size=${pageSize}&filter=${encodeURIComponent(filter.value)}`));
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


export const useFetchAtomicShopItem = (itemFormId: ComputedRef<string>): UseQueryReturnType<AtomicShopItem, Error> => {
	return useQuery({
		queryKey: ['f76_atx_item', itemFormId],
		queryFn: () => fetchApi(prepareURL(`/api/f76/atomicshop/items/${itemFormId.value}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export const useFetchAtomicShopItems = (categoryFormId: ComputedRef<string>, subcategoryFormId: ComputedRef<string>, currentPage: ComputedRef<number>, pageSize: number, filter: ComputedRef<string>, sortOrder: ComputedRef<string>, isPTS: ComputedRef<boolean>, hasSupport: ComputedRef<boolean>): UseQueryReturnType<AtomicShopItemsResponse, Error> => {
	return useQuery({
		queryKey: ['f76_atx_items', categoryFormId, subcategoryFormId, { currentPage, pageSize, filter, sortOrder, isPTS, hasSupport }],
		queryFn: () => {
			let url = '';

			if (subcategoryFormId.value !== '-1') url = `/api/f76/atomicshop/subcategories/${subcategoryFormId.value}?page=${currentPage.value}&page_size=${pageSize}&filter=${encodeURIComponent(filter.value)}&sort_order=${sortOrder.value}`;
			else if (categoryFormId.value !== '-1') url = `/api/f76/atomicshop/categories/${categoryFormId.value}?page=${currentPage.value}&page_size=${pageSize}&filter=${encodeURIComponent(filter.value)}&sort_order=${sortOrder.value}`;
			else url = `/api/f76/atomicshop/items?page=${currentPage.value}&page_size=${pageSize}&filter=${encodeURIComponent(filter.value)}&sort_order=${sortOrder.value}`;

			if (isPTS.value === true) url += `&is_pts=1`;
			if (hasSupport.value === true) url += `&has_support=1`;

			return fetchApi(prepareURL(url));
		},
		staleTime: DEFAULT_STALE_TIME,
		placeholderData: keepPreviousData
	});
}

export const useFetchAtomicShopCategories = (): UseQueryReturnType<AtomicShopCategoryWithSubcategories[], Error> => {
	return useQuery({
		queryKey: ['f76_atx_categories'],
		queryFn: () => fetchApi(prepareURL('/api/f76/atomicshop/categories')),
		staleTime: Infinity,
	});
}

// Updates

export const useFetchLibraryUpdated = (): UseQueryReturnType<LastModified, Error> => {
	return useQuery({
		queryKey: ['library', 'updated'],
		queryFn: () => fetchApi(prepareURL('/api/library/updated')),
		staleTime: Infinity,
	});
}

export const useFetchGlossaryUpdated = (type: string): UseQueryReturnType<LastModified, Error> => {
	return useQuery({
		queryKey: ['glossary', 'updated', type],
		queryFn: () => fetchApi(prepareURL(`/api/glossary/${type}/updated`)),
		staleTime: Infinity,
	});
}

export const useFetchAtomicShopUpdated = (): UseQueryReturnType<LastModified, Error> => {
	return useQuery({
		queryKey: ['f76_atx', 'updated'],
		queryFn: () => fetchApi(prepareURL('/api/f76/atomicshop/updated')),
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
}, DEBOUNCE_DELAY);

export const usePrefetchCategory = useDebounceFn((queryClient: any, categoryId: number | undefined) => {
	if (categoryId === undefined || categoryId === -1) return;

	queryClient.prefetchQuery({
		queryKey: ['books', categoryId, '-1', { currentPage: 1, pageSize: LIBRARY_PAGE_SIZE, filter: '' }],
		queryFn: () => fetchApi(prepareURL(`/api/library/categories/${categoryId}?page=1&page_size=${LIBRARY_PAGE_SIZE}`)),
		staleTime: DEFAULT_STALE_TIME
	});
}, DEBOUNCE_DELAY);

export const usePrefetchPatch = useDebounceFn((queryClient: any, patchVersion: string | undefined) => {
	if (patchVersion === undefined) return;

	queryClient.prefetchQuery({
		queryKey: ['books', -1, patchVersion, { currentPage: 1, pageSize: LIBRARY_PAGE_SIZE, filter: '' }],
		queryFn: () => fetchApi(prepareURL(`/api/library/patches/${patchVersion}?page=1&page_size=${LIBRARY_PAGE_SIZE}`)),
		staleTime: DEFAULT_STALE_TIME
	});
}, DEBOUNCE_DELAY);


export const usePrefetchAtomicShopItem = useDebounceFn((queryClient: any, itemFormId: string) => {
	queryClient.prefetchQuery({
		queryKey: ['f76_atx_item', itemFormId],
		queryFn: () => fetchApi(prepareURL(`/api/f76/atomicshop/items/${itemFormId}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}, DEBOUNCE_DELAY);

export const usePrefetchAtomicShopCategory = useDebounceFn((queryClient: any, categoryFormId: string | undefined, isPTS?: ComputedRef<boolean> | boolean | undefined, hasSupport?: ComputedRef<boolean> | boolean | undefined) => {
	if (categoryFormId === undefined || categoryFormId === '-1') return;
	const sortOrder = getAtomicShopSortOrder();

	if (isPTS === undefined) isPTS = false;
	if (hasSupport === undefined) hasSupport = false;

	const isPTSValue = typeof isPTS === 'object' ? isPTS.value : isPTS;
	const hasSupportValue = typeof hasSupport === 'object' ? hasSupport.value : hasSupport;

	queryClient.prefetchQuery({
		queryKey: ['f76_atx_items', categoryFormId, '-1', { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS, hasSupport }],
		queryFn: () => {
			let url = `/api/f76/atomicshop/categories/${categoryFormId}?page=1&page_size=${ATX_PAGE_SIZE}&sort_order=${sortOrder}`;

			if (isPTSValue === true) url += `&is_pts=1`;
			if (hasSupportValue === true) url += `&has_support=1`;

			return fetchApi(prepareURL(url));
		},
		staleTime: DEFAULT_STALE_TIME
	});
}, DEBOUNCE_DELAY);

export const usePrefetchAtomicShopSubcategory = useDebounceFn((queryClient: any, subcategoryFormId: string | undefined, isPTS?: ComputedRef<boolean> | boolean | undefined, hasSupport?: ComputedRef<boolean> | boolean | undefined) => {
	if (subcategoryFormId === undefined || subcategoryFormId === '-1') return;
	const sortOrder = getAtomicShopSortOrder();

	if (isPTS === undefined) isPTS = false;
	if (hasSupport === undefined) hasSupport = false;

	const isPTSValue = typeof isPTS === 'object' ? isPTS.value : isPTS;
	const hasSupportValue = typeof hasSupport === 'object' ? hasSupport.value : hasSupport;

	queryClient.prefetchQuery({
		queryKey: ['f76_atx_items', '-1', subcategoryFormId, { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS, hasSupport }],
		queryFn: () => {
			let url = `/api/f76/atomicshop/subcategories/${subcategoryFormId}?page=1&page_size=${ATX_PAGE_SIZE}&sort_order=${sortOrder}`;

			if (isPTSValue === true) url += `&is_pts=1`;
			if (hasSupportValue === true) url += `&has_support=1`;

			return fetchApi(prepareURL(url));
		},
		staleTime: DEFAULT_STALE_TIME
	});
}, DEBOUNCE_DELAY);
