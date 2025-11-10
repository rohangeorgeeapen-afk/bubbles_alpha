# Implementation Plan

This implementation plan is based on the comprehensive design document (design.md) which addresses all 16 requirement categories from the project audit. The tasks are organized into three phases following the design's architecture:

- **Phase 1: Foundation Layer** - Dependencies, environment handling, logging
- **Phase 2: Core Systems Layer** - Auth, canvas management, API security, type safety
- **Phase 3: Quality Layer** - Mobile, testing, documentation, accessibility

Each task references specific requirements from requirements.md and follows the implementation strategies defined in design.md.

## Phase 1: Foundation Layer (Week 1-2)

- [ ] 1. Fix dependency version mismatches
- [ ] 1.1 Downgrade @types/react from 19.2.2 to 18.2.x to match React 18.2.0
  - Update package.json devDependencies
  - Run npm install
  - _Requirements: 1.1, 1.2_

- [ ] 1.2 Downgrade @types/react-dom from 19.2.2 to 18.2.x to match react-dom 18.2.0
  - Update package.json devDependencies
  - Run npm install
  - _Requirements: 1.1, 1.2_

- [ ] 1.3 Upgrade Next.js from 13.5.1 to 14.2.x
  - Update package.json dependencies
  - Update next.config.js for Next.js 14 compatibility
  - Run npm install
  - Test build process
  - _Requirements: 1.3_

- [ ] 1.4 Verify Radix UI package compatibility
  - Check all @radix-ui packages work with React 18.2.0
  - Run type check: npm run typecheck
  - Fix any type errors
  - _Requirements: 1.4, 1.5_

- [ ] 2. Create environment validation system
- [ ] 2.1 Create lib/utils/env-validator.ts
  - Implement EnvironmentValidator class
  - Add validate(), getConfig(), isConfigured() methods
  - Handle missing critical vs non-critical variables
  - _Requirements: 2.1, 2.4, 2.5_

- [ ] 2.2 Modify lib/supabase-client.ts for graceful degradation
  - Use EnvironmentValidator to check configuration
  - Return null client when unconfigured instead of throwing
  - Export isSupabaseConfigured boolean
  - _Requirements: 2.1, 2.2_

- [ ] 2.3 Create configuration error page component
  - Create components/ConfigurationError.tsx
  - Display missing environment variables
  - Provide setup instructions
  - _Requirements: 2.3, 2.5_

- [ ] 2.4 Update components to handle null Supabase client
  - Update lib/contexts/auth-context.tsx
  - Update components/canvas/CanvasManager.tsx
  - Add null checks before Supabase operations
  - _Requirements: 2.1, 2.2_

- [ ] 3. Implement production logging system
- [ ] 3.1 Create lib/utils/logger.ts
  - Implement Logger class with debug, info, warn, error methods
  - Add environment detection (disabled in production)
  - Add context object support
  - _Requirements: 3.2, 3.4_

- [ ] 3.2 Replace console.log in API routes
  - Update app/api/chat/route.ts
  - Update app/auth/callback/route.ts
  - Replace all console.log with logger.debug
  - Replace all console.error with logger.error
  - _Requirements: 3.1, 3.3_

- [ ] 3.3 Replace console.log in components
  - Update components/canvas/CanvasManager.tsx
  - Update lib/contexts/auth-context.tsx
  - Search for remaining console.log statements
  - Replace all 141 instances with logger calls
  - _Requirements: 3.1, 3.3_

- [ ] 3.4 Add ESLint rule to prevent console statements
  - Update .eslintrc.json with no-console rule
  - Allow console.warn and console.error
  - Run lint to verify
  - _Requirements: 3.3, 3.4_

- [ ] 3.5 Integrate error reporting service (Sentry)
  - Create lib/utils/error-reporting.ts
  - Initialize Sentry for production
  - Configure beforeSend to filter sensitive data
  - Integrate with logger and error boundaries
  - _Requirements: 3.5_


## Phase 2: Core Systems Layer (Week 3-5)

- [ ] 4. Refactor authentication for memory safety
- [ ] 4.1 Create AuthManager class in lib/contexts/auth-context.tsx
  - Add timeoutIds Set for tracking timeouts
  - Add abortController for cancellable requests
  - Implement cleanup() method
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 4.2 Update auth context to use AuthManager
  - Track 3-second timeout in timeoutIds Set
  - Clear all timeouts in useEffect cleanup
  - Use AbortController for async operations
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 4.3 Remove direct localStorage manipulation
  - Let Supabase SSR handle session storage
  - Remove manual localStorage.setItem for auth tokens
  - Remove manual localStorage.removeItem in signOut
  - _Requirements: 4.2, 6.4_

