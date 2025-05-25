# CareerCraft Studio Style Guidelines

This document establishes the design system and style guidelines for CareerCraft Studio to ensure consistent branding and user experience across all components and pages.

## Brand Identity

### Color Palette

**Primary Colors:**

```css
/* Indigo/Blue Gradient System */
--primary-900: #1e1b4b /* Deep indigo for headers */ --primary-800: #1e3a8a
  /* Blue for accents */ --primary-700: #1d4ed8 /* Medium blue */
  --primary-600: #2563eb /* Primary blue for CTAs */ --primary-500: #3b82f6
  /* Light blue for highlights */ --primary-400: #60a5fa /* Lighter blue */
  --primary-100: #dbeafe /* Very light blue for backgrounds */
  --primary-50: #eff6ff /* Subtle blue tint */ /* Neutral Grays */
  --gray-900: #111827 /* Dark text */ --gray-800: #1f2937
  /* Secondary dark text */ --gray-600: #4b5563 /* Body text */
  --gray-400: #9ca3af /* Muted text */ --gray-100: #f3f4f6
  /* Light backgrounds */ --gray-50: #f9fafb /* Subtle backgrounds */
  /* Semantic Colors */ --success-600: #059669 /* Green for success states */
  --success-100: #dcfce7 /* Light green backgrounds */ --warning-600: #d97706
  /* Orange for warnings */ --warning-100: #fed7aa
  /* Light orange backgrounds */ --error-600: #dc2626 /* Red for errors */
  --error-100: #fee2e2 /* Light red backgrounds */;
```

**Gradient Combinations:**

```css
/* Hero Gradients */
.hero-gradient {
  background: linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 50%, #334155 100%);
}

/* CTA Gradients */
.cta-gradient {
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
}

/* Background Gradients */
.bg-gradient {
  background: linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #e0e7ff 100%);
}
```

### Typography

**Font Stack:**

```css
/* Primary font family (system fonts for performance) */
font-family:
  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, sans-serif;
```

**Type Scale:**

```css
/* Headings */
.text-7xl {
  font-size: 4.5rem;
  line-height: 1;
} /* Hero titles */
.text-6xl {
  font-size: 3.75rem;
  line-height: 1;
} /* Page titles */
.text-4xl {
  font-size: 2.25rem;
  line-height: 2.5rem;
} /* Section titles */
.text-3xl {
  font-size: 1.875rem;
  line-height: 2.25rem;
} /* Subsection titles */
.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
} /* Card titles */
.text-xl {
  font-size: 1.25rem;
  line-height: 1.75rem;
} /* Large body text */
.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
} /* Emphasized body */
.text-base {
  font-size: 1rem;
  line-height: 1.5rem;
} /* Body text */
.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
} /* Small text */
```

**Font Weights:**

```css
.font-bold {
  font-weight: 700;
} /* Headlines, CTAs */
.font-semibold {
  font-weight: 600;
} /* Subheadings, emphasis */
.font-medium {
  font-weight: 500;
} /* Labels, navigation */
.font-normal {
  font-weight: 400;
} /* Body text */
```

## Component Patterns

### Buttons

**Primary CTA:**

```tsx
<button className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl">
  Button Text
  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
</button>
```

**Secondary Button:**

```tsx
<button className="rounded-full border-2 border-blue-600 px-8 py-4 text-lg font-semibold text-blue-600 transition-all hover:bg-blue-600 hover:text-white">
  Button Text
</button>
```

**Ghost Button:**

```tsx
<button className="rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
  Button Text
</button>
```

### Cards

**Feature Card:**

```tsx
<div className="feature-card group rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200">
    <Icon className="h-6 w-6 text-blue-600" />
  </div>
  <h3 className="mt-6 text-xl font-semibold text-gray-900">Card Title</h3>
  <p className="mt-2 text-gray-600">Card description...</p>
</div>
```

**Stats Card:**

```tsx
<div className="stat-item text-center">
  <div className="text-3xl font-bold text-indigo-600">Metric</div>
  <div className="text-sm text-gray-600">Description</div>
</div>
```

### Icons

**Icon Guidelines:**

- Use Lucide React icons for consistency
- Standard sizes: `h-4 w-4` (16px), `h-5 w-5` (20px), `h-6 w-6` (24px)
- Color classes: `text-blue-600`, `text-gray-600`, `text-white`
- Hover states: `group-hover:text-blue-700`

**Common Icon Usage:**

```tsx
// Feature icons
<MessageSquare className="h-6 w-6 text-blue-600" />
<Upload className="h-6 w-6 text-green-600" />
<BarChart3 className="h-6 w-6 text-purple-600" />

// Navigation icons
<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
<CheckCircle className="h-5 w-5 text-green-500" />
```

## Layout Patterns

### Container Widths

