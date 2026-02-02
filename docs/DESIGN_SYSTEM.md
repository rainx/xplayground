# xToolbox Design System

## Core Design Principles

### Pattern: App Store Style Landing
*   **Conversion**: Show real screenshots. Include ratings (4.5+ stars). QR code for mobile. Platform-specific CTAs.
*   **CTA**: Download buttons prominent (App Store + Play Store) throughout.
*   **Sections**:
    1.  Hero with device mockup
    2.  Screenshots carousel
    3.  Features with icons
    4.  Reviews/ratings
    5.  Download CTAs

### Style: Micro-interactions
*   **Keywords**: Small animations, gesture-based, tactile feedback, subtle animations, contextual interactions, responsive.
*   **Best For**: Mobile apps, touchscreen UIs, productivity tools, user-friendly consumer apps, interactive components.
*   **Performance**: ⚡ Excellent
*   **Accessibility**: ✓ Good

## Color Palette

| Usage | Color | Hex | Notes |
| :--- | :--- | :--- | :--- |
| **Primary** | Teal | `#0D9488` | Main brand color |
| **Secondary** | Teal Light | `#14B8A6` | Accents |
| **CTA** | Orange | `#F97316` | Action buttons |
| **Background** | Mint Cream | `#F0FDFA` | Application background |
| **Text** | Dark Teal | `#134E4A` | Primary text |

*Note: Current implementation uses Dark Mode theme (`#1e1e1e` background) which aligns better with developer tools.*

## Typography

**Font Family**: Plus Jakarta Sans
*   **Mood**: Friendly, modern, SaaS, clean, approachable, professional.
*   **Google Fonts**: [Plus Jakarta Sans](https://fonts.google.com/share?selection.family=Plus+Jakarta+Sans:wght@300;400;500;600;700)

## Key Effects

*   Small hover effects (50-100ms)
*   Loading spinners
*   Success/error state animations
*   Gesture-triggered actions (swipe/pinch)
*   Haptic feedback (where applicable)

## Anti-patterns to Avoid

*   Complex onboarding
*   Slow performance

## Pre-Delivery Checklist

- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive layouts: 375px, 768px, 1024px, 1440px
