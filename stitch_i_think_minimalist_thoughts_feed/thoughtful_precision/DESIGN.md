---
name: Thoughtful Precision
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-mobile:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1120px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
This design system is built on the principles of Swiss Modernism, prioritizing clarity, objectivity, and a profound sense of calm. The brand personality is intellectual yet approachable, designed for deep focus and contemplation. 

The aesthetic is ultra-minimal and editorial, utilizing significant whitespace to create "breathing room" for the user's thoughts. By stripping away non-essential decorations, the system elevates content to the highest priority. The emotional response should be one of quiet confidence and organized peace—avoiding the coldness of traditional brutalism in favor of a soft, "warm-minimalist" execution.

## Colors
The palette is intentionally restricted to create a high-end, gallery-like feel. 

- **Background (#FAFAF8):** An "off-white" with a hint of warmth to reduce eye strain and provide a more organic feel than pure white.
- **Surface (#FFFFFF):** Reserved for floating elements or specific content containers to create subtle depth.
- **Primary Text (#111111):** High-contrast black for maximum legibility and authority.
- **Secondary Text (#6B6B6B):** Used for metadata and supporting information to establish hierarchy.
- **Border (#E7E7E7):** Thin, architectural lines that define space without cluttering it.
- **Accent (#111111):** The primary color serves as the accent, maintaining a monochromatic and focused environment.

## Typography
The typography utilizes **Geist**, a typeface that embodies technical precision and clean geometry. 

The hierarchy is driven by dramatic scale differences rather than color. Display titles are large and tight-set to create a bold editorial impact. Body copy is given generous line height (1.6) to ensure a comfortable, book-like reading experience. Labels and auxiliary text use increased letter spacing and medium weights to remain legible even at smaller sizes.

## Layout & Spacing
The layout follows a strict 8px grid system, but is applied with "airy" proportions. Elements are grouped with ample negative space to prevent visual noise.

- **Desktop:** A 12-column centered fixed grid with a max-width of 1120px. 
- **Margins:** Large 64px outer margins on desktop provide a frame for the content, similar to a high-end magazine.
- **Mobile:** Transition to a fluid 4-column grid with 20px margins.
- **Rhythm:** Vertical rhythm should be highly consistent, using multiples of 8px (e.g., 16, 32, 64, 128) for section spacing to maintain a balanced, structured feel.

## Elevation & Depth
This design system rejects heavy shadows in favor of a flat, architectural layering system. 

Depth is achieved through **Tonal Layers** and **Subtle Outlines**:
- **Layer 0:** Background (#FAFAF8).
- **Layer 1:** Surface (#FFFFFF) with a 1px border (#E7E7E7).
- **Layer 2 (Interactions):** Very soft, "natural" shadows are used only when an element is actively floating (like a dropdown or modal). These should be highly diffused: `0 10px 30px rgba(0,0,0,0.04)`.

The primary method of separation is the 1px border, creating a crisp, paper-like quality.

## Shapes
While the layout is structured and grid-heavy, the corners are softened to 14px to introduce the "emotional warmth" requested. 

This specific radius (14px) provides a distinct "squircle-lite" look that feels more modern and bespoke than standard 4px or 8px corners. Small components like tags or checkboxes should scale down to 6px - 8px to maintain visual harmony with the larger containers.

## Components
- **Buttons:** Primary buttons are solid #111111 with white text. Secondary buttons use a 1px #E7E7E7 border with no fill. All buttons use 14px corner radius and generous horizontal padding (24px).
- **Input Fields:** Minimal 1px #E7E7E7 border, #FFFFFF background. Focus state is indicated by a subtle darkening of the border to #111111. Labels are positioned above the field in `label-sm` style.
- **Cards:** Use #FFFFFF background, 1px #E7E7E7 border, and 14px radius. No shadow.
- **Lists:** Clean, horizontal rules (1px #E7E7E7) between items. Use `body-md` for list items with high vertical padding (20px) to maintain the airy feel.
- **Chips/Tags:** Small 8px radius, light #E7E7E7 background with #111111 text, using `label-sm` typography.
- **Checkboxes/Radios:** Minimalist geometry. Checkboxes use a 1px border and a solid #111111 fill when active.