```css
/* Page containers */
.container-sm {
  max-width: 640px;
} /* Small content */
.container-md {
  max-width: 768px;
} /* Medium content */
.container-lg {
  max-width: 1024px;
} /* Large content */
.container-xl {
  max-width: 1280px;
} /* Extra large content */
.container-2xl {
  max-width: 1536px;
} /* Maximum width */

/* Standard page wrapper */
.page-container {
  margin: 0 auto;
  max-width: 1280px;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .page-container {
    padding: 0 1.5rem;
  }
}

@media (min-width: 1024px) {
  .page-container {
    padding: 0 2rem;
  }
}
```

### Grid Systems

**Feature Grid:**

```css
/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */
.feature-grid {
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .feature-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Spacing Scale

```css
/* Consistent spacing using Tailwind scale */
.space-xs {
  margin: 0.25rem;
} /* 4px */
.space-sm {
  margin: 0.5rem;
} /* 8px */
.space-md {
  margin: 1rem;
} /* 16px */
.space-lg {
  margin: 1.5rem;
} /* 24px */
.space-xl {
  margin: 2rem;
} /* 32px */
.space-2xl {
  margin: 3rem;
} /* 48px */
.space-3xl {
  margin: 4rem;
} /* 64px */
```

## Animation Guidelines

### Motion.js Patterns

**Standard Entrance Animations:**

```typescript
// Fade in from bottom
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

// Scale in
const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 },
};

// Stagger children
const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};
```

**Hover Animations:**

```css
/* Button hover */
.btn-hover {
  transition: all 0.2s ease-in-out;
}

.btn-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* Card hover */
.card-hover {
  transition: all 0.3s ease-in-out;
}

.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}
```

## Responsive Design

### Breakpoints

```css
/* Mobile first approach */
/* xs: 0px - 639px (default) */
/* sm: 640px+ */
/* md: 768px+ */
/* lg: 1024px+ */
/* xl: 1280px+ */
/* 2xl: 1536px+ */
```

### Mobile Considerations

**Touch Targets:**

- Minimum 44px height for buttons
- Adequate spacing between interactive elements
- Thumb-friendly navigation placement

**Typography Scaling:**

```css
/* Mobile typography adjustments */
@media (max-width: 639px) {
  .hero-title {
    font-size: 2.5rem;
  }
  .section-title {
    font-size: 1.5rem;
  }
  .body-text {
    font-size: 1rem;
  }
}
```

## Accessibility Standards

### Color Contrast

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Clear focus states

### Focus States

```css
/* Standard focus ring */
.focus-ring:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Button focus */
.btn:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}
```

### Screen Reader Support

```tsx
// Proper semantic markup
<button aria-label="Close dialog">
  <X className="h-5 w-5" />
</button>

// Skip links
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

## Content Guidelines

### Voice & Tone

**Brand Voice:**

- **Professional**: Credible and trustworthy
- **Empowering**: Confident and encouraging
- **Approachable**: Friendly but not casual
- **Intelligent**: Sophisticated without being complex

**Writing Style:**

- Use active voice
- Keep sentences concise and clear
- Focus on benefits over features
- Use "you" to address users directly
- Avoid jargon and technical terms

### Messaging Hierarchy

1. **Primary Message**: AI-powered personalization for job applications
2. **Secondary Message**: Time-saving automation with professional results
3. **Supporting Messages**: Comprehensive features, industry expertise, user success

## AI Chat Interface Patterns

### Chat Interface Design

**Chat Container:**

```tsx
<div className="mb-6 flex-grow overflow-y-auto rounded-md border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-6 shadow-lg">
  {/* Chat content */}
</div>
```

**Message Bubbles:**

```tsx
// User message
<div className="mb-4 max-w-[85%] rounded-md border p-6 shadow-sm ml-auto border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100">
  <div className="mb-3 flex items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold bg-blue-600 text-white">
      U
    </div>
    <span className="font-medium text-gray-700">You</span>
  </div>
  {/* Message content */}
</div>

// AI message
<div className="mb-4 max-w-[85%] rounded-md border p-6 shadow-sm mr-auto border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
  <div className="mb-3 flex items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
      AI
    </div>
    <span className="font-medium text-gray-700">CareerCraft Studio AI</span>
  </div>
  {/* Message content */}
</div>
```

**Input Area:**

```tsx
<form className="flex items-end gap-3">
  <Textarea
    className="max-h-[30vh] min-h-[48px] flex-1 resize-none overflow-y-auto rounded-md border-2 border-blue-200 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
    placeholder="Ask about resume writing, job matching, or paste your resume or job description..."
  />
  <Button className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl">
    <Send className="h-5 w-5" />
  </Button>
</form>
```

### Panel Components

**Panel Headers:**

