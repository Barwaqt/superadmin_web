export type HomePanel={enabled:boolean;eyebrow:string;title:string;highlight:string;description:string;image:string;alt:string;linkLabel:string;href:string};
export type HomeCard={title:string;description:string;image:string;alt:string;linkLabel:string;href:string};
export type HomeCategories={enabled:boolean;title:string;linkLabel:string;href:string;items:{label:string;icon:string;categorySlug:string}[]};
export type HomeProductRow={enabled:boolean;title:string;description:string;categorySlug:string;linkLabel:string;productIds:string[]};
export type HomeContent={heroMain:HomeHero;heroSide:HomeHero;topCategories:HomeCategories;featured:{enabled:boolean;title:string;badge:string;description:string;linkLabel:string;href:string;items:HomeCard[];promos:{eyebrow:string;title:string;description:string;linkLabel:string;href:string}[]};flash:HomeProductRow;banners:{enabled:boolean;items:HomeCard[]};popularCategories:HomeCategories;productRows:HomeProductRow[];moreCategories:HomeCategories;upgrade:HomePanel;benefits:{enabled:boolean;items:{icon:string;title:string;description:string}[]};searches:{enabled:boolean;title:string;terms:string[];limit?:number;dynamic?:boolean};footer:{columns:{title:string;links:{label:string;href:string}[]}[];title:string;description:string;linkLabel:string;href:string;copyright:string;paymentLabel:string}};
export type HomeDocument={content:HomeContent;version:number;updatedAt:string};

export type HomeHero = HomePanel | {enabled:boolean;slides:HomePanel[]};
export function heroSlides(hero:HomeHero):HomePanel[]{return "slides" in hero ? hero.slides : [hero];}
