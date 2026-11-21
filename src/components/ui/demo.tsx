import React from 'react';
import HoverRevealCards, { CardItem } from '@/components/ui/cards';

// Sample data for the demo, matching the structure of the CardItem interface.
const demoItems: CardItem[] = [
  {
    id: 1,
    title: 'Royal Polki Heritage',
    subtitle: 'Explore Suite',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
    href: '/collections/polki-heritage',
  },
  {
    id: 2,
    title: 'Solitaire Haute Joaillerie',
    subtitle: 'Explore Suite',
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop',
    href: '/collections/solitaires',
  },
  {
    id: 3,
    title: 'Bridal Connoisseur',
    subtitle: 'Explore Suite',
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1200&auto=format&fit=crop',
    href: '/collections/bridal',
  },
  {
    id: 4,
    title: 'Everyday Fine Jewellery',
    subtitle: 'Explore Suite',
    imageUrl: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=1200&auto=format&fit=crop',
    href: '/collections/everyday-fine',
  },
];

/**
 * A demo page to showcase the HoverRevealCards component.
 */
const HoverRevealCardsDemo = () => {
  return (
    // Centering the component for a clean preview.
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <HoverRevealCards items={demoItems} />
    </div>
  );
};

export default HoverRevealCardsDemo;

