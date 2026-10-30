import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import { trackCatalogFilter, type CatalogSection } from '@/analytics';

type NamedNode = { formId: string; nameRu: string | null };
type CategoryTree = NamedNode & { subcategories: NamedNode[] };

const FILTER_INPUT_ID = 'library-filter';

/**
 * Paging, the text filter and item breadcrumbs shared by the Atomic Shop and C.A.M.P. item lists.
 * The page and the filter live in the URL (?page=, ?filter=); `filter` follows the URL and the
 * #library-filter input is kept in sync with it.
 */
export const useCatalogList = (options: {
	section: CatalogSection;
	categories: () => CategoryTree[];
	totalPages: () => number;
}) => {
	const route = useRoute();
	const router = useRouter();

	const currentPage = computed(() => Number(route.query.page) || 1);
	const filter = ref((route.query.filter as string | undefined) || '');

	const filterInput = () => document.getElementById(FILTER_INPUT_ID) as HTMLInputElement | null;

	watch(
		() => route.query.filter,
		(newFilter) => {
			filter.value = (newFilter as string | undefined) || '';

			if (!import.meta.env.SSR) {
				const input = filterInput();
				if (input && document.activeElement !== input) {
					input.value = filter.value;
				}
			}
		}
	);

	onMounted(() => {
		const input = filterInput();
		if (input && filter.value) {
			input.value = filter.value;
		}
	});

	const changePage = (newPage: number) => {
		if (newPage > 0 && newPage <= options.totalPages()) {
			const newQuery: Record<string, any> = { ...route.query };

			if (newPage === 1) {
				delete newQuery.page;
			} else {
				newQuery.page = newPage;
			}

			router.push({ query: newQuery });
			if (!import.meta.env.SSR)
				window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const onChangeFilter = useDebounceFn((textFilter: string) => {
		const newQuery: Record<string, any> = { ...route.query };
		delete newQuery.page;

		if (!textFilter || textFilter.length < 3) {
			filter.value = '';
			delete newQuery.filter;
		} else {
			filter.value = textFilter;
			newQuery.filter = filter.value;
			trackCatalogFilter(options.section, filter.value);
		}

		router.push({ query: newQuery });
	}, 300);

	const categoriesIndex = computed(() => {
		const index: Record<string, { nameRu: string }> = {};
		options.categories().forEach(cat => {
			index[cat.formId] = { nameRu: cat.nameRu ?? '' };
			cat.subcategories.forEach(sub => {
				index[sub.formId] = { nameRu: sub.nameRu ?? '' };
			});
		});
		return index;
	});

	const getBreadcrumb = (item: { categoryFormId: string | null; subcategoryFormId: string | null }) => {
		const catName = categoriesIndex.value[item.categoryFormId || '']?.nameRu;
		const subName = categoriesIndex.value[item.subcategoryFormId || '']?.nameRu;
		if (catName && subName) return `${catName} → ${subName}`;
		return catName || '';
	};

	return { currentPage, filter, changePage, onChangeFilter, getBreadcrumb };
};
