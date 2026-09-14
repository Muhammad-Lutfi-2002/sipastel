export interface CategoryNav {
  id: string;
  name: string;
  tagline: string;
  image: string;
  filterKey: 'KAOS' | 'JERSEY' | 'CUSTOM' | 'BEST SELLER';
  aspectRatio?: string;
}

export const categoriesData: CategoryNav[] = [
  {
    id: 'cat-kaos',
    name: 'KAOS',
    tagline: 'Heavyweight cotton & daily essentials',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85',
    filterKey: 'KAOS',
  },
  {
    id: 'cat-jersey',
    name: 'JERSEY',
    tagline: 'Technical fabric with retro silhouettes',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=85',
    filterKey: 'JERSEY',
  },
  {
    id: 'cat-custom',
    name: 'CUSTOM',
    tagline: 'Batch orders, embroidery & full sublimation',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85',
    filterKey: 'CUSTOM',
  },
  {
    id: 'cat-bestseller',
    name: 'BEST SELLER',
    tagline: 'Most loved cuts and signature colorways',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=85',
    filterKey: 'BEST SELLER',
  },
];
