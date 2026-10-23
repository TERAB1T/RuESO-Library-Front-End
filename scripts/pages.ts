/** Pages shared by the check scripts. */

/** Static pages plus one existing item, book, category… of every kind, picked through the API. */
export async function buildPageList(api: string): Promise<string[]> {
	const json = async (path: string) => (await fetch(api + path)).json() as Promise<any>;

	const campItem = (await json("/f76/camp/items?page=1&page_size=1")).items[0];
	const atxItem = (await json("/f76/atomicshop/items?page=1&page_size=1")).items[0];
	const campCategories = await json("/f76/camp/categories");
	const atxCategories = await json("/f76/atomicshop/categories");
	const acquisition = await json("/f76/atomicshop/acquisition");
	const book = (await json("/library/books?page=1&page_size=1")).books[0];
	const libraryCategory = (await json("/library/categories"))[0];
	const patch = (await json("/library/patches"))[0];

	const campCategory = campCategories.find((c: any) => c.subcategories.length);
	const atxCategory = atxCategories.find((c: any) => c.subcategories.length);
	const season = acquisition.find((g: any) => g.type === "season")?.sources.at(-1);

	return [
		"/", "/partners", "/glossary-tes", "/glossary-fallout",
		"/library/eso", `/library/eso/category/${libraryCategory.id}-${libraryCategory.slug}`,
		`/library/eso/patch/${patch.version}-${patch.slug}`, `/library/eso/${book.id}-${book.slug}`,
		"/f76-camp", "/f76-camp?isPTS=1&filter=chair", `/f76-camp/${campItem.formId}-${campItem.slug}`,
		`/f76-camp/category/${campCategory.formId}-${campCategory.slug}`,
		`/f76-camp/subcategory/${campCategory.subcategories[0].formId}-${campCategory.subcategories[0].slug}?page=2`,
		"/f76-atomic-shop", "/f76-atomic-shop?hasSupport=1&isPTS=1", `/f76-atomic-shop/${atxItem.formId}-${atxItem.slug}`,
		`/f76-atomic-shop/category/${atxCategory.formId}-${atxCategory.slug}`,
		`/f76-atomic-shop/subcategory/${atxCategory.subcategories[0].formId}-${atxCategory.subcategories[0].slug}`,
		"/f76-atomic-shop/season", ...(season ? [`/f76-atomic-shop/season/${season.number}-${season.slug}`] : []),
	];
}

export const MUST_404 = [
	"/nonexistent", "/library/eso/999999-x", "/library/eso/category/99999-x", "/library/eso/patch/99.9-x",
	"/f76-camp/deadbeef-x", "/f76-camp/category/deadbeef-x", "/f76-atomic-shop/deadbeef-x", "/f76-atomic-shop/season/999-x",
];