- [ ] 4.4 Create lib/supabase-server.ts for server-side client
  - Import createServerClient from @supabase/ssr
  - Implement cookie-based session handling
  - Export createServerClient function
  - _Requirements: 6.4_

- [ ] 4.5 Add error boundary around AuthProvider
  - Create components/auth/AuthErrorBoundary.tsx
  - Wrap AuthProvider in app/layout.tsx
  - _Requirements: 4.5, 8.1, 8.2_

- [ ] 5. Implement efficient canvas state management
- [ ] 5.1 Create lib/utils/canvas-id-manager.ts
  - Implement CanvasIdManager class
  - Add createTemporary() using crypto.randomUUID()
  - Add resolveToReal(), getRealId(), isPending() methods
  - Add cleanup() for old mappings
  - _Requirements: 5.2_

- [ ] 5.2 Create lib/hooks/useCanvasSync.ts
  - Implement CanvasSyncManager class
  - Add updateQueue Map for batching
  - Implement queueUpdate() with 100ms debounce
  - Implement flush() for batch processing
  - Implement rollback() for failed updates
  - _Requirements: 5.1, 5.3_

- [ ] 5.3 Integrate CanvasIdManager with CanvasSyncManager
  - Use CanvasIdManager in CanvasSyncManager
  - Call resolveToReal() after successful saves
  - Use getRealId() when querying state
  - _Requirements: 5.2_

- [ ] 5.4 Update components/canvas/CanvasManager.tsx
  - Replace temp-${Date.now()} with idManager.createTemporary()
  - Update setCurrentCanvasId after server response
  - Use idManager.getRealId() when accessing by ID
  - Add cleanup for temp IDs in localStorage on mount
  - _Requirements: 5.1, 5.2_

- [ ] 5.5 Implement exponential backoff for polling
  - Start at 1 second interval
  - Double on each retry (2s, 4s, 8s, 16s)
  - Cap at 30 seconds maximum
  - _Requirements: 5.5_

- [ ] 5.6 Create components/canvas/CanvasErrorBoundary.tsx
  - Implement error boundary for canvas errors
  - Add fallback UI with recovery options
  - Wrap ConversationCanvas in CanvasManager
  - _Requirements: 5.4, 8.1_

- [ ] 6. Optimize canvas performance
- [ ] 6.1 Create hooks/useCanvasPanZoom.ts
  - Extract pan/zoom logic from ConversationCanvas
  - Implement throttling at 16ms (60 FPS)
  - Add memoization for viewport calculations
  - _Requirements: 9.2_

- [ ] 6.2 Create hooks/useCanvasNodes.ts
  - Extract node management logic
  - Add memoization for node positions
  - _Requirements: 9.1_

- [ ] 6.3 Create hooks/useCanvasEdges.ts
  - Extract edge management logic
  - Add memoization for edge paths
  - _Requirements: 9.1_

- [ ] 6.4 Create lib/utils/canvas-calculations.ts
  - Implement memoized node position calculations
  - Implement memoized edge path calculations
  - _Requirements: 9.1_

- [ ] 6.5 Create lib/utils/canvas-virtualization.ts
  - Implement getVisibleNodes() for viewport culling
  - Only render nodes in viewport + buffer
  - Activate for canvases with >50 nodes
  - _Requirements: 9.3_

- [ ] 6.9 Integrate performance monitoring
  - Create lib/utils/performance-monitor.ts
  - Track Core Web Vitals (LCP, FID, CLS)
  - Track canvas render times
  - Track API latency
  - Track memory usage
  - _Requirements: 9.1, 9.2_

- [ ] 6.6 Create hooks/useCanvasQueue.ts
  - Implement batched queue processing
  - Process multiple operations in single render
  - Max 16ms delay for batching
  - _Requirements: 9.4_

- [ ] 6.7 Create components/canvas/CanvasRenderer.tsx
  - Pure rendering component for canvas
  - Receives processed data from ConversationCanvas
  - Optimized for performance
  - _Requirements: 9.5_

- [ ] 6.8 Refactor components/canvas/ConversationCanvas.tsx
  - Use new hooks (useCanvasPanZoom, useCanvasNodes, useCanvasEdges, useCanvasQueue)
  - Split into modules under 500 lines each
  - Use CanvasRenderer for rendering
  - _Requirements: 9.5_

