# Shadcn/UI Integration Summary

## What Changed

The AtmosphereConf viewer now uses **shadcn/ui** components with a custom color theme and dark mode support!

### Color Scheme

#### Light Mode
- **Primary**: `#3F97FF` - Main blue highlight color
- **Secondary**: `#F0F7FF` - Pale blue for backgrounds and secondary buttons
- **Background**: White
- **Text**: Dark gray/black

#### Dark Mode
- **Primary**: `#3F97FF` - Same blue (maintains brand consistency)
- **Secondary**: Darker blue tones for better contrast
- **Background**: Dark blue-gray
- **Text**: White

### Features

✅ **System Theme Detection**: Automatically picks up your OS theme preference
✅ **Manual Theme Toggle**: Button in the header to switch between Light/Dark/System
✅ **Custom Brand Colors**: Uses your specified #3F97FF and #F0F7FF colors
✅ **Shadcn Components**: Button, Card, ScrollArea, and more
✅ **Smooth Transitions**: Theme changes are instant and smooth
✅ **Accessible**: Proper contrast ratios in both modes

### Theme Toggle

Located in the top-right of the header, the theme toggle cycles through:
1. **Light** - Force light mode
2. **Dark** - Force dark mode  
3. **System** - Follow OS preference (default)

The chosen theme is persisted in localStorage.

### Components Updated

All components now use shadcn/ui:

- **GridLayout**: Uses Card components with proper theming
- **StreamPlayer**: Uses Button and themed loading states
- **BlueskyFeed**: Uses ScrollArea, Button components
- **PostCard**: Uses Button with icons from lucide-react
- **ThemeToggle**: New component for switching themes

### New Dependencies

```json
{
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-scroll-area": "^1.0.5",
  "@radix-ui/react-slot": "^1.0.2",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "lucide-react": "^0.344.0",
  "tailwind-merge": "^2.2.1",
  "tailwindcss-animate": "^1.0.7"
}
```

### File Structure

```
src/
├── components/
│   ├── ui/                       # shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── scroll-area.tsx
│   ├── theme-provider.tsx        # Theme context
│   └── theme-toggle.tsx          # Theme switcher button
├── lib/
│   └── utils.ts                  # cn() utility for className merging
```

### Testing

To see the theme in action:

1. Run `npm install` to get new dependencies
2. Run `npm run dev`
3. Click the theme toggle in the top-right corner
4. Try Light/Dark/System modes
5. Resize your window to see responsive behavior
6. Check that colors match the brand (#3F97FF, #F0F7FF)

### Customizing Colors

To adjust colors, edit `src/App.css` in the `:root` and `.dark` sections. The HSL values are defined using CSS variables.

For example, to change the primary blue:
```css
:root {
  --primary: 209 100% 62%; /* #3F97FF */
}
```
