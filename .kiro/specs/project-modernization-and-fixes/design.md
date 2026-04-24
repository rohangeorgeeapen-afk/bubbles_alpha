# Design Document: Project Modernization and Fixes

## Overview

This design addresses 16 categories of issues identified in the conversation canvas application audit. The solution is structured into three major phases: Foundation (dependencies, environment, logging), Core Systems (auth, canvas, security), and Quality (testing, documentation, accessibility). Each phase builds upon the previous, ensuring a stable foundation before tackling complex architectural changes.

### Design Principles

1. **Incremental Safety**: Changes are applied incrementally with rollback capabilities
2. **Backward Compatibility**: Existing user data and sessions remain functional throughout migration
3. **Performance First**: Optimizations are measured and validated before deployment
4. **Type Safety**: Strict TypeScript enforcement catches errors at compile time
5. **Developer Experience**: Clear error messages and comprehensive documentation

## Architecture

### Phase 1: Foundation Layer

The foundation layer establishes a stable base by resolving dependency conflicts, implementing graceful environment handling, and removing debug code.

#### Dependency Resolution Strategy

**Problem**: React 18.2.0 with @types/react 19.2.2 creates type mismatches; Next.js 13.5.1 is outdated.

**Solution**: Align type definitions with runtime versions, then upgrade framework incrementally.

```
Current State:
- react: 18.2.0
- @types/react: 19.2.2 (MISMATCH)
- next: 13.5.1 (OUTDATED)

Target State:
- react: 18.2.0 (keep stable)
- @types/react: 18.2.0 (align)
- next: 14.2.x (upgrade with compatibility)
```

**Migration Path**:
1. Downgrade @types/react and @types/react-dom to 18.2.x
2. Verify all Radix UI packages work with React 18.2.0
3. Upgrade Next.js from 13.5.1 to 14.2.x (LTS)
4. Run full type check and fix any breaking changes
5. Update next.config.js for Next.js 14 compatibility


#### Environment Variable Handling

**Problem**: lib/supabase-client.ts throws errors immediately if env vars missing, crashing the app.

**Solution**: Implement graceful degradation with clear user feedback.

**Architecture**:
```typescript
// New: lib/utils/env-validator.ts
interface EnvConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  geminiApiKey?: string;
}

class EnvironmentValidator {
  validate(): { valid: boolean; missing: string[]; mode: 'full' | 'degraded' | 'error' }
  getConfig(): EnvConfig
  isConfigured(service: 'supabase' | 'gemini'): boolean
}
```

**Implementation Strategy**:
1. Create centralized environment validator
2. Modify lib/supabase-client.ts to return null client when unconfigured
3. Add configuration error page component
4. Update components to handle null Supabase client gracefully
5. Display actionable setup instructions to developers

**User Experience**:
- Missing non-critical vars: Warning in console, app continues
- Missing critical vars: Configuration page with setup instructions
- All vars present: Normal operation

#### Production Logging System

**Problem**: 141 console.log statements throughout codebase.

**Solution**: Environment-aware logging utility that's stripped in production.

**Architecture**:
```typescript
// New: lib/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  debug(message: string, context?: object): void
  info(message: string, context?: object): void
  warn(message: string, context?: object): void
  error(message: string, error?: Error, context?: object): void
}

// Automatically disabled in production
const logger = new Logger({ enabled: process.env.NODE_ENV !== 'production' });
```

**Files Requiring Logger Replacement**:
- app/api/chat/route.ts (console.log, console.error)
- app/auth/callback/route.ts (console.log, console.error)
- components/canvas/CanvasManager.tsx (extensive console.log usage)
- lib/contexts/auth-context.tsx (console.error)
- All other component files with debug logging

**Implementation Strategy**:
1. Create logger utility with environment detection
2. Search and replace all console.log with logger.debug
3. Replace console.error with logger.error
4. Update API routes to use logger
5. Add ESLint rule to prevent new console statements
6. Integrate with error reporting service for production errors


### Phase 2: Core Systems Layer

The core systems layer refactors authentication, canvas management, and security to eliminate memory leaks, improve performance, and protect sensitive data.

#### Memory-Safe Authentication

**Problem**: lib/contexts/auth-context.tsx has uncleaned 3-second timeout, race conditions, and unsafe localStorage access.

**Solution**: Implement proper cleanup, error boundaries, and safe storage access.

**Architecture Changes**:
```typescript
// Enhanced auth-context.tsx
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

class AuthManager {
  private timeoutIds: Set<NodeJS.Timeout> = new Set();
  private abortController: AbortController | null = null;
  
  cleanup(): void {
    // Cancel all timeouts
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds.clear();
    
    // Abort pending requests
    this.abortController?.abort();
  }
  
  safeLocalStorageAccess(key: string, value?: string): string | null {
    try {
      if (value !== undefined) {
        localStorage.setItem(key, value);
      }
      return localStorage.getItem(key);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Handle quota exceeded
        return null;
      }
      throw e;
    }
  }
}
```

**Implementation Strategy**:
1. Create AuthManager class to centralize cleanup logic
2. Track all timeout IDs in a Set for batch cleanup
3. Use AbortController for cancellable async operations
4. Remove direct localStorage manipulation - let Supabase SSR handle sessions
5. Add error boundary around AuthProvider
6. Implement useEffect cleanup that calls AuthManager.cleanup()
7. Create lib/supabase-server.ts for server-side Supabase client
8. Update middleware to use Supabase SSR cookie handling

**Important Note on Supabase SSR**:
The application already uses `@supabase/ssr` package. We should leverage its built-in cookie-based session management rather than implementing custom localStorage handling. The current auth-context.tsx has manual localStorage operations that conflict with Supabase SSR's automatic session management.


#### Efficient Canvas State Management

**Problem**: components/canvas/CanvasManager.tsx has unthrottled polling, temp IDs causing sync issues, no error boundaries, and missing rollback for optimistic updates.

**Solution**: Implement debouncing, proper ID management, error boundaries, and rollback mechanisms.

**Architecture**:
```typescript
// New: lib/hooks/useCanvasSync.ts
interface CanvasSyncOptions {
  debounceMs: number;
  maxRetries: number;
  backoffMultiplier: number;
}

class CanvasSyncManager {
  private updateQueue: Map<string, CanvasUpdate> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  private retryCount: Map<string, number> = new Map();
  
  queueUpdate(canvasId: string, update: CanvasUpdate): void
  flush(): Promise<void>
  rollback(canvasId: string): void
}

// New: components/canvas/CanvasErrorBoundary.tsx
class CanvasErrorBoundary extends React.Component {
  // Catches canvas rendering errors without crashing app
}
```

