import { computed, type Ref, type ComputedRef } from 'vue';
import { joinWithAnd } from '@/utils';

import type { AtomicShopItem, AtomicShopCategoryWithSubcategories, BreadcrumbItem } from '@/types';

interface ParsedItem {
	name: string;
	price: string;
}

interface UseSupportTextReturn {
	generateSupportText: ComputedRef<string>;
	generateSupportListText: ComputedRef<string>;
	generateSupportUrlText: ComputedRef<string>;
}

const parseItemWithPrice = (itemString: string): ParsedItem => {
	const [name, price] = itemString.split('@').map(s => s.trim());
	return { name: name || '', price: price || '' };
};

const formatItem = (parsed: ParsedItem, withPrice: boolean = true): string => {
	const priceHtml = parsed.price && withPrice
		? ` (<span class="support-item-price">${parsed.price}</span>)`
		: '';
	return `<span class="support-item-name">${parsed.name}</span>${priceHtml}`;
};

const parseBundles = (bundlesString: string): ParsedItem[] => {
	return bundlesString.split('|').map(parseItemWithPrice);
};

const formatBundles = (bundles: ParsedItem[], withPrice: boolean = true): string[] => {
	return bundles.map(bundle => formatItem(bundle, withPrice));
};

export function useSupportText(item: Ref<AtomicShopItem>): UseSupportTextReturn {
	const generateSupportText = computed<string>(() => {
		const hasItem = !!item.value?.supportItem;
		const hasBundles = !!item.value?.supportBundles;

		if (!hasItem && !hasBundles) return '';

		const baseText = 'Этот предмет можно приобрести за атомы, написав в службу поддержки Bethesda.';

		if (hasItem && !hasBundles) {
			const parsed = parseItemWithPrice(item.value.supportItem!);
			return `${baseText} Он доступен для покупки напрямую под названием ${formatItem(parsed)}.`;
		}

		const bundles = parseBundles(item.value.supportBundles!);
		const formattedBundles = formatBundles(bundles);
		const bundleWord = bundles.length === 1 ? 'набора' : 'наборов';

		if (!hasItem && hasBundles) {
			return `${baseText} Он доступен в составе ${bundleWord} ${joinWithAnd(formattedBundles, ' и ')}.`;
		}

		const parsed = parseItemWithPrice(item.value.supportItem!);
		return `${baseText} Он доступен для покупки напрямую под названием ${formatItem(parsed)}, а также в составе ${bundleWord} ${joinWithAnd(formattedBundles, ' и ')}.`;
	});

	const generateSupportListText = computed<string>(() => {
		const hasItem = !!item.value?.supportItem;
		const hasBundles = !!item.value?.supportBundles;

		if (!hasItem && !hasBundles) return '';

		if (hasItem && !hasBundles) {
			const parsed = parseItemWithPrice(item.value.supportItem!);
			return `В поле «Список предметов» вставьте название предмета: ${formatItem(parsed, false)}.`;
		}

		const bundles = parseBundles(item.value.supportBundles!);
		const formattedBundles = formatBundles(bundles, false);

		if (!hasItem && hasBundles) {
			return `В поле «Список предметов» вставьте название набора: ${joinWithAnd(formattedBundles, ' или ')}.`;
		}

		const parsed = parseItemWithPrice(item.value.supportItem!);
		return `В поле «Список предметов» вставьте название предмета: ${formatItem(parsed, false)}.<ul><li>Если вы хотите приобрести его в составе набора, вставьте название набора: ${joinWithAnd(formattedBundles, ' или ')}.</li></ul>`;
	});

	const generateSupportUrlText = computed<string>(() => {
		const hasItem = !!item.value?.supportItem;
		const hasBundles = !!item.value?.supportBundles;

		if (!hasItem && !hasBundles) return '';

		if (hasItem && !hasBundles) {
			return 'Да — напрямую';
		}

		const bundleCount = item.value.supportBundles!.split('|').length;
		const bundleWord = bundleCount === 1 ? 'наборе' : 'наборах';

		if (!hasItem && hasBundles) {
			return `Да — в ${bundleWord}`;
		}

		return `Да — напрямую и в ${bundleWord}`;
	});

	return {
		generateSupportText,
		generateSupportListText,
		generateSupportUrlText
	};
}
