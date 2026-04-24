# Changelog

## New Features & Improvements

### UI/UX Enhancements
- **Sidebar Canvas List**: Adjusted canvas name display size for better readability
- **Logout Confirmation**: Added confirmation dialog when signing out to prevent accidental logouts
- **New Canvas Button**: Improved animation effects for better visual feedback
- **Canvas Name Truncation**: Canvas names are now truncated to 30 characters to prevent UI bugs and overflow issues

### Bug Fixes & Stability
- **Data Validation**: Added robust validation for canvas data to handle corrupted entries gracefully
- **Error Handling**: Improved error handling in canvas loading to prevent app crashes
- **Auth Flow**: Enhanced authentication flow with better timeout handling
- **Supabase Client**: Added PKCE flow for improved OAuth security

### Technical Improvements
- **Code Cleanup**: Removed debug logging and unnecessary console statements
- **Performance**: Optimized canvas loading and rendering logic
- **Error Boundaries**: Added error boundary component for better error handling

## Files Changed

### Modified
- `components/layout/Sidebar.tsx` - Canvas name truncation, logout confirmation dialog
- `components/canvas/CanvasManager.tsx` - Data validation, error handling
- `lib/contexts/auth-context.tsx` - Improved auth flow
- `lib/supabase-client.ts` - Added PKCE flow configuration
- `components/canvas/ConversationCanvas.tsx` - Removed debug code

### Added
- `components/ErrorBoundary.tsx` - Error boundary for catching React errors

## Breaking Changes
None

## Migration Notes
No migration required. All changes are backward compatible.
