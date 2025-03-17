export interface Book {
	id: number;
	titleEn: string;
	titleRu: string;
	textEn: string;
	textRu: string;
	icon: string;
	catId: number;
	slug: string;
	created: string;
	updated: string;
	category: Category;
}

export interface Category {
	id: number;
	titleEn: string;
	titleRu: string;
	icon: string;
	slug: string;
}
