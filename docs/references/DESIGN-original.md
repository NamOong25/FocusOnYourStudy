---
name: Zenith Pastel EdTech
colors:
  surface: '#f4fafd'
  surface-dim: '#d4dbdd'
  surface-bright: '#f4fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef5f7'
  surface-container: '#e8eff1'
  surface-container-high: '#e2e9ec'
  surface-container-highest: '#dde4e6'
  on-surface: '#161d1f'
  on-surface-variant: '#474554'
  inverse-surface: '#2b3234'
  inverse-on-surface: '#ebf2f4'
  outline: '#787586'
  outline-variant: '#c8c4d7'
  surface-tint: '#5847d2'
  primary: '#5341cd'
  on-primary: '#ffffff'
  primary-container: '#6c5ce7'
  on-primary-container: '#faf6ff'
  inverse-primary: '#c6bfff'
  secondary: '#604db7'
  on-secondary: '#ffffff'
  secondary-container: '#a391ff'
  on-secondary-container: '#38218d'
  tertiary: '#544daa'
  on-tertiary: '#ffffff'
  tertiary-container: '#6d66c4'
  on-tertiary-container: '#faf6ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c6bfff'
  on-primary-fixed: '#160066'
  on-primary-fixed-variant: '#4029ba'
  secondary-fixed: '#e6deff'
  secondary-fixed-dim: '#cabeff'
  on-secondary-fixed: '#1c0062'
  on-secondary-fixed-variant: '#48349d'
  tertiary-fixed: '#e3dfff'
  tertiary-fixed-dim: '#c5c0ff'
  on-tertiary-fixed: '#140067'
  on-tertiary-fixed-variant: '#413996'
  background: '#f4fafd'
  on-background: '#161d1f'
  surface-variant: '#dde4e6'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system powers a modern smart learning mobile application crafted to eliminate cognitive fatigue, foster sustained focus, and create a calm, delightful study habit. Drawing inspiration directly from modern 3D soft-tech interfaces, the aesthetic balances calming pastel lavender and periwinkle tones with clear, punchy visual feedback.

### Emotional Target
- **Focus & Serenity:** A distraction-free, mindful environment that reduces academic stress through gentle ambient backdrops and airy negative space.
- **Friendly Intelligence:** Welcoming AI mentorship represented through smooth contours, rounded interactive targets, and playful 3D isometric tactile accents.
- **Progress & Achievement:** Encouraging micro-interactions, clean completion indicators, and soft elevation shifts that celebrate daily milestones.

### Design Style: Soft Neo-Pastel Modern
The interface merges the clarity of clean mobile minimalism with the physical warmth of soft diffused elevations and generous squircle forms (rounded-2xl to rounded-3xl). Flat cards are layered with subtle borders, ultra-fine frosted overlays, and gentle purplish cast shadows, creating a tactile yet digital-native mobile learning canvas optimized for iOS and Android ergonomics.

## Colors

The color palette centers on calming lavender-indigo tones that evoke mental focus and clarity, paired with functional tint scales designed specifically for dark readable text on light backgrounds.

### Core Functional Swatches
- **Primary (`#6C5CE7`):** Core action color for hero buttons, active navigation states, prominent progress indicators, and primary interactive elements.
- **Secondary (`#8C7AE6`):** Supporting accent for secondary pills, selected chips, and gradient midtones.
- **Tertiary (`#A29BFE`):** Soft decorative purple for card accents, icon badge containers, and auxiliary charts.
- **Surface Canvas (`#F8F9FE`):** An airy, tinted off-white canvas that softens screen glare compared to harsh pure white (`#FFFFFF`).
- **Surface Card (`#FFFFFF`):** Base layer for content cards, active panels, and floating navigation bars.
- **Accent Soft (`#E8EAFF`):** Tonal surface for resting badge backgrounds, track containers, and inactive segmented controls.
- **Neutral Dark (`#2D3436`):** Deep charcoal for headlines, critical data metrics, and high-emphasis labels to guarantee high legibility.
- **Neutral Muted (`#636E72`):** Balanced mid-grey for secondary body text, subtitles, timestamp labels, and inactive tab icons.
- **Functional Semantics:**
  - Success / Focus (`#00B894` & tint `#E3FCEF`)
  - Warning / Streak Fire (`#FFAA00` & tint `#FFF4E5`)
  - Accent Cyan (`#0984E3` & tint `#E1F5FE`)

## Typography

The typographic hierarchy utilizes **Plus Jakarta Sans** across all levels. It features open geometric counters, friendly rounded terminals, and robust native Vietnamese diacritics support without baseline clipping or awkward accent collisions.

### Guidelines
- **Optical Balance:** Keep headings punchy and bold (`700` and `800`) with tight tracking (`-0.01em` to `-0.02em`) to ground the soft pastel environment.
- **Vietnamese Readability:** Maintain strict minimum line-heights (minimum `1.4x` for body text) to accommodate stacked tones (hỏi, ngã, nặng, sắc, huyền) seamlessly.
- **Numbers & Metrics:** Use `tabular-nums` when displaying timers, session countdowns, and completion percentages (`86%`, `12h 45m`) to avoid layout jitter during active studying.

## Layout & Spacing

The layout is built around mobile-first thumb ergonomics, respecting iOS safe areas (top notch/dynamic island and bottom home indicator) and standard Android navigation bars.

