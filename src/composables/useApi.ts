import { useQuery, keepPreviousData } from '@tanstack/vue-query';
import { prepareURL } from '@/utils';
import type { Book, Category } from '@/types';
import type { UseQueryReturnType } from '@tanstack/vue-query'
import type { ComputedRef } from 'vue';

const fetchApi = async (url: string) => {
	console.time(`fetching: ${url}`);
	const response = await fetch(url);
	console.timeEnd(`fetching: ${url}`);
	if (!response.ok) {
		throw new Error(`Failed to: ${url}`);
	}
	return response.json();
}

export const useFetchBook = (bookId: number): UseQueryReturnType<Book, Error> => {
	return useQuery({
		queryKey: ['book', bookId],
		queryFn: () => fetchApi(prepareURL(`/api/library/books/${bookId}`)),
		staleTime: 5 * 60 * 1000,
	});
}

export const useFetchBooks = (categoryId: ComputedRef<number>, currentPage: ComputedRef<number>, pageSize: number): UseQueryReturnType<Category, Error> => {
	return useQuery({
		queryKey: ['books', categoryId, { currentPage, pageSize }],
		queryFn: () => {
			if (categoryId.value === -1) return fetchApi(prepareURL(`/api/library/books?page=${currentPage.value}&page_size=${pageSize}`));
			else return fetchApi(prepareURL(`/api/library/categories/${categoryId.value}?page=${currentPage.value}&page_size=${pageSize}`));
		},
		staleTime: 5 * 60 * 1000,
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
