import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
  }[];
}

export async function GET() {
  const checks: HealthStatus['checks'] = [];
  let overallStatus: HealthStatus['status'] = 'healthy';

  // Check 1: Environment variables
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasAiKey = !!(process.env.GEMINI_API_KEY || process.env.PERPLEXITY_API_KEY);

  checks.push({
    name: 'supabase_config',
    status: hasSupabaseUrl && hasSupabaseKey ? 'pass' : 'fail',
    message: hasSupabaseUrl && hasSupabaseKey 
      ? 'Supabase configured' 
      : 'Missing Supabase environment variables',
  });

  checks.push({
    name: 'ai_config',
    status: hasAiKey ? 'pass' : 'fail',
    message: hasAiKey 
      ? 'AI API configured' 
      : 'No AI API key configured (will use mock responses)',
  });

  // Determine overall status
  const failedChecks = checks.filter(c => c.status === 'fail');
  if (failedChecks.length > 0) {
    // If Supabase is down, we're unhealthy
    if (failedChecks.some(c => c.name === 'supabase_config')) {
      overallStatus = 'unhealthy';
    } else {
      // Other failures are degraded (app still works)
      overallStatus = 'degraded';
    }
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  };

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, { status: statusCode });
}