### Layout Principles
- **Canvas Margins:** Mobile screens adhere to a standard outer horizontal padding of `margin` (`1.25rem` / `20px`), tightening to `margin-sm` (`16px`) on ultra-compact devices (under 360px width).
- **Component Spacing:**
  - Card internal padding: `space-lg` (`20px`) for major hero banners, `space-md` (`14px`) for list cards.
  - Inter-card vertical spacing: `space-md` (`14px`) to `space-lg` (`20px`).
  - Inline icon-to-label gaps: `space-xs` (`4px`) to `space-sm` (`8px`).
- **Touch Target Integrity:** All interactive touch surfaces maintain a strict minimum dimension of `44x44px` (iOS standard) or `48x48px` (Android Material standard), using internal padding rather than small isolated hitboxes.

## Elevation & Depth

Visual hierarchy uses a refined hybrid approach: soft tonal layering paired with colored ambient shadows (tinted with the primary lavender hue rather than muddy neutral black).

### Elevation Hierarchy
- **Level 0 (Flat / Canvas):** Surface color `#F8F9FE`. No shadow.
- **Level 1 (Resting Cards & Tiles):** Pure white `#FFFFFF` surface with a delicate pastel drop shadow:
  - `box-shadow: 0 4px 16px -2px rgba(108, 92, 231, 0.08), 0 2px 6px -1px rgba(45, 52, 54, 0.03);`
  - Subtle edge definition via `1px solid rgba(232, 234, 255, 0.8)`.
- **Level 2 (Interactive Floating Elements & Floating Nav):** Bottom dock and modal bottom sheets:
  - `box-shadow: 0 10px 28px -4px rgba(108, 92, 231, 0.14), 0 4px 10px -2px rgba(45, 52, 54, 0.04);`
- **Level 3 (Primary Call-to-Action / Floating Action Button):** Active action buttons utilize glow elevation:
  - `box-shadow: 0 8px 20px -2px rgba(108, 92, 231, 0.38);`
- **Hero Card Inset Gradient:** Hero cards (such as "Data Structures" featured modules) use an internal linear gradient `linear-gradient(135deg, #6C5CE7 0%, #8C7AE6 60%, #A29BFE 100%)` with soft 3D ambient glows.

## Shapes

The design system embraces generous, organic curves that echo friendly EdTech interfaces and soft physical forms.

### Corner Radius System
- **Pill (`9999px`):** Fully rounded pill geometry applied to segmented tab controls, status badges, secondary buttons, and floating central action buttons.
- **Extra Large Containers (`rounded-3xl` / `24px`):** Hero topic cards, AI suggestion banner cards, modal bottom sheets, and the floating bottom navigation bar.
- **Standard Cards (`rounded-2xl` / `16px`):** Study plan item rows, metric overview tiles, and input form groups.
- **Small Elements (`rounded-xl` / `12px`):** Subject icon badge backgrounds, progress bar tracks, and thumbnail wrappers.

## Components

### Buttons
- **Primary Action Button:**
  - Height: `48px` to `52px` (full width or padded horizontal `24px`).
  - Background: Solid `#6C5CE7` or soft lavender gradient (`#6C5CE7` to `#8C7AE6`).
  - Text: White `#FFFFFF`, `title-md`, bold.
  - Corner: Pill-shaped (`9999px`).
  - Shadow: Level 3 primary colored glow (`rgba(108, 92, 231, 0.35)`).
- **Secondary Ghost / Tinted Button:**
  - Background: `#E8EAFF`. Text: `#6C5CE7`.
  - Corner: Pill-shaped (`9999px`). Border: none.

### Status Badges & Chips
- **Segmented Time Filters (Day / Week / Month / All Time):**
  - Unselected: Transparent or faint `#FFFFFF`, text `#636E72`.
  - Selected: Solid `#6C5CE7`, text `#FFFFFF`, soft shadow Level 1.
- **Progress Badges:**
  - Compact circular or pill containers with `#E8EAFF` background and `#6C5CE7` text (e.g., `60%`, `30%`, `0%`).

### Study Cards & List Items
- **Today's Plan List Item:**
  - Background: `#FFFFFF`. Padding: `14px 16px`. Radius: `16px`.
  - Left slot: `44x44px` squircle container (`rounded-xl`) tinted according to subject theme (e.g., `#E8EAFF` for Data Structures, `#E1F5FE` for Discrete Math, `#E3FCEF` for Problem Solving).
  - Center: Subject title (`title-md`, `#2D3436`) with meta info row (`body-sm`, `#636E72` with small duration icon).
  - Right: Percentage badge or progress circle indicator.
- **AI Tip Banner Card:**
  - Soft multi-stop tint background (`#FFFFFF` overlaid on `#F8F9FE`).
  - Left slot: 3D AI avatar icon container.
  - Right slot: Chevron navigation icon (`#A29BFE`).

### Floating Bottom Navigation Bar
- **Dock Container:**
  - Floating pill or lifted curved bar with horizontal margin (`16px`), `24px` radius.
  - Background: `#FFFFFF` with glass backdrop blur (`backdrop-filter: blur(12px)`).
  - Elevation: Level 2 floating shadow.
- **Active Navigation Item:**
  - Vertical stack of active SVG icon and label in `#6C5CE7`.
- **Center Action Button (+):**
  - Raised circular FAB (`48x48px`) centered on the bar, filled with `#6C5CE7`, sporting white plus icon and Level 3 primary elevation.