**Temporary ID Management**:
```typescript
// New: lib/utils/canvas-id-manager.ts
export class CanvasIdManager {
  private pendingIds: Map<string, Promise<string>> = new Map();
  private idMappings: Map<string, string> = new Map(); // temp -> real
  
  /**
   * Creates a temporary ID for optimistic updates
   */
  createTemporary(): string {
    return `temp-${crypto.randomUUID()}`;
  }
  
  /**
   * Resolves a temporary ID to a real ID from the server
   * Updates all internal mappings
   */
  async resolveToReal(tempId: string, realId: string): Promise<void> {
    this.idMappings.set(tempId, realId);
    this.pendingIds.delete(tempId);
  }
  
  /**
   * Gets the real ID for a temp ID, or returns the ID if already real
   */
  getRealId(id: string): string {
    return this.idMappings.get(id) || id;
  }
  
  /**
   * Checks if an ID is still pending resolution
   */
  isPending(id: string): boolean {
    return id.startsWith('temp-') && !this.idMappings.has(id);
  }
  
  /**
   * Clears resolved mappings older than 5 minutes
   */
  cleanup(): void {
    // Remove old mappings to prevent memory leaks
    // Keep only recent mappings for potential retries
  }
}

// Usage in CanvasManager:
const idManager = new CanvasIdManager();

// When creating a canvas:
const tempId = idManager.createTemporary();
setCurrentCanvasId(tempId);

// After server responds:
await idManager.resolveToReal(tempId, serverCanvas.id);
setCurrentCanvasId(serverCanvas.id);
```

**Implementation Strategy**:
1. Create CanvasIdManager for temp ID management
2. Create CanvasSyncManager with debounced updates (100ms)
3. Integrate CanvasIdManager with CanvasSyncManager:
   - CanvasSyncManager uses CanvasIdManager.createTemporary()
   - After successful save, calls CanvasIdManager.resolveToReal()
   - Uses CanvasIdManager.getRealId() when querying state
4. Update CanvasManager.tsx to use CanvasIdManager:
   - Replace `temp-${Date.now()}` with `idManager.createTemporary()`
   - Update setCurrentCanvasId after server response
   - Use idManager.getRealId() when accessing canvas by ID
5. Implement exponential backoff for polling (1s → 2s → 4s → max 30s)
6. Add CanvasErrorBoundary wrapper around ConversationCanvas
7. Implement rollback queue that stores previous state
8. Add optimistic update tracking with automatic rollback on failure

**Performance Optimizations**:
- Debounce state updates: 100ms
- Throttle render updates: 60 FPS (16ms)
- Batch database writes: Queue multiple updates
- Memoize expensive calculations: Use React.useMemo for node positions


#### Canvas Performance Optimization

**Problem**: components/canvas/ConversationCanvas.tsx is 1000+ lines with unoptimized pan/zoom calculations and no memoization.

**Solution**: Refactor into focused modules, optimize calculations, implement virtualization.

**Module Structure**:
```
components/canvas/
├── ConversationCanvas.tsx (main orchestrator, <300 lines)
├── hooks/
│   ├── useCanvasPanZoom.ts (pan/zoom logic)
│   ├── useCanvasNodes.ts (node management)
│   ├── useCanvasEdges.ts (edge management)
│   └── useCanvasQueue.ts (operation queue)
├── utils/
│   ├── canvas-calculations.ts (memoized math)
│   ├── canvas-virtualization.ts (viewport culling)
│   └── canvas-layout.ts (node positioning)
└── CanvasRenderer.tsx (pure rendering component)
```

**Optimization Strategies**:

1. **Memoized Calculations**:
```typescript
// lib/utils/canvas-calculations.ts
const memoizedNodePosition = memoize((nodeId: string, nodes: Node[]) => {
  // Expensive position calculation
});

const memoizedEdgePath = memoize((edge: Edge, nodes: Node[]) => {
  // Expensive path calculation
});
```

2. **Throttled Pan/Zoom**:
```typescript
// hooks/useCanvasPanZoom.ts
const throttledPan = useThrottle((dx: number, dy: number) => {
  updateViewport(dx, dy);
}, 16); // 60 FPS
```

3. **Virtualization** (for >50 nodes):
```typescript
// utils/canvas-virtualization.ts
function getVisibleNodes(viewport: Viewport, allNodes: Node[]): Node[] {
  // Only render nodes in viewport + buffer
  return allNodes.filter(node => isInViewport(node, viewport));
}
```

4. **Batched Queue Processing**:
```typescript
// hooks/useCanvasQueue.ts
const processQueue = useBatchedUpdates((operations: Operation[]) => {
  // Process multiple operations in single render
}, 16); // Max 16ms delay
```

**Implementation Strategy**:
1. Extract pan/zoom logic into useCanvasPanZoom hook
2. Extract node management into useCanvasNodes hook
3. Create memoized calculation utilities
4. Implement viewport-based virtualization
5. Add performance monitoring to measure improvements
6. Split ConversationCanvas.tsx into smaller modules


#### Secure Client Configuration

**Problem**: GEMINI_API_KEY is server-side but needs additional security measures. Previous security incident with committed keys to git. localStorage used for sensitive data without encryption, no authentication on API routes.

**Solution**: Add authentication to existing chat API, implement proper error handling, enhance Supabase SSR session management, add security audit.

**Current State Analysis**:
- app/api/chat/route.ts exists with GEMINI_API_KEY (server-side ✓)
- Uses OpenAI-compatible endpoint: `generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- Has Perplexity API fallback code (needs removal)
- Falls back to mock responses if no API key
- Has exponential backoff retry logic for rate limits (good!)
- **Missing**: Authentication check
- **Missing**: Proper input validation
- **Issue**: Uses console.log/console.error (should use logger)
- **Issue**: Exposes detailed error messages to client

**Architecture**:
```
Client                    Server API Route                    Gemini API
  │                            │                                  │
  │  POST /api/chat            │                                  │
  ├──────────────────────────>│                                  │
  │  { messages }              │  1. Auth check                   │
  │                            │  2. Input validation             │
  │                            │  3. Use GEMINI_API_KEY           │
  │                            ├────────────────────────────────>│
  │                            │  generativelanguage.googleapis   │
  │                            │  .com/v1beta/openai/chat/        │
  │                            │  completions                     │
  │                            │<─────────────────────────────────│
  │<───────────────────────────│                                  │
  │  { response }              │                                  │
