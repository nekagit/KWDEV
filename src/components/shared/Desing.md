# Design System Documentation

## Overview

This design system provides a comprehensive set of Tailwind CSS classes for building modern, beautiful user interfaces. The system emphasizes visual hierarchy, smooth interactions, and polished aesthetics with full dark mode support.

---

## Core Design Principles

### 1. **Depth & Dimension**
Every component uses layered visual depth through:
- Subtle background gradients (`from-white to-gray-50/30`)
- Multi-layered shadows with color tints
- Backdrop blur effects for glassmorphism
- Strategic use of opacity and transparency

### 2. **Smooth Interactions**
All interactive elements feature:
- Transition durations between 200-300ms
- Transform animations (scale, translate)
- Hover states that feel responsive and intentional
- Proper focus states with ring utilities

### 3. **Visual Hierarchy**
Clear content organization through:
- Gradient text for primary headings
- Consistent spacing scale (3, 4, 5, 6, 8, 12)
- Border separators with reduced opacity
- Font weight variations (medium, semibold, bold)

### 4. **Modern Aesthetics**
Contemporary design patterns including:
- Generous border-radius (xl: 12px, 2xl: 16px)
- Subtle color gradients for depth
- Refined color palette with proper contrast
- Custom scrollbar styling

---

## Color Philosophy

### Light Mode
- **Backgrounds**: White to gray-50 gradients
- **Borders**: Gray-200/60 (60% opacity for softness)
- **Text**: Gray-900 (primary), Gray-600 (secondary)
- **Accents**: Indigo-600, Purple-500

### Dark Mode
- **Backgrounds**: Gray-900 to gray-800/50 gradients
- **Borders**: Gray-700/60 (maintains consistency)
- **Text**: White (primary), Gray-300/400 (secondary)
- **Accents**: Indigo-400, Purple-400

### Shadows
- **Light Mode**: Gray-200/50 with xl shadows
- **Dark Mode**: Shadows disabled (dark:shadow-none)
- **Colored Shadows**: Red-100/50, Purple-500/25 for specific states

---

## Component Specifications

### Accordion

**Purpose**: Collapsible content sections with smooth animations

**Key Features**:
- Gradient background with border glow
- Group hover effects on buttons
- Rotating chevron with scale animation
- Fade-in content animation

```json
{
  "root": "rounded-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50",
  "itemButton": "hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50"
}
```

**Animation Details**:
- Chevron rotates 180° with scale-110 when open
- Content slides in from top with fade effect
- Transition duration: 300ms

---

### Badge Component

**Purpose**: Small status indicators or labels

**Key Features**:
- Rounded-full for pill shape
- Hover scale effect (scale-105)
- Gradient backgrounds with matching shadows
- Icon integration with proper sizing

```json
{
  "rootPurple": "bg-gradient-to-r from-purple-500 to-indigo-600 shadow-purple-500/25"
}
```

**Usage**: Perfect for tags, statuses, notifications

---

### Button Component

**Purpose**: Primary interaction elements

**Key Features**:
- Icon animations on hover (scale-110)
- Group hover support
- Consistent spacing (mr-2, ml-2)

**Best Practices**:
- Use iconLeft for primary actions
- Use iconRight for navigation/forward actions

---

### Card

**Purpose**: Primary content container

**Key Features**:
- Dramatic hover effect with lift (-translate-y-1)
- Enhanced shadow on hover (2xl)
- Gradient text for titles
- Structured layout (header, body, footer)

```json
{
  "root": "shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1",
  "title": "bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
}
```

**Layout Structure**:
1. Header (with bottom border)
2. Body (flexible content area)
3. Footer (top border, right-aligned actions)

---

### Checkbox Component & Group

**Purpose**: Selection inputs with enhanced styling

**Key Features**:
- Group cursor pointer for better UX
- Custom scrollbar in checkbox group
- Empty state messaging
- Increased spacing for touch targets

**Scrollbar Styling**:
```
scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
```

---

### Dialog (Modal)

**Purpose**: Overlay content for focused interactions

**Key Features**:
- Backdrop blur for depth (bg-black/60 backdrop-blur-md)
- Zoom and slide-in animation
- Glassmorphism panel design
- Clear header/body/footer structure

**Animation**:
- Overlay: fade-in 200ms
- Panel: zoom-in-95 + slide-in-from-bottom-4 300ms

**Best Practices**:
- Keep max-width at 'md' for readability
- Use clear title hierarchy
- Provide obvious close button

---

### Empty State

**Purpose**: Communicate absence of content

**Key Features**:
- Dashed border for visual distinction
- Large icon with background wrapper
- Centered layout with max-width description
- Call-to-action placement

```json
{
  "iconWrapper": "bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl"
}
```

**Content Structure**:
1. Icon (16x16 with wrapper)
2. Title (bold, prominent)
3. Description (max-w-md for readability)
4. Action button (mt-6 for separation)