- [ ] 7. Secure API configuration
- [ ] 7.1 Remove Perplexity API code from app/api/chat/route.ts
  - Remove perplexityApiKey variable
  - Remove Perplexity API fetch logic
  - Remove mock response fallback
  - Keep only Gemini API implementation
  - _Requirements: 6.1, 6.2_

- [ ] 7.2 Add authentication check to app/api/chat/route.ts
  - Import createServerClient from lib/supabase-server
  - Check session before processing request
  - Return 401 if not authenticated
  - _Requirements: 6.5_

- [ ] 7.3 Add input validation to app/api/chat/route.ts
  - Create validateChatRequest() function
  - Check messages array exists and is valid
  - Validate message structure (role, content)
  - Enforce limits: max 50 messages, 10k chars per message
  - Return 400 with specific error messages
  - _Requirements: 6.5_

- [ ] 7.4 Sanitize error responses in app/api/chat/route.ts
  - Don't expose internal error details to client
  - Use generic error messages
  - Log detailed errors with logger
  - _Requirements: 8.2, 8.3_

- [ ] 7.5 Audit git history for committed secrets
  - Run git log commands to find .env commits
  - Use git-filter-repo or BFG to clean history if needed
  - Rotate all exposed API keys
  - _Requirements: 6.1_

- [ ] 7.6 Add pre-commit hooks to prevent secret commits
  - Create .husky/pre-commit hook
  - Check for .env files in staged changes
  - Check for potential secrets in diffs
  - _Requirements: 6.1_

- [ ] 8. Implement type-safe error handling
- [ ] 8.1 Create lib/types/canvas.ts
  - Define CanvasNode interface
  - Define CanvasEdge interface
  - Define Canvas interface
  - Replace any[] types
  - _Requirements: 7.3_

- [ ] 8.2 Create lib/utils/type-guards.ts
  - Implement isCanvasNode() type guard
  - Implement isCanvasEdge() type guard
  - Implement isApiError() type guard
  - _Requirements: 7.2_

- [ ] 8.3 Create lib/errors/index.ts
  - Implement ApiError class
  - Implement ValidationError class
  - Implement NetworkError class
  - _Requirements: 7.4_

- [ ] 8.4 Update lib/supabase-client.ts with proper types
  - Replace Canvas type with new interface
  - Remove any[] from nodes and edges
  - _Requirements: 7.1, 7.3_

- [ ] 8.5 Enable TypeScript strict mode
  - Update tsconfig.json with strict: true
  - Add all strict mode flags
  - Fix all type errors incrementally
  - _Requirements: 7.5_

- [ ] 8.6 Run migration script for existing canvas data
  - Create scripts/migrate-canvas-data.ts
  - Validate and clean all canvas nodes/edges
  - Update database with proper types
  - Log migration summary
  - _Requirements: 7.1, 7.3_

- [ ] 9. Enhance error handling
- [ ] 9.1 Enhance components/ErrorBoundary.tsx
  - Add level prop (app, page, component)
  - Add fallback render prop
  - Add onError callback
  - Implement reset functionality
  - _Requirements: 8.1, 8.2_

- [ ] 9.2 Create lib/utils/error-handler.ts
  - Implement handleAsyncOperation() wrapper
  - Implement normalizeError() function
  - Add error context tracking
  - _Requirements: 8.2, 8.5_

- [ ] 9.3 Create lib/utils/error-messages.ts
  - Implement getUserFriendlyMessage() function
  - Map status codes to user-friendly messages
  - _Requirements: 8.2, 8.3_

- [ ] 9.4 Add error boundaries at all levels
  - Add AppErrorBoundary in app/layout.tsx
  - Add PageErrorBoundary in app/page.tsx
  - Add CanvasErrorBoundary (already done in 5.6)
  - _Requirements: 8.1, 8.2_


## Phase 3: Quality and Experience Layer (Week 6-8)

- [ ] 10. Implement mobile optimizations
- [ ] 10.1 Create hooks/useTouchGestures.ts
  - Detect pan gestures
  - Detect pinch-to-zoom gestures
  - Detect tap vs drag
  - Support momentum scrolling
  - _Requirements: 10.2_

- [ ] 10.2 Create components/canvas/MobileCanvas.tsx
  - Use useMediaQuery for mobile detection
  - Enable touch-optimized controls
  - Ensure 44x44px minimum touch targets
  - _Requirements: 10.1, 10.4_

- [ ] 10.3 Add responsive breakpoints
  - Update Tailwind config for mobile layouts
  - Add collapsible sidebar for mobile
  - Implement bottom sheet controls
  - _Requirements: 10.2_

- [ ] 10.4 Test on mobile browsers
  - Test on iOS Safari
  - Test on Chrome Android
  - Verify touch interactions work
  - _Requirements: 10.5_

