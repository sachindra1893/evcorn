export type BlockType = 
  | 'heading' 
  | 'paragraph' 
  | 'image' 
  | 'table' 
  | 'comparison' 
  | 'callout' 
  | 'faq' 
  | 'pros-cons' 
  | 'list' 
  | 'quote' 
  | 'divider' 
  | 'cta' 
  | 'related'
  | 'statistics'
  | 'timeline'
  | 'gallery';

export interface BaseBlock {
  type: BlockType;
  id: string; // Unique ID for the block (helpful for dragging/dropping or rendering keys)
  _uploading?: boolean; // Temporary state for UI
}

// 1. Heading
export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  data: {
    text: string;
    level: 1 | 2 | 3 | 4;
  };
}

// 2. Paragraph
export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  data: {
    text: string; // HTML allowed (for bold, italics, links)
  };
}

// 3. Image
export interface ImageBlock extends BaseBlock {
  type: 'image';
  data: {
    url: string;
    caption?: string;
    alt?: string;
  };
}

// 4. Responsive Table (any rows/cols)
export interface TableBlock extends BaseBlock {
  type: 'table';
  data: {
    withHeadings: boolean;
    content: string[][]; // 2D array of strings.
  };
}

// 5. Comparison Cards
export interface ComparisonCard {
  title: string;
  image?: string;
  specs: { label: string; value: string }[];
  highlight?: string;
}
export interface ComparisonBlock extends BaseBlock {
  type: 'comparison';
  data: {
    items: ComparisonCard[];
  };
}

// 6. Callout
export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  data: {
    text: string;
    style: 'info' | 'warning' | 'success' | 'danger';
    icon?: string; // emoji or icon class
  };
}

// 7. FAQs
export interface FAQItem {
  question: string;
  answer: string;
}
export interface FAQBlock extends BaseBlock {
  type: 'faq';
  data: {
    items: FAQItem[];
  };
}

// 8. Pros & Cons
export interface ProsConsBlock extends BaseBlock {
  type: 'pros-cons';
  data: {
    pros: string[];
    cons: string[];
  };
}

// 9. List
export interface ListBlock extends BaseBlock {
  type: 'list';
  data: {
    style: 'unordered' | 'ordered';
    items: string[];
  };
}

// 10. Quote
export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  data: {
    text: string;
    author?: string;
  };
}

// 11. Divider
export interface DividerBlock extends BaseBlock {
  type: 'divider';
  data: {};
}

// 12. CTA
export interface CTABlock extends BaseBlock {
  type: 'cta';
  data: {
    text: string;
    buttonText: string;
    url: string;
    style: 'primary' | 'secondary' | 'outline';
  };
}

// 14. Related Content
export interface RelatedBlock extends BaseBlock {
  type: 'related';
  data: {
    articleIds: string[]; // references to other articles
  };
}

// 15. Statistics Cards
export interface StatisticsBlock extends BaseBlock {
  type: 'statistics';
  data: {
    items: { label: string; value: string; icon?: string }[];
  };
}

// 16. Timeline
export interface TimelineBlock extends BaseBlock {
  type: 'timeline';
  data: {
    events: { date: string; title: string; description: string }[];
  };
}

// 17. Image Gallery
export interface GalleryBlock extends BaseBlock {
  type: 'gallery';
  data: {
    columns: 2 | 3 | 4;
    images: { url: string; caption?: string; alt?: string; _uploading?: boolean; }[];
  };
}

export type ArticleBlock = 
  | HeadingBlock 
  | ParagraphBlock 
  | ImageBlock 
  | TableBlock 
  | ComparisonBlock 
  | CalloutBlock 
  | FAQBlock 
  | ProsConsBlock 
  | ListBlock 
  | QuoteBlock 
  | DividerBlock 
  | CTABlock 
  | RelatedBlock
  | StatisticsBlock
  | TimelineBlock
  | GalleryBlock;