```

**Enhanced API Route**:
```typescript
// app/api/chat/route.ts (enhanced)
import { createServerClient } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logger.warn('Unauthorized chat request', { identifier });
      return NextResponse.json(
        { error: 'Please sign in to use chat' },
        { status: 401 }
      );
    }
    
    // 2. Input validation
    const body = await request.json();
    const validationError = validateChatRequest(body);
    if (validationError) {
      logger.warn('Invalid chat request', { error: validationError });
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }
    
    const { messages } = body;
    
    // 3. Check API key configuration
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      logger.error('GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }
    
    // 4. Call Gemini API with retry logic (keep existing fetchWithRetry)
    const response = await fetchWithRetry(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${geminiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: messages,
          temperature: 0.7,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      logger.error('Gemini API error', { 
        status: response.status, 
        error: errorData 
      });
      
      // Don't expose detailed errors to client
      return NextResponse.json(
        { error: 'Failed to get AI response. Please try again.' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({ 
      response: data.choices[0].message.content 
    });
    
  } catch (error) {
    logger.error('Chat API error', { error });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Input validation helper
function validateChatRequest(body: any): string | null {
  if (!body.messages || !Array.isArray(body.messages)) {
    return 'Messages array is required';
  }
  
  if (body.messages.length === 0) {
    return 'At least one message is required';
  }
  
  if (body.messages.length > 50) {
    return 'Too many messages (max 50)';
  }
  
  for (const msg of body.messages) {
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      return 'Invalid message role';
    }
    if (!msg.content || typeof msg.content !== 'string') {
      return 'Invalid message content';
    }
    if (msg.content.length > 10000) {
      return 'Message too long (max 10000 characters)';
    }
  }
  
  return null;
}
```

**Changes from Current Implementation**:
1. **Remove Perplexity API code** - Keep only Gemini
2. **Remove mock response fallback** - Require API key to be configured
3. **Add authentication** - Check Supabase session before processing
4. **Enhance input validation** - Check message structure, length limits
5. **Replace console.log** - Use logger utility
6. **Sanitize errors** - Don't expose internal details to client
7. **Keep retry logic** - Existing fetchWithRetry is good
```



**Secure Token Storage with Supabase SSR**:
```typescript
// lib/supabase-server.ts (new file for server-side Supabase)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

**Security Audit for Git History**:
```bash
# Check for accidentally committed secrets
git log --all --full-history -- .env
git log --all --full-history -- .env.local

# If found, use git-filter-repo or BFG Repo-Cleaner to remove
# Then rotate all exposed keys immediately
```

**Implementation Strategy**:
1. Verify GEMINI_API_KEY is server-side only (already done ✓)
2. Remove Perplexity API code from app/api/chat/route.ts
3. Create lib/supabase-server.ts for server-side Supabase client
4. Add authentication check to chat API route using server client
5. Add comprehensive input validation function
6. Replace console.log/error with logger utility
7. Audit git history for accidentally committed secrets
8. Add pre-commit hooks to prevent future secret commits
9. Document API key rotation procedure

**Note**: No middleware.ts exists currently. Supabase SSR will be integrated directly in API routes and server components.


#### Type-Safe Error Handling

**Problem**: Frequent 'any' types (canvas.nodes: any[]), missing type guards, loose error handling.

**Solution**: Enable strict mode, define explicit types, implement type guards.

**Type Definitions**:
```typescript
// lib/types/canvas.ts
export interface CanvasNode {
  id: string;
  type: 'conversation' | 'response' | 'branch';
  position: { x: number; y: number };
  data: {
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type: 'default' | 'branch';
  animated?: boolean;
}

export interface Canvas {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  nodes: CanvasNode[];  // No more any[]
  edges: CanvasEdge[];  // No more any[]
}
```

**Type Guards**:
```typescript
// lib/utils/type-guards.ts
export function isCanvasNode(value: unknown): value is CanvasNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    'position' in value &&
    'data' in value
  );
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    'code' in error
  );
}
```

**Typed Error Classes**:
```typescript
// lib/errors/index.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

**TypeScript Configuration**:
```json
// tsconfig.json updates
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Implementation Strategy**:
1. Define all canvas types in lib/types/canvas.ts
2. Create type guard utilities
3. Replace all 'any' types with specific types or 'unknown'
4. Enable strict mode in tsconfig.json
5. Fix all type errors incrementally
6. Add type validation at API boundaries
7. Implement typed error classes


#### Comprehensive Error Handling

**Problem**: Inconsistent error patterns, silent failures, generic error messages.

**Solution**: Implement error boundaries, structured error handling, user-friendly messages.

**Error Boundary Architecture**:
```typescript
// components/ErrorBoundary.tsx (enhanced)
interface ErrorBoundaryProps {
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level: 'app' | 'page' | 'component';
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  // Catches React errors and displays fallback UI
  // Logs to error reporting service
  // Provides reset functionality
}
```

**Error Boundary Hierarchy**:
```
<AppErrorBoundary>              // Top level - catches critical errors
  <PageErrorBoundary>           // Page level - catches page-specific errors
    <CanvasErrorBoundary>       // Component level - catches canvas errors
      <ConversationCanvas />
    </CanvasErrorBoundary>
    <AuthErrorBoundary>         // Component level - catches auth errors
      <AuthModal />
    </AuthErrorBoundary>
  </PageErrorBoundary>
</AppErrorBoundary>
```

**Structured Error Handling**:
```typescript
// lib/utils/error-handler.ts
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const appError = normalizeError(error, context);
    logger.error(`${context} failed`, appError);
    return { error: appError };
  }
}

function normalizeError(error: unknown, context: string): AppError {
  if (isApiError(error)) {
    return new AppError(
      getUserFriendlyMessage(error),
      error.statusCode,
      context
    );
  }
  
  if (error instanceof TypeError) {
    return new AppError(
      'A technical error occurred. Please try again.',
      500,
      context
    );
  }
  
  // Network errors
  if (error instanceof Error && error.message.includes('fetch')) {
    return new AppError(
      'Network connection failed. Please check your internet connection.',
      0,
      context
    );
  }
  
  return new AppError(
    'An unexpected error occurred. Please try again.',
    500,
    context
  );
}
```

**User-Friendly Error Messages**:
```typescript
// lib/utils/error-messages.ts
export function getUserFriendlyMessage(error: ApiError): string {
  const messages: Record<number, string> = {
    400: 'The request was invalid. Please check your input.',
    401: 'Please sign in to continue.',
    403: 'You don\'t have permission to do that.',
    404: 'The requested resource was not found.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'A server error occurred. Our team has been notified.',
    503: 'The service is temporarily unavailable. Please try again later.',
  };
  
  return messages[error.statusCode] || 'An unexpected error occurred.';
}
```

**Implementation Strategy**:
1. Enhance existing ErrorBoundary component
2. Add error boundaries at app, page, and component levels
3. Create error normalization utilities
4. Implement user-friendly error message mapping
5. Add error context tracking for debugging
6. Integrate with error reporting service (e.g., Sentry)
7. Add retry mechanisms for transient failures


### Phase 3: Quality and Experience Layer

The quality layer adds comprehensive testing, documentation, accessibility, and mobile optimization to ensure a production-ready application.

#### Mobile-Optimized Experience

**Problem**: components/canvas/CanvasManager.tsx shows warning but doesn't optimize for mobile, touch interactions may not work.

**Solution**: Implement touch-optimized controls, responsive layouts, gesture support.

**Touch Interaction Architecture**:
```typescript
// hooks/useTouchGestures.ts
interface TouchGestures {
  onPan: (dx: number, dy: number) => void;
  onPinch: (scale: number, center: Point) => void;
  onTap: (point: Point) => void;
  onDoubleTap: (point: Point) => void;
}