- [ ] 10.5 Add viewport meta tags
  - Prevent unwanted zooming
  - Lock orientation for canvas view
  - _Requirements: 10.2_

- [ ] 11. Implement comprehensive testing
- [ ] 11.1 Set up Jest configuration for Next.js 14
  - Update jest.config.js
  - Configure test environment
  - Add test utilities
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 11.2 Create Supabase test mocks
  - Mock createBrowserClient
  - Mock createServerClient
  - Mock auth methods
  - _Requirements: 11.1, 11.5_

- [ ] 11.3 Write unit tests for lib/contexts/auth-context.tsx
  - Test timeout cleanup on unmount
  - Test localStorage quota exceeded handling
  - Test race condition prevention
  - Target 80%+ coverage
  - _Requirements: 11.1_

- [ ] 11.4 Write unit tests for components/canvas/CanvasManager.tsx
  - Test debounced state updates
  - Test optimistic update rollback
  - Test temp ID replacement
  - Target 80%+ coverage
  - _Requirements: 11.2_

- [ ] 11.5 Write unit tests for lib/utils/logger.ts
  - Test environment detection
  - Test log level filtering
  - Test context object handling
  - _Requirements: 11.4_

- [ ] 11.6 Write unit tests for lib/utils/canvas-calculations.ts
  - Test memoization
  - Test position calculations
  - Test edge path calculations
  - _Requirements: 11.4_

- [ ] 11.7 Write integration tests for app/api/chat/route.ts
  - Test authentication requirement
  - Test input validation
  - Test error sanitization
  - Test Gemini API integration
  - Target 80%+ coverage
  - _Requirements: 11.3_

- [ ] 11.8 Write E2E tests for critical flows
  - Install Playwright
  - Write test for user registration and login
  - Write test for canvas creation and editing
  - Write test for conversation branching
  - _Requirements: 11.4_

- [ ] 11.9 Configure CI/CD to run tests
  - Add test script to GitHub Actions
  - Run tests on every commit
  - Add coverage reporting
  - _Requirements: 11.4_

- [ ] 12. Optimize build configuration
- [ ] 12.1 Update next.config.js with proper webpack config
  - Remove warning suppression
  - Properly externalize Supabase for server-side
  - Add comprehensive comments
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 12.2 Enable source maps for production
  - Add devtool: 'source-map' to webpack config
  - _Requirements: 12.4_

- [ ] 12.3 Implement bundle splitting strategy
  - Configure splitChunks for vendor and common bundles
  - Target <500KB main bundle, <300KB vendor bundle
  - _Requirements: 12.5_

- [ ] 12.4 Add security headers to next.config.js
  - Add X-DNS-Prefetch-Control
  - Add Strict-Transport-Security
  - Add X-Frame-Options
  - Add X-Content-Type-Options
  - Add Referrer-Policy
  - _Requirements: 12.1_

- [ ] 12.5 Monitor bundle size in CI/CD
  - Add bundle size analysis
  - Fail build if bundle exceeds targets
  - _Requirements: 12.5_

- [ ] 13. Implement code quality standards
- [ ] 13.1 Install and configure Prettier
  - Create .prettierrc
  - Create .prettierignore
  - Run Prettier on entire codebase
  - _Requirements: 13.1_

- [ ] 13.2 Extract magic numbers to constants
  - Create lib/constants/timeouts.ts
  - Create lib/constants/canvas.ts
  - Replace all magic numbers (3000ms, 50ms, etc.)
  - _Requirements: 13.2_

- [ ] 13.3 Extract duplicate logic to utilities
  - Create lib/utils/canvas-validators.ts
  - Implement validateCanvas() function
  - Implement validateCanvasNode() function
  - _Requirements: 13.3_

- [ ] 13.4 Refactor long functions
  - Identify functions >50 lines
  - Break down into smaller functions
  - _Requirements: 13.4_

- [ ] 13.5 Set up Husky for pre-commit hooks
  - Install Husky
  - Configure lint-staged
  - Add format and lint to pre-commit
  - _Requirements: 13.5_

- [ ] 14. Add comprehensive documentation
- [ ] 14.1 Add JSDoc comments to all exported functions
  - Document lib/utils/ functions
  - Document lib/hooks/ hooks
  - Document components/ components
  - _Requirements: 14.1_

- [ ] 14.2 Create README files for major directories
  - Create components/README.md
  - Create components/canvas/README.md
  - Create lib/README.md
  - Create app/api/README.md
  - _Requirements: 14.3_

