# JewelleryBox Component

A reusable, production-ready **3D Hover-to-Open Jewellery Gift Box** for Next.js and Tailwind CSS.
Features physical 3D lid flip, single high-definition hero product showcase, responsive container-query scaling via `cqw`, full keyboard/touch accessibility, and 64cqw enlarged presentation geometry.

---

## 📦 Component API & Props

```tsx
import { JewelleryBox, type JewelleryBoxItem } from "@/components/jewellery-box/JewelleryBox";
```

### Props Table

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `image` | `JewelleryBoxItem` | **Required** | The single hero product `{ src, alt, href? }` presented on the 1:1 white mat card. |
| `title` | `string` | `"Jewellery"` | Prominent title on the front lid (Poppins 600). |
| `number` | `string` | `"NO. 01"` | Top-left letter-spaced collection index. |
| `monogram` | `string` | `"R"` | Top-right circled monogram emblem. |
| `subtitle` | `string` | `"Premium Collection, 2026"` | Subtitle placed below the burnt orange underline. |
| `tagline` | `string` | `"Timeless Elegance"` | Tagline shown on the inside velvet lid panel. |
| `className` | `string` | `undefined` | Additional classes for the container wrapper. |

```ts
export interface JewelleryBoxItem {
  src: string;
  alt: string;
  href?: string;
}
```

---

## 🖼️ How to Use

Pass a single object to the required `image` prop:

```tsx
<JewelleryBox
  number="NO. 01"
  title="Polki Pair"
  monogram="P"
  subtitle="Heritage Series, 2026"
  tagline="Timeless Elegance"
  image={{
    src: "/products/polki-jhumka.webp",
    alt: "Polki jhumka earrings",
    href: "/collections/polki",
  }}
/>
```

### Image Specifications
- **Aspect Ratio**: 1:1 Square (e.g. 800×800).
- **Format**: `.webp` or `.jpg` stored in `public/products/`.
- **Card Styling**: Centered `h-[98%] aspect-square` slot on a luxury white mat card with a burnt orange border (`#CC5500`) and charcoal shadow.

---

## 📐 Physical Box Geometry & Scaling Formula

The component is configured with enlarged presentation dimensions so the hero piece stands out:
- **Aspect Ratio**: `aspect-[1/1.25]`
- **Tray & Lid Height**: `h-[64cqw]`
- **Sliding Assembly Offset**: `translate-y-[34cqw]`
- **Title Offset**: `top-[19cqw]`

> **Formula Rule**: If tray height is ever adjusted in the future:
> - `aspect ≈ 1 / (2 × tray_height/100 − 0.03)`
> - `translate ≈ tray_height − 30`

---

## ♿ Accessibility & Interaction Rules

- **Mouse Interaction**: Opens on `pointerenter`, closes on `pointerleave` (`pointerType === "mouse"`).
- **Touch Interaction**: Tap/click toggles the box open and closed on mobile devices.
- **Keyboard Navigation**: Fully accessible (`tabIndex={0}`, `role="button"`, `aria-expanded`). Press <kbd>Enter</kbd> or <kbd>Space</kbd> to toggle; press <kbd>Escape</kbd> to close.
- **Screen Readers**: Root announces `aria-label="Jewellery box. Hover, tap or press Enter to open."`.
- **Reduced Motion**: Disables 3D rotations, cross-fades lid in 150ms.
