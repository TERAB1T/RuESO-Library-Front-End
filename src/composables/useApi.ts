import { useQuery, keepPreviousData } from '@tanstack/vue-query';
import { prepareURL, getAtomicShopSortOrder, getCampSortOrder } from '@/utils';
import { useDebounceFn } from '@vueuse/core';

import type {
	Book,
	Category,
	Patch,
	PatchBooksExport,
	BooksResponse,
	LastModified,
	GlossaryUpdated,
	AtomicShopCategoryWithSubcategories,
	AtomicShopItem,
	AtomicShopItemsResponse,
	AcquisitionSourcesByType,
	AcquisitionTypeItemsResponse,
	AcquisitionSourceItemsResponse,
	CampCategoryWithSubcategories,
	CampItem,
	CampItemWithRelations,
	CampItemsResponse
} from '@/types';
import type { UseQueryReturnType } from '@tanstack/vue-query'
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

const DEBOUNCE_DELAY = 200;
const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const LIBRARY_PAGE_SIZE = 50;
const ATX_PAGE_SIZE = 18;

export class ApiError extends Error {
	status: number;

	constructor(url: string, status: number) {
		super(`Request to ${url} failed with status ${status}`);
		this.name = 'ApiError';
		this.status = status;
	}
}

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

	// A missing book or item is a valid answer, not a failure: views render their 404 page for null
	// data, and a thrown error would be retried and turn the SSR response into a 503.
	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new ApiError(url, response.status);
	}
	return response.json();
}

type MaybeRefBoolean = ComputedRef<boolean> | boolean | undefined;

const toBool = (value: MaybeRefBoolean): boolean => (typeof value === 'object' ? value.value : value) === true;

interface ListUrlParams {
	page: number;
	pageSize: number;
	filter?: string;
	sortOrder: string;
	isPTS: boolean;
	hasSupport?: boolean;
}

// The query string every Atomic Shop / C.A.M.P. list endpoint takes. `filter` is left out
// (not sent empty) when undefined, which is what the first-page prefetches rely on.
const listUrl = (path: string, { page, pageSize, filter, sortOrder, isPTS, hasSupport }: ListUrlParams): string => {
	let url = `${path}?page=${page}&page_size=${pageSize}`;
	if (filter !== undefined) url += `&filter=${encodeURIComponent(filter)}`;
	url += `&sort_order=${sortOrder}`;
	if (isPTS) url += `&is_pts=1`;
	if (hasSupport) url += `&has_support=1`;
	return url;
}

const atomicShopListPath = (categoryFormId: string, subcategoryFormId: string): string => {
	if (subcategoryFormId !== '-1') return `/api/f76/atomicshop/subcategories/${subcategoryFormId}`;
	if (categoryFormId !== '-1') return `/api/f76/atomicshop/categories/${categoryFormId}`;
	return '/api/f76/atomicshop/items';
}

const campListPath = (categoryFormId: string, subcategoryFormId: string): string => {
	if (subcategoryFormId !== '-1') return `/api/f76/camp/subcategories/${subcategoryFormId}`;
	if (categoryFormId !== '-1') return `/api/f76/camp/categories/${categoryFormId}`;
	return '/api/f76/camp/items';
}

// Each prefetch hook builds its own query key: it must match the key of the corresponding
// useFetch* hook exactly, or the prefetched page is never reused.
const prefetchFirstPage = (queryClient: any, queryKey: unknown[], path: string, sortOrder: string, isPTS: boolean, hasSupport?: boolean) => {
	queryClient.prefetchQuery({
		queryKey,
		queryFn: () => fetchApi(prepareURL(listUrl(path, { page: 1, pageSize: ATX_PAGE_SIZE, sortOrder, isPTS, hasSupport }))),
		staleTime: DEFAULT_STALE_TIME
	});
}

// Fetches

