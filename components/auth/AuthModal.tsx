"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/contexts/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signUp, signIn, signInWithGoogle } = useAuth();

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmail(email)) { setError('Please enter a valid email address'); return; }
    if (isSignUp && !validatePassword(password)) { setError('Password must be at least 8 characters long'); return; }
    if (isSignUp && password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) { setError(error.message); }
        else {
          setSuccess('Account created! Please check your email to verify your account.');
          setEmail(''); setPassword(''); setConfirmPassword('');
          setTimeout(() => onOpenChange(false), 2000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) { setError('Invalid email or password'); }
        else { resetForm(); onOpenChange(false); }
      }
    } catch { setError('An unexpected error occurred. Please try again.'); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setEmail(''); setPassword(''); setConfirmPassword(''); setError(''); setSuccess(''); };
  const toggleMode = () => { setIsSignUp(!isSignUp); resetForm(); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border border-border-default rounded-lg max-w-md w-[calc(100vw-2rem)] sm:w-full mx-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-semibold text-2xl">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {isSignUp ? 'Sign up to save your conversations and access them anywhere' : 'Sign in to access your saved conversations'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
          {/* Error alert - uses error semantic color */}
          {error && (
            <Alert className="bg-error-muted border border-error/30 text-error rounded-md">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success alert - uses success semantic color */}
          {success && (
            <Alert className="bg-success-muted border border-success/30 text-success rounded-md">
              <AlertDescription className="text-sm">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-text-secondary">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="bg-void border border-border-default text-text-primary placeholder:text-text-disabled hover:border-border-strong focus:border-border-focus focus:ring-0 focus-visible:ring-0 rounded-md transition-colors h-11 text-base"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-text-secondary">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="bg-void border border-border-default text-text-primary placeholder:text-text-disabled hover:border-border-strong focus:border-border-focus focus:ring-0 focus-visible:ring-0 rounded-md transition-colors h-11 text-base"
              style={{ fontSize: '16px' }}
            />
            {isSignUp && <p className="text-xs text-text-disabled">Must be at least 8 characters</p>}
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-text-secondary">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="bg-void border border-border-default text-text-primary placeholder:text-text-disabled hover:border-border-strong focus:border-border-focus focus:ring-0 focus-visible:ring-0 rounded-md transition-colors h-11 text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
          )}

          {/* Primary action button */}
          <Button type="submit" disabled={loading} className="w-full bg-action-primary hover:bg-action-primary-hover text-action-primary-text rounded-md font-medium h-11">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isSignUp ? 'Creating Account...' : 'Signing In...'}</>) : (<>{isSignUp ? 'Create Account' : 'Sign In'}</>)}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-surface text-text-disabled">Or continue with</span></div>
          </div>

          {/* Secondary action - Google sign in */}
          <Button
            type="button"
            onClick={async () => { setLoading(true); setError(''); try { await signInWithGoogle(); } catch (err: any) { setError(err.message || 'Failed to sign in with Google'); setLoading(false); }}}
            disabled={loading}
            className="w-full bg-void hover:bg-elevated text-text-primary border border-border-default hover:border-border-strong rounded-md font-medium h-11 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="text-center text-sm text-text-tertiary">
            {isSignUp ? (
              <>Already have an account?{' '}<button type="button" onClick={toggleMode} disabled={loading} className="text-action-primary hover:text-action-primary-hover transition-colors underline-offset-2 hover:underline">Sign in</button></>
            ) : (
              <>Don&apos;t have an account?{' '}<button type="button" onClick={toggleMode} disabled={loading} className="text-action-primary hover:text-action-primary-hover transition-colors underline-offset-2 hover:underline">Sign up</button></>
            )}
          </div>

          {isSignUp && (
            <p className="text-center text-xs text-text-disabled mt-4">
              By signing up, you agree to our{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-action-primary transition-colors underline-offset-2 hover:underline">Privacy Policy</a>
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
