# 🎨 Design Guidelines - International Conference Website

## Overview
คู่มือการออกแบบนี้จัดทำขึ้นเพื่อให้การพัฒนาเว็บไซต์การประชุมนานาชาติมีความสอดคล้องและสวยงาม โดยเน้นความเป็นมืออาชีพและการใช้งานที่ง่าย

## 🎯 Design Principles

### 1. Academic Excellence (ความเป็นเลิศทางวิชาการ)
- ใช้สีและฟอนต์ที่สื่อถึงความเป็นมืออาชีพ
- เน้นความชัดเจนและอ่านง่าย
- ใช้ white space อย่างเหมาะสม

### 2. International Appeal (ความเป็นสากล)
- รองรับหลายภาษา
- ใช้สัญลักษณ์และไอคอนที่เข้าใจได้สากล
- คำนึงถึงความแตกต่างทางวัฒนธรรม

### 3. User-Centered Design (การออกแบบที่เน้นผู้ใช้)
- Navigation ที่ชัดเจนและใช้งานง่าย
- Responsive design สำหรับทุกอุปกรณ์
- Accessibility สำหรับผู้ใช้ทุกกลุ่ม

## 🎨 Visual Identity

### Color Palette

#### Primary Colors
```css
/* Academic Blue - ความเป็นมืออาชีพ */
--primary-main: #1565C0;
--primary-light: #42A5F5;
--primary-dark: #0D47A1;

/* Academic Gold - ความเป็นเลิศ */
--secondary-main: #FF6F00;
--secondary-light: #FFB74D;
--secondary-dark: #E65100;
```

#### Semantic Colors
```css
/* Success - การดำเนินการสำเร็จ */
--success: #2E7D32;
--success-light: #4CAF50;
--success-dark: #1B5E20;

/* Warning - การแจ้งเตือน */
--warning: #F57C00;
--warning-light: #FF9800;
--warning-dark: #E65100;

/* Error - ข้อผิดพลาด */
--error: #D32F2F;
--error-light: #F44336;
--error-dark: #B71C1C;

/* Info - ข้อมูล */
--info: #1976D2;
--info-light: #2196F3;
--info-dark: #0D47A1;
```

#### Neutral Colors
```css
/* Text Colors */
--text-primary: #212121;
--text-secondary: #757575;
--text-disabled: #BDBDBD;

/* Background Colors */
--background-default: #FAFAFA;
--background-paper: #FFFFFF;
--background-light: #F5F5F5;

/* Border Colors */
--border-light: #E0E0E0;
--border-medium: #BDBDBD;
--border-dark: #757575;
```

### Typography

#### Font Families
```css
/* Primary Font - สำหรับหัวข้อและเนื้อหาสำคัญ */
font-family: 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;

/* Secondary Font - สำหรับเนื้อหาทั่วไป */
font-family: 'Source Sans Pro', 'Open Sans', sans-serif;

/* Academic Font - สำหรับเนื้อหาทางวิชาการ */
font-family: 'Crimson Text', 'Times New Roman', serif;

/* Monospace Font - สำหรับโค้ดและข้อมูลเทคนิค */
font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
```

#### Font Scale
```css
/* Heading Sizes */
h1: 2.25rem (36px) - Page titles
h2: 1.875rem (30px) - Section headers
h3: 1.5rem (24px) - Subsection headers
h4: 1.25rem (20px) - Component titles
h5: 1.125rem (18px) - Small headers
h6: 1rem (16px) - Labels

/* Body Sizes */
body1: 1rem (16px) - Main content
body2: 0.875rem (14px) - Secondary content
caption: 0.75rem (12px) - Captions and labels
overline: 0.75rem (12px) - Overline text
```

## 📐 Layout System

### Grid System
- **Container Max Width**: 1200px
- **Columns**: 12-column grid
- **Gutter**: 24px
- **Margins**: 16px (mobile), 24px (tablet), 32px (desktop)

### Spacing Scale
```css
/* Base unit: 8px */
--spacing-xs: 4px;   /* 0.25rem */
--spacing-sm: 8px;   /* 0.5rem */
--spacing-md: 16px;  /* 1rem */
--spacing-lg: 24px;  /* 1.5rem */
--spacing-xl: 32px;  /* 2rem */
--spacing-2xl: 48px; /* 3rem */
--spacing-3xl: 64px; /* 4rem */
```

### Breakpoints
```css
/* Mobile First Approach */
xs: 0px      /* Extra small devices */
sm: 600px    /* Small devices */
md: 900px    /* Medium devices */
lg: 1200px   /* Large devices */
xl: 1536px   /* Extra large devices */
```

## 🎭 Component Design

### Cards
- **Border Radius**: 8px
- **Elevation**: 1-4 levels
- **Padding**: 24px
- **Hover Effect**: Subtle lift with shadow

### Buttons
- **Primary**: Filled with primary color
- **Secondary**: Outlined with secondary color
- **Text**: Text-only for less important actions
- **Border Radius**: 4px
- **Height**: 36px (small), 40px (medium), 48px (large)

### Form Elements
- **Input Height**: 56px
- **Border Radius**: 4px
- **Focus State**: Primary color outline
- **Error State**: Red outline with error message
- **Label**: Floating label design

