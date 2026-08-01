---
name: Clinical Elegance
colors:
  surface: '#fff8f0'
  surface-dim: '#e0d9cf'
  surface-bright: '#fff8f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf3e8'
  surface-container: '#f4ede3'
  surface-container-high: '#eee7dd'
  surface-container-highest: '#e9e2d7'
  on-surface: '#1e1b15'
  on-surface-variant: '#514440'
  inverse-surface: '#333029'
  inverse-on-surface: '#f7f0e5'
  outline: '#83746f'
  outline-variant: '#d6c2bd'
  surface-tint: '#805444'
  primary: '#7d5141'
  on-primary: '#ffffff'
  primary-container: '#996958'
  on-primary-container: '#fffbff'
  inverse-primary: '#f3baa6'
  secondary: '#5e5e5c'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdc'
  on-secondary-container: '#636360'
  tertiary: '#5c5c5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#757474'
  on-tertiary-container: '#fffcfb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#f3baa6'
  on-primary-fixed: '#311307'
  on-primary-fixed-variant: '#653d2e'
  secondary-fixed: '#e4e2de'
  secondary-fixed-dim: '#c8c6c3'
  on-secondary-fixed: '#1b1c1a'
  on-secondary-fixed-variant: '#474744'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#fff8f0'
  on-background: '#1e1b15'
  surface-variant: '#e9e2d7'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 32px
  gutter: 24px
  section-gap: 48px
  card-padding: 24px
---

## Brand & Style
The design system for this luxury aesthetic clinic is built upon a philosophy of "Clinical Elegance"—balancing medical precision with high-end hospitality. The target audience is a discerning clientele seeking professional results in a serene, premium environment. 

The visual style is **Modern Minimalist with Glassmorphic accents**. It utilizes a sophisticated "warm nude" foundation to evoke comfort and skin-health, contrasted by Rose Gold highlights that signify luxury and premium service. The interface must feel breathable, using heavy whitespace to reduce cognitive load, ensuring that complex medical data feels approachable and high-end.

## Colors
This design system utilizes a palette rooted in organic, skin-tone adjacent neutrals and metallic accents:

*   **Primary (Rose Gold):** `#B78472` used exclusively for primary calls-to-action, active states, and critical highlights.
*   **Secondary (Cream Beige):** `#FDFBF7` serves as the primary background color to provide a warm, inviting alternative to clinical white.
*   **Tertiary (Charcoal):** `#333333` used for primary headings and high-contrast UI borders to ensure legibility and professional weight.
*   **Neutral (Muted Stone):** `#E5DED4` used for secondary backgrounds, borders, and subtle UI divisions.

## Typography
The typographic hierarchy relies on the contrast between the authoritative, editorial feel of **Playfair Display** for headings and the functional, neutral precision of **Inter** for data and UI controls. 

Headings should use tight letter-spacing to maintain a premium "magazine" feel. Labels and small UI elements should utilize uppercase styling with increased letter-spacing to ensure clarity in high-density dashboard views.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for dashboard views to maintain structural integrity of medical charts and schedules. On desktop, a 12-column grid is used with generous 24px gutters.

**Breakpoints:**
*   **Mobile (<768px):** Single column, 16px margins, vertical stacking of all cards.
*   **Tablet (768px - 1024px):** 6-column grid, 24px margins, sidebar collapses to icons.
*   **Desktop (>1024px):** 12-column grid with a fixed 280px left-hand navigation rail.

Spacing is based on an 8px base unit. Ample whitespace is mandatory; never crowd information. If a view feels dense, increase the `section-gap` or implement progressive disclosure.

## Elevation & Depth
Depth in the design system is achieved through **Tonal Layers** and **Glassmorphism**. 

1.  **Base Surface:** Cream Beige (#FDFBF7) is the lowest level.
2.  **Surface Containers:** White (#FFFFFF) cards with 1px solid borders in Neutral (#E5DED4) create the primary level of elevation.
3.  **Soft Shadows:** Use very diffused, low-opacity shadows for floating elements (e.g., `0px 10px 30px rgba(51, 51, 51, 0.04)`).
4.  **Glassmorphism:** Modals and dropdown menus should use a backdrop filter (blur: 12px) with a semi-transparent white fill (opacity: 80%) to maintain a sense of lightness and spatial awareness.

## Shapes
The shape language is "Soft-Modern." All primary containers, buttons, and input fields utilize a consistent 12px corner radius. Large display cards or featured image containers should use a 16px or 24px radius to feel more approachable and less "industrial." 

Avoid sharp 0px corners entirely, as they conflict with the "aesthetic" and "organic" nature of the clinic's brand.

## Components

### Buttons
*   **Primary:** Rose Gold background (#B78472), White text, 12px border-radius. Subtle lift on hover.
*   **Secondary:** Transparent background, Charcoal border (#333333), Charcoal text.
*   **Tertiary/Ghost:** No border, Rose Gold text. Used for "Cancel" or low-priority actions.

### Cards & Tables
*   **Cards:** White background, 1px border (#E5DED4), 12px-16px padding. 
*   **Tables:** Row-based layout with no vertical grid lines. Headers use the `label-md` typography style. Use alternating row tints in the secondary color (#FDFBF7) for high-density medical data.

### Input Fields
*   **Style:** Understated. 1px border (#E5DED4), White background. On focus, the border transitions to Rose Gold (#B78472).
*   **Labels:** Always positioned above the input in `body-sm` weight.

### Specialized Components
*   **Status Chips:** Used for appointment status (e.g., "Confirmed," "Post-Op"). Use very desaturated, light versions of the status color with high-contrast text.
*   **Treatment Timelines:** A vertical rail using Rose Gold nodes to track a patient's aesthetic journey.