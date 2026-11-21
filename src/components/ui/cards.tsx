import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * @typedef CardItem
 * @property {string | number} id - Unique identifier for the card.
 * @property {string} title - The main title text of the card.
 * @property {string} subtitle - The subtitle or category text.
 * @property {string} imageUrl - The URL for the card's background image.
 * @property {string} [href] - Optional navigation target URL.
 */
export interface CardItem {
  id: string | number;
  title: string;
  subtitle: string;
  imageUrl: string;
  href?: string;
}

/**
 * @typedef HoverRevealCardsProps
 * @property {CardItem[]} items - An array of card item objects to display.
 * @property {string} [className] - Optional additional class names for the container.
 * @property {string} [cardClassName] - Optional additional class names for individual cards.
 */
export interface HoverRevealCardsProps {
  items: CardItem[];
  className?: string;
  cardClassName?: string;
}

/**
 * A component that displays a grid of cards with a smooth hover-reveal effect.
 * Note: Blur on adjacent cards has been removed as per user requirements for crystal clarity.
 */
const HoverRevealCards: React.FC<HoverRevealCardsProps> = ({
  items,
  className,
  cardClassName,
}) => {
  return (
    // The `group` class on the container enables styling children on parent hover.
    <div
      role="list"
      className={cn(
        'group grid w-full max-w-8xl grid-cols-1 gap-6 p-4 sm:grid-cols-2 md:grid-cols-4',
        className
      )}
    >
      {items.map((item) => {
        const cardContent = (
          <>
            {/* Gradient overlay for text contrast and luxury depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-950/40 to-transparent transition-opacity duration-300" />

            {/* Subtle Luxury Rose Accent Border Glow on Hover */}
            <div className="absolute inset-0 border border-border/40 hover:border-[#556B2F] rounded-xl transition-colors duration-300 pointer-events-none" />

            {/* Card Content */}
            <div className="absolute bottom-0 left-0 p-6 text-white z-10">
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#E9E2CC] font-medium">
                {item.subtitle}
              </p>
              <h3 className="mt-1 text-lg sm:text-xl font-serif font-medium text-white group-hover/card:text-[#E9E2CC] transition-colors">
                {item.title}
              </h3>
            </div>
          </>
        );

        const cardClasses = cn(
          'group/card relative h-80 cursor-pointer overflow-hidden rounded-xl bg-cover bg-center shadow-lg transition-all duration-500 ease-out [transform:translateZ(0)]',
          // On parent hover, apply subtle scaling/dimming to sibling children without any blur
          'group-hover:scale-[0.98] group-hover:opacity-85',
          // On child hover/focus, highlight the current item cleanly (NO blur applied)
          'hover:!scale-105 hover:!opacity-100 focus-visible:!scale-105 focus-visible:!opacity-100',
          // Accessibility: Focus ring with theme styling
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#556B2F] focus-visible:ring-offset-2 ring-offset-white',
          cardClassName
        );

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              role="listitem"
              aria-label={`${item.title}, ${item.subtitle}`}
              className={cardClasses}
              style={{ backgroundImage: `url(${item.imageUrl})` }}
            >
              {cardContent}
            </Link>
          );
        }

        return (
          <div
            key={item.id}
            role="listitem"
            aria-label={`${item.title}, ${item.subtitle}`}
            tabIndex={0}
            className={cardClasses}
            style={{ backgroundImage: `url(${item.imageUrl})` }}
          >
            {cardContent}
          </div>
        );
      })}
    </div>
  );
};

export default HoverRevealCards;