export function useTouchGestures(handlers: TouchGestures) {
  // Detect and handle touch gestures
  // Support pinch-to-zoom
  // Support pan with momentum
  // Distinguish tap from drag
}
```

**Responsive Canvas Layout**:
```typescript
// components/canvas/MobileCanvas.tsx
export function MobileCanvas({ nodes, edges }: CanvasProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    return (
      <MobileOptimizedCanvas
        nodes={nodes}
        edges={edges}
        touchEnabled={true}
        minTouchTargetSize={44} // 44x44px minimum
      />
    );
  }
  
  return <DesktopCanvas nodes={nodes} edges={edges} />;
}
```

**Mobile-Specific Optimizations**:
1. **Touch Targets**: Minimum 44x44px for all interactive elements
2. **Gesture Support**: Pinch-to-zoom, two-finger pan, tap to select
3. **Simplified UI**: Collapsible sidebar, bottom sheet controls
4. **Performance**: Reduce node count on mobile, simplify animations
5. **Viewport**: Lock orientation for canvas view, prevent zoom on input focus

**Implementation Strategy**:
1. Create useTouchGestures hook for gesture detection
2. Implement MobileCanvas component with touch optimizations
3. Add responsive breakpoints for mobile layouts
4. Ensure all interactive elements meet 44x44px minimum
5. Test on iOS Safari and Chrome Android
6. Add viewport meta tags to prevent unwanted zooming
7. Implement bottom sheet for mobile controls


#### Test Coverage Implementation

**Problem**: Tests only in lib/layout/__tests__/, no tests for auth, canvas, or API routes.

**Solution**: Implement comprehensive test suite with unit, integration, and E2E tests.

**Testing Architecture**:
```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── contexts/auth-context.test.tsx
│   │   ├── utils/logger.test.ts
│   │   └── utils/canvas-calculations.test.ts
│   └── components/
│       ├── canvas/CanvasManager.test.tsx
│       └── auth/AuthModal.test.tsx
├── integration/
│   ├── auth-flow.test.tsx
│   ├── canvas-operations.test.tsx
│   └── supabase-integration.test.tsx
└── e2e/
    ├── user-journey.test.ts
    └── canvas-interactions.test.ts
```

**Test Strategy by Component**:

1. **Authentication Tests** (lib/contexts/auth-context.tsx):
```typescript
describe('AuthContext', () => {
  it('should cleanup timeouts on unmount', () => {
    const { unmount } = render(<AuthProvider><TestComponent /></AuthProvider>);
    unmount();
    // Verify no memory leaks
  });
  
  it('should handle localStorage quota exceeded', () => {
    // Mock localStorage.setItem to throw QuotaExceededError
    // Verify graceful handling
  });
  
  it('should prevent race conditions on unmount', async () => {
    // Test rapid mount/unmount cycles
  });
});
```

2. **Canvas Management Tests** (components/canvas/CanvasManager.tsx):
```typescript
describe('CanvasManager', () => {
  it('should debounce rapid state updates', async () => {
    // Trigger multiple updates within 100ms
    // Verify only one database call
  });
  
  it('should rollback failed optimistic updates', async () => {
    // Mock failed database save
    // Verify state rollback
  });
  
  it('should replace temp IDs with real IDs', async () => {
    // Create canvas with temp ID
    // Verify ID replacement after save
  });
});
```

3. **API Route Tests** (app/api/):
```typescript
describe('POST /api/chat', () => {
  it('should require authentication', async () => {
    // Make request without session
    // Verify 401 response
  });
  
  it('should not expose API keys in response', async () => {
    // Make request
    // Verify no keys in response headers or body
  });
  
  it('should validate input messages', async () => {
    // Send invalid message format
    // Verify 400 response with helpful error
  });
  
  it('should reject messages that are too long', async () => {
    // Send message > 10000 characters
    // Verify 400 response
  });
  
  it('should reject too many messages', async () => {
    // Send > 50 messages
    // Verify 400 response
  });
  
  it('should handle Gemini API failures gracefully', async () => {
    // Mock Gemini API failure
    // Verify error handling without exposing details
  });
});
```

**Test Coverage Targets**:
- Authentication flows: 80%+
- Canvas management: 80%+
- API routes: 80%+
- Utility functions: 90%+
- Critical user flows: 100% E2E coverage

**Implementation Strategy**:
1. Set up Jest configuration for Next.js 14
2. Create test utilities and mocks for Supabase
3. Write unit tests for auth context
4. Write unit tests for canvas manager
5. Write integration tests for API routes
6. Add E2E tests with Playwright for critical flows
7. Configure CI/CD to run tests on every commit
8. Add coverage reporting to CI/CD


#### Build Configuration Optimization

**Problem**: next.config.js has suppressed webpack warnings for Supabase, commented out output config.

**Solution**: Properly configure webpack externals, document configuration decisions.

**Enhanced next.config.js**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR mode enabled for API routes and dynamic features
  // Note: Previously used 'output: export' for static export
  // Migrated to SSR to support:
  // - API routes for chat (Gemini/Perplexity)
  // - Server-side rate limiting
  // - Supabase SSR session management
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Properly externalize Supabase for server-side
    if (isServer) {
      config.externals.push({
        '@supabase/supabase-js': 'commonjs @supabase/supabase-js',
      });
    }
    
    // Enable source maps for production debugging
    if (!config.devtool) {
      config.devtool = 'source-map';
    }
    
    // Bundle size optimization
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for stable caching
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          }
        }
      }
    };
    
    return config;
  },
  
  // Production optimizations
  swcMinify: true,
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

**Bundle Size Targets**:
- Main bundle: <500KB
- Vendor bundle: <300KB
- Total initial load: <800KB

**Implementation Strategy**:
1. Remove webpack warning suppression
2. Properly configure Supabase as external
3. Add comprehensive configuration comments
4. Enable source maps for production
5. Implement bundle splitting strategy
6. Add security headers
7. Monitor bundle size in CI/CD


#### Code Quality Standards

**Problem**: Inconsistent formatting, magic numbers (3000ms, 50ms), duplicate logic, long functions.

**Solution**: Implement Prettier, extract constants, refactor duplicates, enforce function length limits.

**Code Quality Tools**:
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}

// .prettierignore
node_modules
.next
build
dist
coverage
```

**Constants Extraction**:
```typescript
// lib/constants/timeouts.ts
export const TIMEOUTS = {
  AUTH_INITIALIZATION: 3000,
  DEBOUNCE_CANVAS_UPDATE: 100,
  THROTTLE_RENDER: 16,
  POLLING_MIN: 1000,
  POLLING_MAX: 30000,
  QUEUE_BATCH: 50,
} as const;

// lib/constants/canvas.ts
export const CANVAS_LIMITS = {
  MAX_NODES_BEFORE_VIRTUALIZATION: 50,
  MIN_TOUCH_TARGET_SIZE: 44,
  VIEWPORT_BUFFER: 100,
} as const;

// lib/constants/rate-limits.ts
export const RATE_LIMITS = {
  API_MAX_REQUESTS: 100,
  API_WINDOW_MS: 60000,
} as const;
```