export const useFetchBook = (bookId: ComputedRef<number>): UseQueryReturnType<Book, Error> => {
	return useQuery({
		queryKey: ['book', bookId],
		queryFn: () => fetchApi(prepareURL(`/api/library/books/${bookId.value}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export const useFetchBooks = (categoryId: ComputedRef<number>, patchVersion: ComputedRef<string>, currentPage: ComputedRef<number>, pageSize: number, filter: Ref<string>): UseQueryReturnType<BooksResponse, Error> => {
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

export const useFetchPatchBooksExport = (patchVersion: ComputedRef<string>): UseQueryReturnType<PatchBooksExport, Error> => {
	return useQuery({
		queryKey: ['patches', 'export', patchVersion],
		queryFn: () => fetchApi(prepareURL(`/api/library/patches/${patchVersion.value}/export`)),
		enabled: computed(() => patchVersion.value !== '-1'),
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

export const useFetchAtomicShopItems = (categoryFormId: ComputedRef<string>, subcategoryFormId: ComputedRef<string>, currentPage: ComputedRef<number>, pageSize: number, filter: ComputedRef<string>, sortOrder: ComputedRef<string>, isPTS: ComputedRef<boolean>, hasSupport: ComputedRef<boolean>, enabled?: ComputedRef<boolean>): UseQueryReturnType<AtomicShopItemsResponse, Error> => {
	return useQuery({
		queryKey: ['f76_atx_items', categoryFormId, subcategoryFormId, { currentPage, pageSize, filter, sortOrder, isPTS, hasSupport }],
		queryFn: () => fetchApi(prepareURL(listUrl(atomicShopListPath(categoryFormId.value, subcategoryFormId.value), {
			page: currentPage.value, pageSize, filter: filter.value, sortOrder: sortOrder.value, isPTS: isPTS.value, hasSupport: hasSupport.value
		}))),
		staleTime: DEFAULT_STALE_TIME,
		placeholderData: keepPreviousData,
		enabled: enabled ?? computed(() => true)
	});
}

export const useFetchAtomicShopCategories = (): UseQueryReturnType<AtomicShopCategoryWithSubcategories[], Error> => {
	return useQuery({
		queryKey: ['f76_atx_categories'],
		queryFn: () => fetchApi(prepareURL('/api/f76/atomicshop/categories')),
		staleTime: Infinity,
	});
}

export const useFetchAtomicShopAcquisition = (): UseQueryReturnType<AcquisitionSourcesByType[], Error> => {
	return useQuery({
		queryKey: ['f76_atx_acquisition'],
		queryFn: () => fetchApi(prepareURL('/api/f76/atomicshop/acquisition')),
		staleTime: Infinity,
	});
}

export const useFetchAtomicShopAcquisitionTypeItems = (type: ComputedRef<string>, currentPage: ComputedRef<number>, pageSize: number, filter: ComputedRef<string>, sortOrder: ComputedRef<string>, isPTS: ComputedRef<boolean>, hasSupport: ComputedRef<boolean>, enabled?: ComputedRef<boolean>): UseQueryReturnType<AcquisitionTypeItemsResponse, Error> => {
	return useQuery({
		queryKey: ['f76_atx_acquisition_items', type, { currentPage, pageSize, filter, sortOrder, isPTS, hasSupport }],
		queryFn: () => fetchApi(prepareURL(listUrl(`/api/f76/atomicshop/acquisition/${type.value}`, {
			page: currentPage.value, pageSize, filter: filter.value, sortOrder: sortOrder.value, isPTS: isPTS.value, hasSupport: hasSupport.value
		}))),
		staleTime: DEFAULT_STALE_TIME,
		placeholderData: keepPreviousData,
		enabled: enabled ?? computed(() => true)
	});
}

export const useFetchAtomicShopAcquisitionSourceItems = (type: ComputedRef<string>, number: ComputedRef<number>, currentPage: ComputedRef<number>, pageSize: number, filter: ComputedRef<string>, sortOrder: ComputedRef<string>, isPTS: ComputedRef<boolean>, hasSupport: ComputedRef<boolean>, enabled?: ComputedRef<boolean>): UseQueryReturnType<AcquisitionSourceItemsResponse, Error> => {
	return useQuery({
		queryKey: ['f76_atx_acquisition_items', type, number, { currentPage, pageSize, filter, sortOrder, isPTS, hasSupport }],
		queryFn: () => fetchApi(prepareURL(listUrl(`/api/f76/atomicshop/acquisition/${type.value}/${number.value}`, {
			page: currentPage.value, pageSize, filter: filter.value, sortOrder: sortOrder.value, isPTS: isPTS.value, hasSupport: hasSupport.value
		}))),
		staleTime: DEFAULT_STALE_TIME,
		placeholderData: keepPreviousData,
		enabled: enabled ?? computed(() => true)
	});
}

export const useFetchCampItem = (itemFormId: ComputedRef<string>): UseQueryReturnType<CampItemWithRelations, Error> => {
	return useQuery({
		queryKey: ['f76_camp_item', itemFormId],
		queryFn: () => fetchApi(prepareURL(`/api/f76/camp/items/${itemFormId.value}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}

export const useFetchCampItems = (categoryFormId: ComputedRef<string>, subcategoryFormId: ComputedRef<string>, currentPage: ComputedRef<number>, pageSize: number, filter: ComputedRef<string>, sortOrder: ComputedRef<string>, isPTS: ComputedRef<boolean>): UseQueryReturnType<CampItemsResponse, Error> => {
	return useQuery({
		queryKey: ['f76_camp_items', categoryFormId, subcategoryFormId, { currentPage, pageSize, filter, sortOrder, isPTS }],
		queryFn: () => fetchApi(prepareURL(listUrl(campListPath(categoryFormId.value, subcategoryFormId.value), {
			page: currentPage.value, pageSize, filter: filter.value, sortOrder: sortOrder.value, isPTS: isPTS.value
		}))),
		staleTime: DEFAULT_STALE_TIME,
		placeholderData: keepPreviousData
	});
}

export const useFetchCampCategories = (): UseQueryReturnType<CampCategoryWithSubcategories[], Error> => {
	return useQuery({
		queryKey: ['f76_camp_categories'],
		queryFn: () => fetchApi(prepareURL('/api/f76/camp/categories')),
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

export const useFetchGlossaryUpdated = (type: string): UseQueryReturnType<GlossaryUpdated, Error> => {
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

export const useFetchCampUpdated = (): UseQueryReturnType<LastModified, Error> => {
	return useQuery({
		queryKey: ['f76_camp', 'updated'],
		queryFn: () => fetchApi(prepareURL('/api/f76/camp/updated')),
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

export const usePrefetchAtomicShopCategory = useDebounceFn((queryClient: any, categoryFormId: string | undefined, isPTS: MaybeRefBoolean = false, hasSupport: MaybeRefBoolean = false) => {
	if (categoryFormId === undefined || categoryFormId === '-1') return;
	const sortOrder = getAtomicShopSortOrder();

	prefetchFirstPage(queryClient,
		['f76_atx_items', categoryFormId, '-1', { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS, hasSupport }],
		atomicShopListPath(categoryFormId, '-1'), sortOrder, toBool(isPTS), toBool(hasSupport));
}, DEBOUNCE_DELAY);

export const usePrefetchAtomicShopSubcategory = useDebounceFn((queryClient: any, subcategoryFormId: string | undefined, isPTS: MaybeRefBoolean = false, hasSupport: MaybeRefBoolean = false) => {
	if (subcategoryFormId === undefined || subcategoryFormId === '-1') return;
	const sortOrder = getAtomicShopSortOrder();

	prefetchFirstPage(queryClient,
		['f76_atx_items', '-1', subcategoryFormId, { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS, hasSupport }],
		atomicShopListPath('-1', subcategoryFormId), sortOrder, toBool(isPTS), toBool(hasSupport));
}, DEBOUNCE_DELAY);

export const usePrefetchAtomicShopAcquisitionType = useDebounceFn((queryClient: any, type: string | undefined, isPTS: MaybeRefBoolean = false, hasSupport: MaybeRefBoolean = false) => {
	if (type === undefined) return;
	const sortOrder = getAtomicShopSortOrder();

	prefetchFirstPage(queryClient,
		['f76_atx_acquisition_items', type, { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS, hasSupport }],
		`/api/f76/atomicshop/acquisition/${type}`, sortOrder, toBool(isPTS), toBool(hasSupport));
}, DEBOUNCE_DELAY);

export const usePrefetchAtomicShopAcquisitionSource = useDebounceFn((queryClient: any, type: string | undefined, number: number | undefined, isPTS: MaybeRefBoolean = false, hasSupport: MaybeRefBoolean = false) => {
	if (type === undefined || number === undefined) return;
	const sortOrder = getAtomicShopSortOrder();

	prefetchFirstPage(queryClient,
		['f76_atx_acquisition_items', type, number, { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS, hasSupport }],
		`/api/f76/atomicshop/acquisition/${type}/${number}`, sortOrder, toBool(isPTS), toBool(hasSupport));
}, DEBOUNCE_DELAY);

export const usePrefetchCampItem = useDebounceFn((queryClient: any, itemFormId: string) => {
	queryClient.prefetchQuery({
		queryKey: ['f76_camp_item', itemFormId],
		queryFn: () => fetchApi(prepareURL(`/api/f76/camp/items/${itemFormId}`)),
		staleTime: DEFAULT_STALE_TIME,
	});
}, DEBOUNCE_DELAY);

export const usePrefetchCampCategory = useDebounceFn((queryClient: any, categoryFormId: string | undefined, isPTS: MaybeRefBoolean = false) => {
	if (categoryFormId === undefined || categoryFormId === '-1') return;
	const sortOrder = getCampSortOrder();

	prefetchFirstPage(queryClient,
		['f76_camp_items', categoryFormId, '-1', { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS }],
		campListPath(categoryFormId, '-1'), sortOrder, toBool(isPTS));
}, DEBOUNCE_DELAY);

export const usePrefetchCampSubcategory = useDebounceFn((queryClient: any, subcategoryFormId: string | undefined, isPTS: MaybeRefBoolean = false) => {
	if (subcategoryFormId === undefined || subcategoryFormId === '-1') return;
	const sortOrder = getCampSortOrder();

	prefetchFirstPage(queryClient,
		['f76_camp_items', '-1', subcategoryFormId, { currentPage: 1, pageSize: ATX_PAGE_SIZE, filter: '', sortOrder, isPTS }],
		campListPath('-1', subcategoryFormId), sortOrder, toBool(isPTS));
}, DEBOUNCE_DELAY);