---

### Loading State

**Purpose**: Indicate content is being fetched

**Key Features**:
- Animated spinner with drop-shadow
- Larger spinner (10x10) for visibility
- Gradient background matching other states
- Clear loading text

**Spinner Composition**:
- Circle: 20% opacity (background)
- Path: 90% opacity (spinner arc)

---

### Error Display

**Purpose**: Communicate errors clearly

**Key Features**:
- Red gradient background (subtle, not harsh)
- Monospace font for error details
- Retry button with gradient
- Proper error hierarchy

**Layout**:
1. Header with icon + title
2. Error message
3. Technical details (code block style)
4. Retry action button

---

### Form & Form Field

**Purpose**: Structured input collection

**Key Features**:
- Generous spacing (space-y-6)
- Clear field descriptions
- Error messages with icons
- Grid-based field layout

**Error Handling**:
- Red-600 text with font-medium
- Flex layout for icon alignment
- Clear visual distinction

---

### Grid Container

**Purpose**: Responsive grid layouts

**Breakpoints**:
- Mobile: 1 column (default)
- SM: 2 columns
- LG: 3 columns
- XL: 4 columns

**Spacing**: 6 units (24px) gap for visual breathing room

---

### Header Components

**Purpose**: Section and page titles

**Types**:
1. **Header**: Standard section header
2. **ProjectHeader**: Specialized project header
3. **PageHeader**: Full-page header with border

**Key Features**:
- Gradient text for prominence
- Icon integration
- Flexible justify-between layout
- Subtitle support

**PageHeader Specifics**:
- 4xl text size for hierarchy
- Bottom border separator
- Action button area

---

### JSON Display

**Purpose**: Show formatted JSON/code

**Key Features**:
- Monospace font with proper line height
- Custom scrollbar
- Inner shadow for depth
- Max height with scroll (96 = 384px)
- Gradient background

**Usage**: Perfect for API responses, configuration viewing

---

### Labeled Textarea

**Purpose**: Multi-line text input

**Key Features**:
- Focus ring with indigo accent
- Smooth shadow transition on hover
- Proper placeholder styling
- Resize disabled for consistency

**States**:
- Default: shadow-sm
- Hover: shadow-md
- Focus: ring-2 with color

---

### List & List Item Card

**Purpose**: Display collections of items

**List Features**:
- Subtle dividers with reduced opacity
- Hover background for rows
- Rounded hover states

**List Item Card Features**:
- Gradient background
- Hover lift effect
- Footer with border separator
- Button group alignment

---

### Page Header

**Purpose**: Top-level page identification

**Key Features**:
- Extra large title (4xl)
- Bottom border separator
- Action button area
- Gradient text treatment

**Spacing**: 8 units margin-bottom (32px) for clear separation

---

### Table

**Purpose**: Structured data display

**Key Features**:
- Wrapped in rounded border container
- Gradient header background
- Hover row highlighting
- Bold uppercase column headers

**Structure**:
```
wrapper (border, rounded)
  └── table
      ├── thead (gradient background)
      └── tbody (hover states)
```

**Best Practices**:
- Use uppercase tracking-wider for headers
- Maintain consistent padding (px-6, py-4/5)
- Enable hover states for better scanning

---

### Tabs

**Purpose**: Content section navigation

**Key Features**:
- Active tab with colored bottom border
- Smooth transitions on all states
- Hover states for inactive tabs
- Proper spacing between tabs (gap-8)

**States**:
1. **Active**: Indigo border and text
2. **Inactive**: Transparent border, gray text
3. **Hover**: Gray border, darker text

**Typography**: Semibold font for clear hierarchy

---

## Spacing Scale

Consistent spacing throughout the system:

| Size | Pixels | Usage |
|------|--------|-------|
| 1 | 4px | Minimal gaps |
| 2 | 8px | Tight spacing |
| 3 | 12px | Default gaps |
| 4 | 16px | Standard spacing |
| 5 | 20px | Generous spacing |
| 6 | 24px | Section spacing |
| 8 | 32px | Large spacing |
| 12 | 48px | Extra large spacing |

---

## Border Radius Scale

Rounded corners for modern feel:

| Class | Pixels | Usage |
|-------|--------|-------|
| rounded-lg | 8px | Small elements |
| rounded-xl | 12px | Standard elements |
| rounded-2xl | 16px | Large containers |
| rounded-full | 9999px | Pills, badges |

---

## Shadow Scale

Layered shadows for depth:

| Class | Usage |
|-------|-------|
| shadow-sm | Subtle elevation |
| shadow-md | Standard elevation |
| shadow-lg | Prominent elevation |
| shadow-xl | High elevation |
| shadow-2xl | Maximum elevation |

**Color Tints**: Shadows include color (e.g., `shadow-gray-200/50`) for added depth

---

## Animation Durations

Consistent timing for smooth interactions:

| Duration | Usage |
|----------|-------|
| 150ms | Micro-interactions |
| 200ms | Standard transitions |
| 300ms | Complex animations |

---

## Typography Scale

Font sizes and weights:

### Sizes
- **xs**: 12px (labels, meta)
- **sm**: 14px (body, secondary)
- **base**: 16px (body, default)
- **lg**: 18px (emphasized)
- **xl**: 20px (card titles)
- **2xl**: 24px (section headers)
- **3xl**: 30px (not used)
- **4xl**: 36px (page titles)

### Weights
- **medium**: 500 (body emphasis)
- **semibold**: 600 (buttons, labels)
- **bold**: 700 (headings)

---

## Gradient Recipes

### Background Gradients
```
Light: from-white to-gray-50/50
Dark: from-gray-900 to-gray-800/50
```

### Text Gradients
```
Light: from-gray-900 to-gray-700
Dark: from-white to-gray-300
```

### Hover Gradients
```
Indigo-Purple: from-indigo-50/50 to-purple-50/50
Dark: from-indigo-950/30 to-purple-950/30
```

---

## Opacity Values

Strategic transparency for depth:

- **/30**: Very subtle (dark mode backgrounds)
- **/50**: Subtle (borders, backgrounds)
- **/60**: Standard (borders)
- **/80**: Prominent (hover states)
- **/90**: Near-opaque (icons)

---

## Accessibility Considerations

### Focus States
- All interactive elements have visible focus rings
- Ring color matches brand (indigo-500)
- Ring offset for dark mode compatibility

### Contrast Ratios
- Text maintains WCAG AA standards
- Dark mode carefully balanced
- Error states use sufficient contrast

### Touch Targets
- Minimum 44px height for buttons
- Adequate spacing between interactive elements
- Hover states don't rely on color alone

---

## Dark Mode Strategy

### Approach
All components include dark mode variants using the `dark:` prefix

### Color Adjustments
- Lighter accents (indigo-400 vs indigo-600)
- Reduced shadows (often disabled)
- Inverted gradients
- Proper contrast maintenance

### Testing
Ensure all states work in both modes:
- Default state
- Hover state
- Active/selected state
- Disabled state

---

## Implementation Guidelines

### Using These Classes

1. **Copy the exact class strings** - They're carefully balanced
2. **Maintain the order** - Some classes override others
3. **Test in both light and dark mode**
4. **Verify hover states work smoothly**

### Customization

To customize:
1. Identify the component
2. Locate the specific property
3. Adjust while maintaining consistency
4. Test all interactive states

### Performance

- All classes are standard Tailwind utilities
- No custom CSS required
- Tree-shaking compatible
- Production-ready

---

## Component Combinations

### Card + Empty State
Perfect for showing "no results" within a card context

### Dialog + Form
Modal forms with proper hierarchy

### Table + Loading State
Data tables with loading indicators

### List Item Card + Badge
Rich list items with status indicators

---

## Best Practices

### DO ✅
- Use the gradient backgrounds for primary containers
- Maintain consistent spacing (3, 4, 5, 6, 8)
- Apply hover states to interactive elements
- Use backdrop-blur for overlays
- Include dark mode variants

### DON'T ❌
- Mix different shadow scales randomly
- Skip transition classes on interactive elements
- Use overly bright colors without opacity
- Forget focus states for accessibility
- Ignore dark mode completely

---

## Browser Compatibility

### Required Features
- CSS Gradients (all modern browsers)
- Backdrop Filter (95%+ support)
- CSS Transitions (universal)
- CSS Grid (universal)

### Fallbacks
Most features degrade gracefully:
- Backdrop blur → solid background
- Gradients → solid colors
- Shadows → flat appearance

### Tested Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## File Structure

```
design-system/
├── components/
│   ├── Accordion.json
│   ├── Badge.json
│   ├── Card.json
│   └── ...
├── tokens/
│   ├── colors.json
│   ├── spacing.json
│   └── typography.json
└── documentation/
    └── design.md (this file)
```

---

## Updates & Versioning

### Version: 1.0.0

**Last Updated**: February 2026

**Changelog**:
- Initial comprehensive design system
- Full dark mode support
- Accessibility improvements
- Performance optimizations

---

## Support & Resources

### Tailwind CSS
- Documentation: https://tailwindcss.com/docs
- Version: 3.x compatible

### Design Inspiration
- Modern web applications
- Glassmorphism trends
- Material Design 3
- Apple Human Interface Guidelines

---

## Contributing

When proposing changes:
1. Maintain existing patterns
2. Test in both light and dark modes
3. Verify accessibility standards
4. Document the change clearly
5. Provide visual examples

---

## Credits

Design System crafted with:
- Tailwind CSS v3.x
- Modern design principles
- Accessibility in mind
- Performance optimization

---

**Ready to build beautiful interfaces!** 🎨✨