**Duplicate Logic Extraction**:
```typescript
// Before: Duplicate canvas validation in multiple places
// After: lib/utils/canvas-validators.ts
export function validateCanvas(canvas: unknown): canvas is Canvas {
  // Single source of truth for canvas validation
}

export function validateCanvasNode(node: unknown): node is CanvasNode {
  // Single source of truth for node validation
}
```

**Function Length Enforcement**:
```json
// .eslintrc.json addition
{
  "rules": {
    "max-lines-per-function": ["warn", {
      "max": 50,
      "skipBlankLines": true,
      "skipComments": true
    }]
  }
}
```

**Pre-commit Hooks**:
```json
// package.json
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "lint:fix": "eslint --fix \"**/*.{ts,tsx,js,jsx}\""
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**Implementation Strategy**:
1. Install and configure Prettier
2. Run Prettier on entire codebase
3. Extract all magic numbers to constants files
4. Identify and extract duplicate logic
5. Refactor functions >50 lines
6. Set up Husky for pre-commit hooks
7. Configure lint-staged for automatic formatting
8. Add ESLint rules for code quality


#### Documentation Standards

**Problem**: No JSDoc comments, complex logic without explanations, README only for layout system.

**Solution**: Add JSDoc to all exports, document complex algorithms, create comprehensive READMEs.

**JSDoc Standards**:
```typescript
/**
 * Manages canvas synchronization with debouncing and retry logic.
 * 
 * @example
 * ```typescript
 * const syncManager = new CanvasSyncManager({
 *   debounceMs: 100,
 *   maxRetries: 3
 * });
 * 
 * await syncManager.queueUpdate('canvas-123', {
 *   nodes: updatedNodes,
 *   edges: updatedEdges
 * });
 * ```
 * 
 * @see {@link CanvasSyncOptions} for configuration options
 */
export class CanvasSyncManager {
  /**
   * Queues a canvas update for batched processing.
   * 
   * @param canvasId - Unique identifier for the canvas
   * @param update - Canvas update containing nodes and edges
   * @throws {ValidationError} If canvas ID is invalid
   * @throws {NetworkError} If update fails after max retries
   */
  queueUpdate(canvasId: string, update: CanvasUpdate): void {
    // Implementation
  }
}
```

**README Structure**:
```markdown
# Component/Module Name

## Overview
Brief description of purpose and functionality.

## Usage
```typescript
// Code example
```

## API Reference
### Functions
- `functionName(param: Type): ReturnType` - Description

### Types
- `TypeName` - Description

## Architecture
Explanation of design decisions and patterns used.

## Testing
How to run tests and what's covered.

## Performance Considerations
Any performance notes or optimization strategies.
```

**Documentation Files to Create**:
```
components/README.md           - Component architecture overview
components/canvas/README.md    - Canvas system documentation
lib/README.md                  - Library utilities overview
lib/contexts/README.md         - Context providers documentation
app/api/README.md              - API routes documentation
.env.example                   - Environment variables with descriptions
```

**Enhanced .env.example**:
```bash
# ============================================
# IMPORTANT: Never commit .env or .env.local to git!
# Copy this file to .env.local and fill in your actual values
# ============================================

# Supabase Configuration
# Required for authentication and database access
# Get these from: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Gemini API Configuration
# Required for AI-powered conversation features
# Get your key from: https://aistudio.google.com/app/apikey
# NOTE: Server-side only - no NEXT_PUBLIC_ prefix
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Service Role Key (for migrations and admin operations)
# Get from: https://app.supabase.com/project/_/settings/api
# WARNING: Keep this secret! Has admin privileges
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Error Reporting
# Sentry DSN for production error tracking
SENTRY_DSN=your-sentry-dsn

# Optional: Analytics
# Google Analytics measurement ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX


```

**Implementation Strategy**:
1. Add JSDoc comments to all exported functions and classes
2. Document complex algorithms with inline comments
3. Create README files for major directories
4. Update .env.example with detailed descriptions
5. Generate API documentation from JSDoc
6. Add architecture diagrams using Mermaid
7. Create contribution guidelines


#### Accessibility Compliance

**Problem**: Missing ARIA labels, no keyboard navigation, color contrast issues.

**Solution**: Add ARIA attributes, implement keyboard navigation, ensure WCAG 2.1 AA compliance.

**ARIA Implementation**:
```typescript
// components/canvas/ConversationNode.tsx
export function ConversationNode({ data, selected }: NodeProps) {
  return (
    <div
      role="article"
      aria-label={`Conversation node: ${data.content.substring(0, 50)}`}
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <button
        aria-label="Create branch from this conversation"
        onClick={handleBranch}
      >
        Branch
      </button>
    </div>
  );
}

// components/canvas/CanvasManager.tsx
export function CanvasManager() {
  return (
    <main
      role="main"
      aria-label="Conversation canvas workspace"
    >
      <nav
        role="navigation"
        aria-label="Canvas list"
      >
        {/* Canvas list */}
      </nav>
      <section
        role="region"
        aria-label="Active canvas"
        aria-live="polite"
      >
        {/* Canvas content */}
      </section>
    </main>
  );
}
```

**Keyboard Navigation**:
```typescript
// hooks/useKeyboardNavigation.ts
export function useKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab: Navigate between nodes
      if (e.key === 'Tab') {
        navigateToNextNode();
      }
      
      // Arrow keys: Pan canvas
      if (e.key.startsWith('Arrow')) {
        panCanvas(e.key);
      }
      
      // Enter: Select/activate node
      if (e.key === 'Enter') {
        activateSelectedNode();
      }
      
      // Escape: Deselect/close
      if (e.key === 'Escape') {
        deselectAll();
      }
      
      // Ctrl/Cmd + N: New canvas
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewCanvas();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

