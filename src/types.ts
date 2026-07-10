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

export interface LearnConditionFoodOrPlan {
	type: 'food' | 'plan';
	formId: string;
	editorId: string | null;
	en: string | null;
	ru: string | null;
}

export interface LearnConditionChallenge {
	type: 'challenge';
	formId: string;
	editorId: string | null;
	en: string | null;
	ru: string | null;
	category: string | null;
}

export interface LearnConditionEntitlement {
	type: 'entitlement';
	formId: string;
	editorId: string | null;
}

export interface LearnConditionWorkshop {
	type: 'workshop';
}

export interface LearnConditionLevel {
	type: 'level';
	level: number | null;
}

export interface LearnConditionQuest {
	type: 'quest';
	en: string | null;
	ru: string | null;
}

export interface LearnConditionMisc {
	type: 'misc';
	formId: string;
	en: string | null;
	ru: string | null;
}

export type LearnConditionLeaf =
	| LearnConditionFoodOrPlan
	| LearnConditionChallenge
	| LearnConditionEntitlement
	| LearnConditionWorkshop
	| LearnConditionLevel
	| LearnConditionQuest
	| LearnConditionMisc;

export type LearnConditionOrMember = LearnConditionLeaf | LearnConditionGroup;
export type LearnConditionOrGroup = LearnConditionOrMember[];
export type LearnConditionGroup = LearnConditionOrGroup[];

export interface UnlockedByEntitlement {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	mainImage: string | null;
	screenshots: string[] | null;
	slug: string | null;
}

export interface ProducesAvailabilityNote {
	en: string | null;
	ru: string | null;
}

export interface ProducesItemNode {
	kind: 'item';
	formId: string;
	editorId: string | null;
	en: string | null;
	ru: string | null;
	type: string | null;
	count: number;
	probability: number;
	availabilityNote: ProducesAvailabilityNote | null;
}

export interface ProducesListNode {
	kind: 'list';
	formId: string;
	editorId: string | null;
	en: string | null;
	ru: string | null;
	probability: number;
	availabilityNote: ProducesAvailabilityNote | null;
	entries: ProducesNode[];
}

export type ProducesNode = ProducesItemNode | ProducesListNode;

export interface ProducesMode {
	en: string | null;
	ru: string | null;
	intervalHours: number | null;
	outcomes: ProducesNode[];
	modeEn?: string;
	modeRu?: string;
	cost?: number;
}

export interface DisplayAllowedEntry {
	formId: string;
	en: string | null;
	ru: string | null;
	maxAmount: number;
}

export interface DisplayExcludedEntry {
	formId: string;
	en: string | null;
	ru: string | null;
}

export interface DisplayInfo {
	allowed: DisplayAllowedEntry[];
	excluded: DisplayExcludedEntry[];
}

export interface RecipeComponent {
	formId: string;
	editorId: string | null;
	nameEn: string | null;
	nameRu: string | null;
	count: number;
}

export interface RecipeInfo {
	formId: string;
	editorId: string;
	nameEn: string | null;
	nameRu: string | null;
	descriptionEn: string | null;
	descriptionRu: string | null;
	components: RecipeComponent[];
}

export interface RecipeSiblingItem {
	formId: string;
	nameEn: string | null;
	nameRu: string | null;
	slug: string | null;
}

export interface CampItemWithRelations extends CampItem {
	category: Pick<CampCategory, 'formId' | 'nameEn' | 'nameRu' | 'slug'> | null;
	subcategory: Pick<CampSubcategory, 'formId' | 'nameEn' | 'nameRu' | 'slug'> | null;
	camp: boolean;
	shelter: boolean;
	workshop: boolean;
	campOwned: boolean;
	campMaxFormId: string | null;
	campMaxValue: number | null;
	workshopMaxFormId: string | null;
	workshopMaxValue: number | null;
	carryWeight: number | null;
	requiresPower: boolean;
	powerRequired: number;
	powerConnectable: boolean;
	powerGenerated: number;
	powerRadiated: number;
	learnConditions: LearnConditionGroup | null;
	produces: ProducesMode[] | null;
	display: DisplayInfo | null;
	unlockedByEntitlements: UnlockedByEntitlement[] | null;
	recipe: RecipeInfo | null;
	recipeItems: RecipeSiblingItem[];
}