- [ ] 14.3 Update .env.example with detailed descriptions
  - Add comments for each variable
  - Add links to get API keys
  - Add security warnings
  - Include SUPABASE_SERVICE_ROLE_KEY for migrations
  - _Requirements: 14.4_

- [ ] 14.4 Document complex algorithms
  - Add inline comments for canvas calculations
  - Add inline comments for sync logic
  - _Requirements: 14.2_

- [ ] 15. Implement accessibility features
- [ ] 15.1 Add ARIA labels to interactive elements
  - Update components/canvas/ConversationNode.tsx
  - Update components/canvas/CanvasManager.tsx
  - Add role, aria-label, aria-selected attributes
  - _Requirements: 15.1_

- [ ] 15.2 Create hooks/useKeyboardNavigation.ts
  - Handle Tab for node navigation
  - Handle Arrow keys for canvas panning
  - Handle Enter for node activation
  - Handle Escape for deselection
  - Handle Ctrl/Cmd+N for new canvas
  - _Requirements: 15.2_

- [ ] 15.3 Update color palette for WCAG AA compliance
  - Update tailwind.config.ts colors
  - Ensure 4.5:1 contrast ratio for text
  - Verify accent colors meet standards
  - _Requirements: 15.3_

- [ ] 15.4 Create components/shared/LiveRegion.tsx
  - Implement screen reader announcements
  - Add aria-live="polite" region
  - _Requirements: 15.4_

- [ ] 15.5 Create hooks/useFocusManagement.ts
  - Implement focus trapping for modals
  - Implement focus restoration
  - _Requirements: 15.5_

- [ ] 15.6 Run automated accessibility tests
  - Install jest-axe
  - Write accessibility tests for canvas
  - Write accessibility tests for auth modal
  - _Requirements: 15.7_

- [ ] 15.7 Manual testing with screen readers
  - Test with NVDA on Windows
  - Test with VoiceOver on macOS
  - _Requirements: 15.8_

- [ ] 16. Configure comprehensive ESLint
- [ ] 16.1 Install ESLint plugins
  - Install @typescript-eslint/eslint-plugin
  - Install @typescript-eslint/parser
  - Install eslint-plugin-react
  - Install eslint-plugin-react-hooks
  - Install eslint-plugin-jsx-a11y
  - _Requirements: 16.1, 16.2, 16.3_

- [ ] 16.2 Update .eslintrc.json with comprehensive rules
  - Add TypeScript rules
  - Add React rules
  - Add React Hooks rules
  - Add accessibility rules
  - Add code quality rules
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [ ] 16.3 Run ESLint and fix all errors
  - Run npm run lint:strict
  - Fix all errors incrementally
  - _Requirements: 16.4_

- [ ] 16.4 Add ESLint to CI/CD pipeline
  - Add lint check to GitHub Actions
  - Fail build on lint errors
  - _Requirements: 16.5_

- [ ] 16.5 Configure IDE integration
  - Add ESLint extension recommendations
  - Configure auto-fix on save
  - _Requirements: 16.5_

## Future Enhancements (Not in Current Scope)

The following components from the design document are planned for future iterations:

- **CacheManager** (lib/utils/cache-manager.ts) - Client-side caching for canvas data
- **FeatureFlags** (lib/utils/feature-flags.ts) - Gradual feature rollout system
- **i18n System** - Internationalization support
- **API Versioning** - Version headers for API routes

These are documented in the design but not included in the current implementation plan to focus on core functionality and critical fixes.

## Post-Implementation

- [ ] 17. Final verification and deployment
- [ ] 17.1 Run full test suite
  - Verify 80%+ coverage achieved
  - All tests passing
  - _Requirements: All_

- [ ] 17.2 Run type check
  - npm run typecheck
  - Zero type errors
  - _Requirements: 1.5, 7.5_

- [ ] 17.3 Run lint check
  - npm run lint:strict
  - Zero errors and warnings
  - _Requirements: 16.4_

- [ ] 17.4 Build for production
  - npm run build
  - Verify bundle sizes meet targets
  - _Requirements: 12.5_

- [ ] 17.5 Deploy to staging
  - Run migration script
  - Test all critical flows
  - Monitor for errors
  - _Requirements: All_

- [ ] 17.6 Deploy to production
  - Gradual rollout (10% → 50% → 100%)
  - Monitor error rates
  - Monitor performance metrics
  - _Requirements: All_

- [ ] 17.7 Post-deployment monitoring
  - Monitor for 48 hours
  - Address any issues immediately
  - Document lessons learned
  - _Requirements: All_