**Color Contrast Compliance**:
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // WCAG AA compliant color palette
        background: {
          primary: '#1a1a1a',    // Background
          secondary: '#2a2a2a',  // Elevated surfaces
        },
        text: {
          primary: '#ececec',    // 13.5:1 contrast ratio
          secondary: '#b4b4b4',  // 7.2:1 contrast ratio
          tertiary: '#8e8e8e',   // 4.6:1 contrast ratio (AA compliant)
        },
        accent: {
          primary: '#00D5FF',    // 8.1:1 contrast ratio
          hover: '#00B8E6',      // 6.8:1 contrast ratio
        }
      }
    }
  }
};
```

**Screen Reader Announcements**:
```typescript
// components/shared/LiveRegion.tsx
export function LiveRegion() {
  const [announcement, setAnnouncement] = useState('');
  
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// Usage in CanvasManager
const announce = useAnnouncement();

const handleCanvasUpdate = () => {
  // Update canvas
  announce('Canvas updated successfully');
};
```

**Focus Management**:
```typescript
// hooks/useFocusManagement.ts
export function useFocusManagement() {
  const focusableElements = useRef<HTMLElement[]>([]);
  
  const trapFocus = (container: HTMLElement) => {
    // Trap focus within modal/dialog
  };
  
  const restoreFocus = () => {
    // Restore focus to previous element
  };
  
  return { trapFocus, restoreFocus };
}
```

**Accessibility Testing**:
```typescript
// __tests__/accessibility/canvas.a11y.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Canvas Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<CanvasManager />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('should support keyboard navigation', () => {
    // Test keyboard interactions
  });
});
```

**Implementation Strategy**:
1. Add ARIA labels to all interactive elements
2. Implement keyboard navigation hooks
3. Update color palette for WCAG AA compliance
4. Add screen reader announcements for dynamic content
5. Implement focus management for modals
6. Add skip links for main content
7. Run automated accessibility tests with jest-axe
8. Manual testing with screen readers (NVDA, VoiceOver)


#### Enhanced ESLint Configuration

**Problem**: .eslintrc.json only extends next/core-web-vitals, missing TypeScript, React hooks, and accessibility rules.

**Solution**: Comprehensive ESLint configuration with TypeScript, React, and accessibility plugins.

**Enhanced .eslintrc.json**:
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module",
    "project": "./tsconfig.json",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y"
  ],
  "rules": {
    // TypeScript specific rules
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/explicit-function-return-type": ["warn", {
      "allowExpressions": true,
      "allowTypedFunctionExpressions": true
    }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    
    // React specific rules
    "react/react-in-jsx-scope": "off", // Not needed in Next.js
    "react/prop-types": "off", // Using TypeScript
    "react/jsx-no-target-blank": "error",
    "react/jsx-key": "error",
    
    // React Hooks rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    
    // Accessibility rules
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/no-autofocus": "warn",
    
    // Code quality rules
    "no-console": ["error", {
      "allow": ["warn", "error"]
    }],
    "no-debugger": "error",
    "no-alert": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "max-lines-per-function": ["warn", {
      "max": 50,
      "skipBlankLines": true,
      "skipComments": true
    }],
    "complexity": ["warn", 10],
    "max-depth": ["warn", 3]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.test.tsx"],
      "env": {
        "jest": true
      },
      "rules": {
        "max-lines-per-function": "off"
      }
    }
  ]
}
```

**Required Dependencies**:
```json
// package.json devDependencies additions
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-jsx-a11y": "^6.7.0"
  }
}
```

**ESLint Scripts**:
```json
// package.json scripts
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "lint:strict": "eslint . --ext .ts,.tsx --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

**CI/CD Integration**:
```yaml
# .github/workflows/lint.yml
name: Lint and Type Check

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint:strict
      - run: npm run type-check
```

**Implementation Strategy**:
1. Install ESLint plugins for TypeScript, React, and accessibility
2. Update .eslintrc.json with comprehensive rules
3. Run ESLint on codebase and fix errors incrementally
4. Add ESLint scripts to package.json
5. Configure pre-commit hooks to run ESLint
6. Add ESLint to CI/CD pipeline
7. Set up IDE integration for real-time linting


## Components and Interfaces

### New Components

#### 1. Environment Validator
```typescript
// lib/utils/env-validator.ts
export interface EnvConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  geminiApiKey?: string;
}

export class EnvironmentValidator {
  validate(): ValidationResult;
  getConfig(): EnvConfig;
  isConfigured(service: string): boolean;
}
```

#### 2. Logger Utility
```typescript
// lib/utils/logger.ts
export class Logger {
  debug(message: string, context?: object): void;
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, error?: Error, context?: object): void;
}
```

#### 3. Canvas Sync Manager
```typescript
// lib/hooks/useCanvasSync.ts
export class CanvasSyncManager {
  queueUpdate(canvasId: string, update: CanvasUpdate): void;
  flush(): Promise<void>;
  rollback(canvasId: string): void;
}
```



#### 5. Error Boundary Components
```typescript
// components/ErrorBoundary.tsx
export class AppErrorBoundary extends React.Component;
export class PageErrorBoundary extends React.Component;
export class CanvasErrorBoundary extends React.Component;
```

### Modified Components

#### 1. Supabase Client
```typescript
// lib/supabase-client.ts
// Before: Throws error if env vars missing
// After: Returns null client with graceful degradation
export const supabase: SupabaseClient | null;
export const isSupabaseConfigured: boolean;
```

#### 2. Auth Context
```typescript
// lib/contexts/auth-context.tsx
// Before: Memory leaks, unsafe localStorage
// After: Proper cleanup, works with Supabase SSR
export class AuthManager {
  cleanup(): void;
  // Note: Supabase SSR handles session storage via cookies
  // Remove direct localStorage manipulation for auth tokens
}

// lib/supabase-server.ts (new)
// Server-side Supabase client with cookie-based sessions
export function createServerClient(): SupabaseClient;
```

#### 3. Canvas Manager
```typescript
// components/canvas/CanvasManager.tsx
// Before: Unthrottled updates, temp ID issues
// After: Debounced updates, proper ID management
export function CanvasManager(): JSX.Element;
```

### New Hooks

```typescript
// hooks/useTouchGestures.ts
export function useTouchGestures(handlers: TouchGestures): void;

// hooks/useKeyboardNavigation.ts
export function useKeyboardNavigation(): void;

// hooks/useCanvasPanZoom.ts
export function useCanvasPanZoom(): PanZoomControls;

