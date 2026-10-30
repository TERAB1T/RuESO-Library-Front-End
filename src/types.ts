export type LibraryMobileTab = 'books' | 'categories' | 'patches';
export type AtomicShopMobileTab = 'items' | 'categories' | 'acquisition';
export type CampMobileTab = 'items' | 'categories';

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
	// Antiquities and antiquity sets only
	quality?: number | null;
	difficulty?: number | null;
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

export interface BooksResponse {
	books: Book[];
	categories?: Pick<Category, 'id' | 'titleRu'>[];
	pagination?: {
		page: number;
		page_size: number;
		total_books: number;
		total_pages: number;
	}
}

export interface LastModified {
	lastModified: string;
}

export interface PatchBooksExport extends Patch {
	books: Book[];
	categories: Pick<Category, 'id' | 'titleRu'>[];
}

export type GlossaryServer = 'live' | 'pts';

export interface GlossaryGameCheckbox {
	id: string;
	name: string;
	icon: string;
	disabled?: boolean;
	label?: string;
	server?: GlossaryServer;
	legacyId?: string;
}

export interface GlossaryServerInfo {
	lastModified: string;
	version: string | null;
}

export type GlossaryUpdated = Record<GlossaryServer, GlossaryServerInfo | null>;

export interface Updated {
	library: LastModified;
	esoCrownCrates: LastModified;
	f76AtomicShop: LastModified;
	f76Camp: LastModified;
	f76Map: LastModified;
	glossary: Record<string, GlossaryUpdated>;
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

export interface ItemGallerySlide {
	href: string;
	src: string;
	srcset?: string;
	alt: string;
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

export interface AcquisitionSource {
	id: number;
	slug: string;
	type: string;
	number: number;
	nameEn: string | null;
	nameRu: string | null;
	startDate: number | null;
	endDate: number | null;
}

export interface AcquisitionSourcesByType {
	type: string;
	sources: AcquisitionSource[];
}

export interface AcquisitionTypeItemsResponse {
	type: string;
	items: AtomicShopItem[];
	pagination?: {
		page: number;
		pageSize: number;
		total_books: number;
		total_pages: number;
	}
}

export interface AcquisitionSourceItemsResponse {
	acquisitionSource: AcquisitionSource;
	items: AtomicShopItem[];
	categories: Pick<AtomicShopCategory, 'formId' | 'nameRu'>[];
	pagination?: {
		page: number;
		pageSize: number;
		total_books: number;
		total_pages: number;
	}
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
	video: string | null;
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
	acquisitionSource?: Pick<AcquisitionSource, 'type' | 'number' | 'nameRu' | 'slug'> | null;
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

export interface CampShopInfo {
	descriptionEn: string | null;
	descriptionRu: string | null;
	screenshots: string[] | null;
	isSet: boolean;
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

export type BuffTrigger = 'whileUsing' | 'afterDelay' | 'onActivate' | 'onPassThrough' | 'onDrink' | 'fromAlly';
export type BuffCondition = 'noAllyNearby' | 'infatuatedAllyNearby' | 'romanticAllyNearby';
export type BuffPlayerType = 'human' | 'ghoul';

export interface LocalizedName {
	en: string | null;
	ru: string | null;
}

export interface BuffRequiredPerk {
	formId: string;
	name: LocalizedName;
}

export interface BuffEffect {
	mgefFormId: string;
	description: LocalizedName;
	magnitude: number;
	duration: number;
	actorValueFormId: string | null;
	requiresPerk: BuffRequiredPerk | null;
	playerType: BuffPlayerType | null;
}

export interface Buff {
	spellFormId: string;
	name: LocalizedName;
	trigger: BuffTrigger;
	delaySeconds: number | null;
	cooldownSeconds: number | null;
	condition: BuffCondition | null;
	diseaseRisk: boolean;
	effects: BuffEffect[];
}

export interface ArcadeGame {
	name: LocalizedName;
	description: LocalizedName;
	pointsDescription: LocalizedName;
}

export interface WaterSource {
	collectItem: Omit<CampGivenItem, 'count'>;
	collectRadiationDamage: number | null;
}

export interface AllyVendorVisitor {
	npcFormId: string;
	name: LocalizedName;
	spawnChance: number;
	afterQuests: number | null;
	beforeAnyQuest: boolean;
	questsOf: { npcFormId: string; name: LocalizedName } | null;
	byStory: boolean;
}

export interface AllyStockItem {
	kind: 'item';
	formId: string;
	editorId: string | null;
	en: string | null;
	ru: string | null;
	type: string | null;
	value: number | null;
	probability: number;
	eventOnly: boolean;
	byRegion: boolean;
}

export interface AllyStockCategory {
	kind: 'category';
	en: string | null;
	ru: string | null;
	count: number;
}

export type AllyStockRow = AllyStockItem | AllyStockCategory;

export interface Ally {
	npcFormId: string;
	editorId: string;
	name: LocalizedName;
	female: boolean;
	isVendor: boolean;
	stock: AllyStockRow[] | null;
	hasRomance: boolean;
	vendorVisitors: AllyVendorVisitor[];
	buffs: AllyBuffs | null;
}

export type AllyBuffMode = 'single' | 'random' | 'timeOfDay' | 'payment' | 'services';

export interface AllyBuffPayment {
	formId: string;
	en: string | null;
	ru: string | null;
}

export interface AllyBuffOption {
	buff: Buff;
	timeOfDay: 'day' | 'night' | null;
	payment: AllyBuffPayment[] | null;
}

export interface AllyBuffs {
	mode: AllyBuffMode;
	options: AllyBuffOption[];
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

export interface CampStorageInfo {
	group: string;
	lists: { formId: string; en: string | null; ru: string | null }[];
	limit: number | null;
	items?: { formId: string; editorId: string | null; en: string | null; ru: string | null; type: string | null }[];
	// percent of a core per minute
	chargeRate?: number;
}

export interface CampGivenItem {
	formId: string;
	editorId: string | null;
	en: string | null;
	ru: string | null;
	type: string | null;
	count: number;
}

export interface CampSharedLimitCategory extends Pick<CampCategory, 'formId' | 'nameEn' | 'nameRu' | 'slug'> {
	count: number;
}

export interface CampSharedLimit {
	total: number;
	items: RecipeSiblingItem[];
	categories: CampSharedLimitCategory[];
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
	buffs: Buff[] | null;
	arcadeGame: ArcadeGame | null;
	waterSource: WaterSource | null;
	ally: Ally | null;
	unlockedByEntitlements: UnlockedByEntitlement[] | null;
	shopInfo: CampShopInfo | null;
	sharedLimit: CampSharedLimit | null;
	storage: CampStorageInfo | null;
	givesItems: CampGivenItem[] | null;
	spoilRate: number | null;
	surface: 'dirt' | 'water' | null;
	weather: CampWeatherInfo | null;
	recipe: RecipeInfo | null;
	recipeItems: RecipeSiblingItem[];
}

export interface CampWeatherInfo {
	type: 'radiation' | 'rain' | 'sandstorm' | 'other';
	intenseEffects: boolean;
}

export type CampSubItemEffectKind ='hunger' | 'thirst' | 'rads' | 'disease' | 'feral';
export type CampSubItemEffectCondition = 'ghoul' | 'notGhoul' | 'night' | 'ally' | 'team' | 'drunk';

export interface CampSubItemEffect {
	kind: CampSubItemEffectKind | null;
	mgefFormId: string;
	description: LocalizedName | null;
	magnitude: number;
	duration: number;
	requiresPerk: { formId: string; name: LocalizedName | null; rank: number | null } | null;
	condition: CampSubItemEffectCondition | null;
}

export interface CampSubItemDetails {
	components?: { formId: string; name: LocalizedName | null; count: number }[];
	consumable?: {
		effects: CampSubItemEffect[];
		spoilMinutes: number | null;
		ferments: boolean;
		spoilsInto: { formId: string; name: LocalizedName | null } | null;
		addiction: { name: LocalizedName | null; chance: number } | null;
	};
	ammo?: { formId: string; name: LocalizedName | null };
}

export interface CampSubItem {
	formId: string;
	editorId: string | null;
	formType: string;
	type: string | null;
	nameEn: string | null;
	nameRu: string | null;
	descriptionEn: string | null;
	descriptionRu: string | null;
	weight: number | null;
	value: number | null;
	details: CampSubItemDetails | null;
	usedIn: RecipeSiblingItem[];
}

// ESO crown crates

export type CrownCrateSection = 'seasonal' | 'special';
export type CrownCrateSaleSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CrownCrateListItem {
	id: number;
	slug: string;
	nameEn: string;
	nameRu: string;
	section: CrownCrateSection;
	// Winter of saleYear runs from December of saleYear to February of saleYear + 1.
	saleSeason: CrownCrateSaleSeason | null;
	saleYear: number | null;
	isPTS: boolean;
	addedVersion: string;
	cardBack: string;
	// Card back shown on hover.
	cardBackGlow: string;
	image: string | null;
	rewardsCount: number;
}

// Tiers: 1 COMMON … 7 RADIANT APEX.
export interface CrownCrateCard {
	card: number;
	tiers: number[];
}

export interface CrownCrateReward {
	productId: number;
	tier: number;
	position: number;
	collectibleId: number | null;
	itemId: number | null;
	nameEn: string;
	nameRu: string;
	typeEn: string;
	typeRu: string;
	descriptionEn: string | null;
	descriptionRu: string | null;
	flavorEn: string | null;
	flavorRu: string | null;
	cooldownMs: number | null;
	count: number;
	// Gem price (0 — can't be bought for gems) and gems received for a duplicate.
	price: number;
	extraction: number;
	card: string;
	cardSmall: string;
	image: string | null;
	icon: string | null;
}

export interface CrownCrate extends CrownCrateListItem {
	descriptionEn: string | null;
	descriptionRu: string | null;
	noteEn: string | null;
	noteRu: string | null;
	cards: CrownCrateCard[];
	rewards: CrownCrateReward[];
}

// Fallout 76 map

export interface F76MapRegion {
	formId: string;
	nameEn: string;
	nameRu: string;
}

export interface F76MapMarker {
	formId: string;
	// 'location' is a map marker, 'region' is a region name label.
	kind: 'location' | 'region';
	// Symbol class in the game's mapmarkerslibrary.swf; the icon is <icon>.svg.
	icon: string;
	nameEn: string;
	nameRu: string;
	regionFormId: string | null;
	// Pixels of the 4096×4096 map texture, origin top left.
	mapX: number;
	mapY: number;
	// Game world coordinates.
	x: number;
	y: number;
	isPts: boolean;
	initiallyDisabled: boolean;
}

// A layer of placed objects (e.g. event collectibles); its points are loaded when the layer is turned on.
export interface F76MapLayer {
	id: string;
	nameEn: string;
	nameRu: string;
	count: number;
	// Every point of the layer is new on PTS
	isPts: boolean;
}

export interface F76MapObject {
	formId: string;
	regionFormId: string | null;
	// Named location of the object's cell; null in the wilderness.
	locationNameEn: string | null;
	locationNameRu: string | null;
	mapX: number;
	mapY: number;
	x: number;
	y: number;
	isPts: boolean;
}

export interface F76MapData {
	regions: F76MapRegion[];
	markers: F76MapMarker[];
	layers: F76MapLayer[];
}
