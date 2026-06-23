export interface Book {
	id: number;
	titleEn: string;
	titleRu: string;
	textEn: string;
	textRu: string;
	icon: string;
	catId: number;
	slug: string;
	created: Patch;
	updated: Patch;
	group?: Book[];
	category?: Category;
}

export interface Patch {
	id: number;
	version: string;
	nameEn: string;
	nameRu: string;
	image: string;
	date: string;
	slug: string;
}

export interface Category {
	id: number;
	titleEn: string;
	titleRu: string;
	descEn: string;
	descRu: string;
	icon: string;
	slug: string;
	books?: Book[];
	pagination?: {
		page: number;
		pageSize: number;
		total_books: number;
		total_pages: number;
	}
}

export interface LastModified {
	lastModified: string;
}

export interface GlossaryGameCheckbox {
	id: string;
	name: string;
	icon: string;
	disabled?: boolean;
}

export interface GlossaryGameTag {
	[key: string]: string;
}

export interface GlossaryConfig {
	type: string;
	title: string;
	description: string;
	url: string;
	image: string;
	apiEndpoint: string;
	localStorageKey: string;
	defaultGames: string[];
	gameCheckboxes: GlossaryGameCheckbox[];
	gameTags?: GlossaryGameTag;
	dividerIndex: number;
}

export interface BreadcrumbItem {
	label: string;
	to?: string;
}

// F76 Atomic Shop

export interface AtomicShopCategory {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	slug: string | null;
	orderId: number;
}

export interface AtomicShopSubcategory {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	slug: string | null;
	parentCategoryFormId: string | null;
	parentCategoryEditorId: string | null;
	orderId: number;
}

export interface AtomicShopCategoryWithSubcategories extends AtomicShopCategory {
	subcategories: AtomicShopSubcategory[];
}

export interface CampUnlockedItem {
	formId: string;
	nameEn: string | null;
	nameRu: string | null;
	mainImage: string | null;
	slug: string | null;
	category: Pick<CampCategory, 'formId' | 'nameEn' | 'nameRu' | 'slug'> | null;
	subcategory: Pick<CampSubcategory, 'formId' | 'nameEn' | 'nameRu' | 'slug'> | null;
}

export interface AtomicShopItem {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	descriptionEn: string | null;
	descriptionRu: string | null;
	mainImage: string | null;
	screenshots: string | string[] | null;
	categoryFormId: string | null;
	subcategoryFormId: string | null;
	isPTS: boolean | null;
	supportItem: string | null;
	supportBundles: string | null;
	rarity: number | null;
	slug: string | null;
	orderByName: number;
	orderByFormId: number;
	campUnlockedItems: CampUnlockedItem[] | null;
}

export interface AtomicShopItemsResponse {
	category?: AtomicShopCategory;
	subcategory?: AtomicShopSubcategory;
	items: AtomicShopItem[];
	pagination?: {
		page: number;
		pageSize: number;
		total_books: number;
		total_pages: number;
	}
}

// F76 C.A.M.P.

export interface CampCategory {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	slug: string | null;
	orderId: number;
}

export interface CampSubcategory {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	slug: string | null;
	parentCategoryFormId: string | null;
	parentCategoryEditorId: string | null;
	orderId: number;
}

export interface CampCategoryWithSubcategories extends CampCategory {
	subcategories: CampSubcategory[];
}

export interface CampItem {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	descriptionEn: string | null;
	descriptionRu: string | null;
	mainImage: string | null;
	screenshots: string | string[] | null;
	categoryFormId: string | null;
	subcategoryFormId: string | null;
	isPTS: boolean | null;
	slug: string | null;
	orderByName: number;
	orderByFormId: number;
}

export interface CampItemsResponse {
	category?: CampCategory;
	subcategory?: CampSubcategory;
	items: CampItem[];
	pagination?: {
		page: number;
		pageSize: number;
		total_books: number;
		total_pages: number;
	}
}