// hooks/useFocusManagement.ts
export function useFocusManagement(): FocusControls;
```

## Data Models

### Canvas Types
```typescript
export interface CanvasNode {
  id: string;
  type: 'conversation' | 'response' | 'branch';
  position: { x: number; y: number };
  data: {
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type: 'default' | 'branch';
  animated?: boolean;
}

export interface Canvas {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
```

### Error Types
```typescript
export class ApiError extends Error {
  statusCode: number;
  code: string;
  context?: Record<string, unknown>;
}

export class ValidationError extends Error {
  field: string;
  value: unknown;
}

export class NetworkError extends Error {
  originalError: Error;
}
```

## Error Handling

### Error Boundary Hierarchy
```
AppErrorBoundary (app level)
  └─ PageErrorBoundary (page level)
      ├─ CanvasErrorBoundary (canvas components)
      └─ AuthErrorBoundary (auth components)
```

### Error Recovery Strategies

1. **Network Errors**: Retry with exponential backoff
2. **Validation Errors**: Display field-specific messages
3. **Auth Errors**: Redirect to login or refresh session
4. **Canvas Errors**: Rollback to last known good state
5. **Critical Errors**: Display error page with recovery options

## Testing Strategy

### Unit Tests (80%+ coverage)
- Authentication context and manager
- Canvas sync manager
- Type guards and validators
- Utility functions
- Input validation functions

### Integration Tests (80%+ coverage)
- Auth flow (signup, login, logout)
- Canvas operations (create, update, delete)
- API routes with rate limiting
- Supabase integration

### E2E Tests (Critical flows)
- User registration and login
- Canvas creation and editing
- Conversation branching
- Mobile interactions

### Performance Tests
- Canvas rendering with 100+ nodes
- Rapid state updates
- Memory leak detection
- Bundle size monitoring

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Fix dependency versions
2. Implement environment validator
3. Replace console.log with logger
4. Run full type check

### Phase 2: Core Systems (Week 3-5)
1. Refactor auth context
2. Implement canvas sync manager
3. Move API keys to server-side
4. Enable TypeScript strict mode
5. Add error boundaries

### Phase 3: Quality (Week 6-8)
1. Implement mobile optimizations
2. Write comprehensive tests
3. Add documentation
4. Implement accessibility features
5. Configure ESLint

### Rollback Plan
Each phase has a rollback strategy:
- Git tags for each phase completion
- Feature flags for new functionality
- Database migrations are reversible
- Gradual rollout with monitoring

## Performance Considerations

### Optimization Targets
- Initial page load: <2s
- Time to interactive: <3s
- Canvas render: <16ms (60 FPS)
- API response: <200ms
- Bundle size: <800KB

### Monitoring
- Core Web Vitals tracking
- Error rate monitoring
- API latency tracking
- Memory usage profiling
- Bundle size analysis

## Security Considerations

### Authentication
- HttpOnly cookies for session tokens
- CSRF protection
- Rate limiting on auth endpoints
- Secure password requirements

### API Security
- Server-side API key storage
- Authentication checks on all routes
- Comprehensive input validation
- SQL injection prevention (via Supabase)

### Data Protection
- Encrypted data at rest (Supabase)
- HTTPS only
- Security headers
- XSS prevention

## Deployment Strategy

### Staging Environment
- Deploy each phase to staging first
- Run full test suite
- Manual QA testing
- Performance benchmarking

### Production Rollout
- Gradual rollout (10% → 50% → 100%)
- Monitor error rates
- Track performance metrics
- Ready rollback plan

### Post-Deployment
- Monitor for 48 hours
- Address any issues immediately
- Collect user feedback
- Document lessons learned


## Additional Design Considerations

### Backward Compatibility Strategy

**User Data Migration**:
- Existing canvas data with `any[]` types must be validated and migrated
- Temporary canvas IDs in localStorage need graceful handling
- Session data migration from localStorage to httpOnly cookies (handled by Supabase SSR)

**Migration Script**:
```typescript
// scripts/migrate-canvas-data.ts
import { createClient } from '@supabase/supabase-js';
import { isCanvasNode, isCanvasEdge } from '@/lib/utils/type-guards';

export async function migrateCanvasData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key for migration
  );
  
  console.log('Starting canvas data migration...');
  
  // 1. Fetch all canvases from database
  const { data: canvases, error } = await supabase
    .from('canvases')
    .select('*');
  
  if (error) {
    console.error('Failed to fetch canvases:', error);
    return;
  }
  
  let migratedCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: string; error: string }> = [];
  
  // 2. Validate and clean each canvas
  for (const canvas of canvases) {
    try {
      // Validate nodes
      const validNodes = Array.isArray(canvas.nodes)
        ? canvas.nodes.filter(isCanvasNode)
        : [];
      
      // Validate edges
      const validEdges = Array.isArray(canvas.edges)
        ? canvas.edges.filter(isCanvasEdge)
        : [];
      
      // Check if migration is needed
      const needsMigration = 
        validNodes.length !== canvas.nodes?.length ||
        validEdges.length !== canvas.edges?.length;
      
      if (needsMigration) {
        // 3. Update with proper types
        const { error: updateError } = await supabase
          .from('canvases')
          .update({
            nodes: validNodes,
            edges: validEdges,
            updated_at: new Date().toISOString()
          })
          .eq('id', canvas.id);
        
        if (updateError) {
          throw updateError;
        }
        
        migratedCount++;
        console.log(`Migrated canvas ${canvas.id}: ${validNodes.length} nodes, ${validEdges.length} edges`);
      }
    } catch (err) {
      errorCount++;
      errors.push({
        id: canvas.id,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      console.error(`Failed to migrate canvas ${canvas.id}:`, err);
    }
  }
  
  // 4. Log summary
  console.log('\nMigration Summary:');
  console.log(`Total canvases: ${canvases.length}`);
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\nFailed canvases:');
    errors.forEach(({ id, error }) => {
      console.log(`  ${id}: ${error}`);
    });
  }
}

// Run migration
if (require.main === module) {
  migrateCanvasData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
```

**Running the Migration**:
```bash
# Add to package.json scripts
"migrate:canvas": "tsx scripts/migrate-canvas-data.ts"

# Run migration
npm run migrate:canvas
```

**Migration Timing**:
- Run AFTER type definitions are created
- Run BEFORE enabling strict mode
- Run in staging environment first
- Backup database before running in production

**Handling Existing Temp IDs in localStorage**:
```typescript
// In CanvasManager.tsx initialization
useEffect(() => {
  // Clean up any temp IDs from localStorage on mount
  const cleanupTempIds = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.includes('temp-')) {
        localStorage.removeItem(key);
      }
    });
  };
  
  cleanupTempIds();
}, []);
```

**Note**: Temp IDs are ephemeral and should not persist across sessions. Any temp IDs in localStorage from previous sessions should be cleared on app initialization.

### Performance Monitoring Integration

**Metrics to Track**:
```typescript
// lib/utils/performance-monitor.ts
export class PerformanceMonitor {
  // Track Core Web Vitals
  trackLCP(): void; // Largest Contentful Paint
  trackFID(): void; // First Input Delay
  trackCLS(): void; // Cumulative Layout Shift
  
  // Track custom metrics
  trackCanvasRenderTime(duration: number): void;
  trackAPILatency(endpoint: string, duration: number): void;
  trackMemoryUsage(): void;
}
```

**Integration Points**:
- Canvas render performance
- API response times
- Memory usage during long sessions
- Bundle size impact on load times

### Error Reporting Service Integration

**Sentry Configuration**:
```typescript
// lib/utils/error-reporting.ts
import * as Sentry from '@sentry/nextjs';

export function initErrorReporting() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      beforeSend(event, hint) {
        // Filter sensitive data
        return sanitizeEvent(event);
      }
    });
  }
}
```

### Database Schema Considerations

**Canvas Table Updates**:
```sql
-- Add validation constraints
ALTER TABLE canvases 
  ADD CONSTRAINT nodes_is_array CHECK (jsonb_typeof(nodes) = 'array'),
  ADD CONSTRAINT edges_is_array CHECK (jsonb_typeof(edges) = 'array');

-- Add indexes for performance
CREATE INDEX idx_canvases_user_id ON canvases(user_id);
CREATE INDEX idx_canvases_updated_at ON canvases(updated_at DESC);
```

### Caching Strategy

**Client-Side Caching**:
```typescript
// lib/utils/cache-manager.ts
export class CacheManager {
  // Cache canvas data to reduce API calls
  cacheCanvas(canvasId: string, data: Canvas): void;
  getCachedCanvas(canvasId: string): Canvas | null;
  invalidateCache(canvasId: string): void;
  