### Navigation
- **Header Height**: 64px
- **Sidebar Width**: 280px
- **Menu Item Height**: 48px
- **Active State**: Primary color background

## 🖼️ Image Guidelines

### Image Sizes
```css
/* Avatar Sizes */
avatar-small: 32px × 32px
avatar-medium: 40px × 40px
avatar-large: 56px × 56px

/* Thumbnail Sizes */
thumbnail: 150px × 150px
card-image: 300px × 200px

/* Banner Sizes */
page-banner: 1200px × 400px
hero-banner: 1920px × 800px

/* Logo Sizes */
logo-small: 120px × 40px
logo-medium: 200px × 60px
logo-large: 300px × 90px
```

### Image Optimization
- **Format**: WebP (primary), JPEG (fallback)
- **Quality**: 80% for standard images, 90% for hero images
- **Compression**: Enable for files > 1MB
- **Lazy Loading**: Enable for all images below the fold

## 🎬 Animation Guidelines

### Timing
```css
/* Duration */
fast: 150ms      /* Micro-interactions */
normal: 300ms    /* Standard transitions */
slow: 500ms      /* Complex animations */

/* Easing */
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
ease-out: cubic-bezier(0.0, 0, 0.2, 1)
ease-in: cubic-bezier(0.4, 0, 1, 1)
```

### Animation Types
- **Hover Effects**: Subtle scale or color change
- **Loading States**: Skeleton screens or spinners
- **Page Transitions**: Fade or slide effects
- **Micro-interactions**: Button press feedback

## 📱 Responsive Design

### Mobile (< 600px)
- **Single column layout**
- **Touch-friendly buttons** (min 44px)
- **Simplified navigation** (hamburger menu)
- **Larger text** for readability

### Tablet (600px - 900px)
- **Two-column layout** where appropriate
- **Sidebar navigation** for landscape
- **Optimized touch targets**

### Desktop (> 900px)
- **Multi-column layouts**
- **Hover states** for interactive elements
- **Keyboard navigation** support
- **Dense information display**

## ♿ Accessibility Guidelines

### Color Contrast
- **Normal Text**: 4.5:1 minimum ratio
- **Large Text**: 3:1 minimum ratio
- **UI Elements**: 3:1 minimum ratio

### Focus Management
- **Visible Focus**: Clear outline on focused elements
- **Tab Order**: Logical keyboard navigation
- **Skip Links**: For main content areas

### Screen Reader Support
- **Alt Text**: Descriptive for all images
- **ARIA Labels**: For complex interactions
- **Semantic HTML**: Proper heading hierarchy

## 🎨 Icon System

### Icon Library
- **Primary**: Material Design Icons
- **Style**: Outlined (primary), Filled (emphasis)
- **Sizes**: 16px, 20px, 24px, 32px, 48px
- **Colors**: Inherit from parent or semantic colors

### Usage Guidelines
- **Consistency**: Use same style throughout
- **Recognition**: Choose familiar icons
- **Context**: Pair with text labels when needed

## 🌐 Internationalization

### Text Handling
- **RTL Support**: For Arabic, Hebrew languages
- **Font Loading**: Subset fonts for performance
- **Text Expansion**: Allow 30% more space for translations

### Cultural Considerations
- **Color Meanings**: Avoid culturally sensitive colors
- **Image Content**: Use diverse, inclusive imagery
- **Date/Time Formats**: Localized formatting

## 📊 Performance Guidelines

### Loading Performance
- **Critical CSS**: Inline above-the-fold styles
- **Font Loading**: Use font-display: swap
- **Image Optimization**: Responsive images with srcset

### Runtime Performance
- **Smooth Animations**: 60fps target
- **Interaction Response**: < 100ms for immediate feedback
- **Page Transitions**: < 300ms for navigation

## 🔧 Implementation Tools

### CSS Framework
- **Material-UI (MUI)**: Primary component library
- **Emotion**: CSS-in-JS styling
- **Custom Theme**: Extended MUI theme

### Design Tokens
- **Colors**: Centralized color palette
- **Typography**: Consistent font scales
- **Spacing**: Systematic spacing units

### Development Workflow
- **Storybook**: Component documentation
- **Design System**: Shared component library
- **Style Guide**: Living documentation

## 📋 Checklist

### Before Implementation
- [ ] Review design specifications
- [ ] Confirm color accessibility
- [ ] Test responsive breakpoints
- [ ] Validate with stakeholders

### During Development
- [ ] Follow naming conventions
- [ ] Implement responsive design
- [ ] Add proper ARIA labels
- [ ] Test keyboard navigation

### Before Launch
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] User testing feedback

---

## 🎯 Key Takeaways

1. **Consistency is Key**: ใช้ design system อย่างสม่ำเสมอ
2. **User First**: คำนึงถึงผู้ใช้เป็นหลัก
3. **Performance Matters**: ความเร็วส่งผลต่อ user experience
4. **Accessibility**: ออกแบบให้ทุกคนใช้งานได้
5. **International Ready**: เตรียมพร้อมสำหรับผู้ใช้ทั่วโลก

การปฏิบัติตามแนวทางเหล่านี้จะช่วยให้เว็บไซต์การประชุมนานาชาติมีความสวยงาม ใช้งานง่าย และเป็นมืออาชีพ 🚀