```tsx
<h2 className="text-2xl font-bold text-gray-900">
  Your{" "}
  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
    Skills
  </span>
</h2>
```

**Data Tables:**

```tsx
<div className="overflow-hidden rounded-md border border-blue-200 bg-white shadow-sm">
  <table className="w-full">
    <thead className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <tr>
        <th className="p-4 text-left font-semibold text-gray-900">
          Column Header
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="transition-colors hover:bg-blue-50">
        <td className="p-4">Cell content</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Empty States:**

```tsx
<div className="rounded-md border border-gray-200 bg-gray-50 p-8 text-center">
  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
    <svg
      className="h-8 w-8 text-blue-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {/* Icon path */}
    </svg>
  </div>
  <p className="font-medium text-gray-600">No items found</p>
  <p className="mt-1 text-sm text-gray-500">
    Helpful description of next steps.
  </p>
</div>
```

**Loading States:**

```tsx
<div className="flex h-64 items-center justify-center">
  <div className="text-center">
    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    <p className="text-gray-600">Loading your data...</p>
  </div>
</div>
```

**Error States:**

```tsx
<div className="rounded-md border border-red-200 bg-red-50 p-6 text-center text-red-600">
  <p className="font-semibold">Error loading data</p>
  <p className="text-sm">{error.message}</p>
</div>
```

### Interactive Elements

**Skill Cards:**

```tsx
<div className="group rounded-md border border-blue-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg">
  <div className="mb-4 flex items-start justify-between">
    <h3 className="text-lg font-semibold text-gray-900">Skill Name</h3>
    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button className="rounded-lg bg-blue-100 p-1.5 text-blue-600 hover:bg-blue-200">
        {/* Edit icon */}
      </button>
      <button className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200">
        {/* Delete icon */}
      </button>
    </div>
  </div>
  {/* Card content */}
</div>
```

**Status Badges:**

```tsx
// Proficiency levels
<span className="rounded-full border px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 border-purple-200">
  Expert
</span>
<span className="rounded-full border px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 border-blue-200">
  Advanced
</span>
<span className="rounded-full border px-3 py-1 text-xs font-medium bg-green-100 text-green-800 border-green-200">
  Intermediate
</span>
<span className="rounded-full border px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border-yellow-200">
  Beginner
</span>

// Source types
<span className="rounded-full px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800">
  Work Experience
</span>
<span className="rounded-full px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800">
  Education
</span>
```

**Form Containers:**

```tsx
<div className="rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
  <h3 className="mb-6 text-xl font-bold text-gray-900">Form Title</h3>
  {/* Form content */}
</div>
```

### Navigation & Layout

**Sidebar Design:**

```tsx
<Sidebar className="bg-gradient-to-b from-indigo-900 via-blue-900 to-slate-900 text-white">
  <SidebarHeader className="border-b border-blue-700 p-6">
    <span className="text-xl font-bold text-white">
      CareerCraft{" "}
      <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
        Studio
      </span>
    </span>
  </SidebarHeader>
  <SidebarContent className="p-4">
    <SidebarMenu className="space-y-2">
      <SidebarMenuButton className="cursor-pointer rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:bg-blue-800/50">
        Active Item
      </SidebarMenuButton>
      <SidebarMenuButton className="cursor-pointer rounded-lg px-4 py-3 font-medium text-blue-100 transition-all hover:bg-blue-800/50 hover:text-white">
        Inactive Item
      </SidebarMenuButton>
    </SidebarMenu>
  </SidebarContent>
</Sidebar>
```

**Mobile Tabs:**

```tsx
<div className="sticky right-0 bottom-0 left-0 z-20 flex h-16 w-full border-t border-blue-200 bg-white shadow-lg">
  <button className="flex-1 border-b-3 border-blue-600 bg-blue-50 py-3 text-center font-semibold text-blue-600 transition-all">
    Active Tab
  </button>
  <button className="flex-1 py-3 text-center font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900">
    Inactive Tab
  </button>
</div>
```

## Implementation Notes

### CSS Custom Properties

```css
:root {
  /* Brand colors */
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-secondary: #4f46e5;

  /* Spacing */
  --space-unit: 1rem;
  --space-xs: calc(var(--space-unit) * 0.25);
  --space-sm: calc(var(--space-unit) * 0.5);
  --space-md: var(--space-unit);
  --space-lg: calc(var(--space-unit) * 1.5);
  --space-xl: calc(var(--space-unit) * 2);

  /* Typography */
  --font-size-base: 1rem;
  --line-height-base: 1.5;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js extensions
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          // ... full color scale
          900: "#1e1b4b",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out",
        "scale-in": "scaleIn 0.5s ease-out",
      },
    },
  },
};
```

These style guidelines ensure consistent, professional, and accessible design across all CareerCraft Studio components and pages.