  // Cache with TTL
  private ttl = 5 * 60 * 1000; // 5 minutes
}
```

**Server-Side Caching**:
- Use Supabase's built-in caching
- Consider Redis for rate limiting data
- Cache static assets with CDN

### Internationalization Preparation

**i18n Structure** (for future):
```typescript
// lib/i18n/en.ts
export const en = {
  errors: {
    network: 'Network connection failed. Please check your internet connection.',
    auth: 'Please sign in to continue.',
    // ... other messages
  },
  canvas: {
    createNew: 'Create New Canvas',
    // ... other labels
  }
};
```

### Feature Flags System

**Gradual Rollout Control**:
```typescript
// lib/utils/feature-flags.ts
export class FeatureFlags {
  isEnabled(flag: string, userId?: string): boolean {
    // Check environment variables
    // Check user-specific overrides
    // Check percentage rollout
  }
}

// Usage
const flags = new FeatureFlags();
if (flags.isEnabled('new-canvas-sync', user.id)) {
  // Use new CanvasSyncManager
} else {
  // Use legacy sync
}
```

### API Versioning Strategy

**Version Headers**:
```typescript
// app/api/v1/canvas/route.ts
export async function GET(request: Request) {
  const version = request.headers.get('API-Version') || 'v1';
  
  if (version === 'v2') {
    return handleV2Request(request);
  }
  
  return handleV1Request(request);
}
```

### Development Workflow Improvements

**Git Hooks**:
```json
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run format:check
npm run lint:strict
npm run type-check
npm run test -- --bail --findRelatedTests
```

**Branch Protection**:
- Require passing CI/CD checks
- Require code review approval
- Require up-to-date branches
- Prevent force pushes to main

### Monitoring Dashboard

**Key Metrics to Display**:
1. Error rate by component
2. API response times (p50, p95, p99)
3. Active users and sessions
4. Canvas operations per minute
5. Memory usage trends
6. Bundle size over time

### Load Testing Strategy

**Scenarios to Test**:
```typescript
// __tests__/load/canvas-operations.load.test.ts
describe('Canvas Load Tests', () => {
  it('should handle 100 concurrent canvas updates', async () => {
    // Simulate 100 users updating canvases simultaneously
  });
  
  it('should handle canvas with 500 nodes', async () => {
    // Test performance with large canvas
  });
  
  it('should handle rapid create/delete operations', async () => {
    // Test optimistic updates under load
  });
});
```

### Documentation Website

**Structure**:
```
docs/
├── getting-started/
│   ├── installation.md
│   ├── configuration.md
│   └── first-canvas.md
├── architecture/
│   ├── overview.md
│   ├── auth-system.md
│   ├── canvas-system.md
│   └── api-design.md
├── api-reference/
│   ├── endpoints.md
│   └── types.md
└── contributing/
    ├── development-setup.md
    ├── coding-standards.md
    └── pull-request-process.md
```

### Dependency Update Strategy

**Automated Updates**:
```json
// renovate.json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["breaking-change"]
    }
  ]
}
```

### Security Audit Checklist

**Pre-Deployment Security Review**:
- [ ] No API keys in client-side code
- [ ] All API routes have authentication checks
- [ ] Input validation on all endpoints
- [ ] CSRF protection enabled (via Supabase)
- [ ] Security headers configured
- [ ] Dependencies scanned for vulnerabilities
- [ ] Authentication flows tested
- [ ] Authorization checks in place
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Git history audited for committed secrets
- [ ] All exposed API keys rotated
- [ ] Pre-commit hooks prevent future secret commits

**Git History Security Audit**:

Based on ENV_SECURITY_FIX.md, there was a previous incident where API keys were committed to git. This must be addressed:

```bash
# 1. Audit git history for secrets
git log --all --full-history -- .env
git log --all --full-history -- .env.local
git log --all --full-history -p | grep -i "GEMINI_API_KEY\|SUPABASE"

# 2. If secrets found, clean git history
# Option A: Using git-filter-repo (recommended)
git filter-repo --path .env --invert-paths
git filter-repo --path .env.local --invert-paths

# Option B: Using BFG Repo-Cleaner
bfg --delete-files .env
bfg --delete-files .env.local

# 3. Force push cleaned history (coordinate with team)
git push origin --force --all
git push origin --force --tags

# 4. Rotate ALL exposed keys immediately
# - Generate new Gemini API key
# - Generate new Supabase keys (if exposed)
# - Update all environments
```

**Prevention Measures**:
```bash
# .gitignore (verify these are present)
.env
.env.local
.env*.local
*.key
*.pem

# Pre-commit hook to detect secrets
# .husky/pre-commit
#!/bin/sh
if git diff --cached --name-only | grep -E '\.env|\.key|\.pem'; then
  echo "❌ Error: Attempting to commit sensitive files"
  echo "Files like .env should never be committed"
  exit 1
fi

# Check for potential secrets in staged files
if git diff --cached -p | grep -iE 'api[_-]?key|secret|password|token.*='; then
  echo "⚠️  Warning: Potential secrets detected in staged changes"
  echo "Please review carefully before committing"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

### Disaster Recovery Plan

**Backup Strategy**:
- Supabase automatic backups (daily)
- Point-in-time recovery capability
- Canvas data export functionality
- User data export on request

**Recovery Procedures**:
1. Identify issue scope
2. Roll back to last known good version
3. Restore database from backup if needed
4. Communicate with users
5. Post-mortem analysis

### Cost Optimization

**Resource Usage Monitoring**:
- Supabase database size
- API call volume
- Bandwidth usage
- Storage costs

**Optimization Strategies**:
- Implement data retention policies
- Compress large canvas data
- Use CDN for static assets
- Optimize database queries

## Design Review Checklist

### Completeness
- [x] All 16 requirements addressed
- [x] Three-phase implementation strategy
- [x] Component interfaces defined
- [x] Data models specified
- [x] Error handling strategy
- [x] Testing strategy
- [x] Migration plan
- [x] Performance targets
- [x] Security considerations
- [x] Deployment strategy

### Feasibility
- [x] Dependencies are compatible
- [x] Breaking changes are manageable
- [x] Timeline is realistic (8 weeks)
- [x] Resources are available
- [x] Rollback plans exist

### Maintainability
- [x] Code is modular and focused
- [x] Documentation standards defined
- [x] Testing coverage targets set
- [x] Monitoring strategy in place
- [x] Update strategy defined

### Scalability
- [x] Performance optimizations planned
- [x] Caching strategy defined
- [x] Database indexes planned
- [x] Load testing strategy
- [x] Resource monitoring

### Security
- [x] API keys moved server-side
- [x] Rate limiting implemented
- [x] Input validation planned
- [x] Security headers configured
- [x] Audit checklist created
