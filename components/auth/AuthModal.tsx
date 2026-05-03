"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/contexts/auth-context';
import { AsciiBox } from '@/components/ui/ascii-box';

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

    if (!validateEmail(email)) { setError('invalid email address'); return; }
    if (isSignUp && !validatePassword(password)) { setError('password must be at least 8 characters'); return; }
    if (isSignUp && password !== confirmPassword) { setError('passwords do not match'); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) { setError(error.message); }
        else {
          setSuccess('account created — check your email to verify');
          setEmail(''); setPassword(''); setConfirmPassword('');
          setTimeout(() => onOpenChange(false), 2000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) { setError('invalid email or password'); }
        else { resetForm(); onOpenChange(false); }
      }
    } catch { setError('unexpected error — try again'); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setEmail(''); setPassword(''); setConfirmPassword(''); setError(''); setSuccess(''); };
  const toggleMode = () => { setIsSignUp(!isSignUp); resetForm(); };

  const title = isSignUp ? 'auth · create account' : 'auth · sign in';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-terminal font-mono bg-base text-text-primary max-w-md w-[calc(100vw-2rem)] sm:w-full mx-auto p-0 border-0 shadow-none [&>button:last-child]:hidden [&>*]:min-w-0 overflow-hidden">
        <AsciiBox
          title={title}
          variant="strong"
          className="text-[13px] w-full min-w-0 overflow-hidden"
          contentClassName="px-[2ch] py-[1lh] flex flex-col gap-[0.75lh] min-w-0"
        >
          <DialogTitle className="sr-only">{isSignUp ? 'Create Account' : 'Sign In'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isSignUp ? 'Sign up to save your conversations.' : 'Sign in to access your saved conversations.'}
          </DialogDescription>

          <div className="text-text-tertiary">
            <span className="text-action-primary">$&nbsp;</span>
            {isSignUp ? 'bubbles auth --new' : 'bubbles auth --login'}
          </div>

          {error && (
            <div className="text-error border-l border-error pl-[2ch] py-[0.25lh]" role="alert">
              ! {error}
            </div>
          )}
          {success && (
            <div className="text-action-primary border-l border-action-primary pl-[2ch] py-[0.25lh]">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[0.75lh]">
            <TerminalField
              label="email"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              disabled={loading}
            />
            <TerminalField
              label="password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              disabled={loading}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              hint={isSignUp ? 'min 8 characters' : undefined}
            />
            {isSignUp && (
              <TerminalField
                label="confirm"
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={loading}
                autoComplete="new-password"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="text-action-primary hover:text-action-primary-hover disabled:text-text-disabled disabled:cursor-not-allowed text-left mt-[0.25lh]"
            >
              {loading
                ? (isSignUp ? '[ creating account... ]' : '[ signing in... ]')
                : (isSignUp ? '[ create account ]' : '[ sign in ]')}
            </button>

            <div aria-hidden className="text-border-subtle whitespace-nowrap overflow-hidden select-none -mx-[2ch] px-[2ch]">
              {'─ or '.padEnd(400, '─')}
            </div>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError('');
                try { await signInWithGoogle(); }
                catch (err: any) { setError(err.message || 'failed to sign in with google'); setLoading(false); }
              }}
              disabled={loading}
              className="text-text-secondary hover:text-text-primary disabled:text-text-disabled disabled:cursor-not-allowed text-left flex items-center gap-[1ch]"
            >
              <span>[ continue with google ]</span>
              <span className="text-text-tertiary">— OAuth</span>
            </button>

            <div className="text-text-tertiary">
              {isSignUp ? (
                <>have an account?&nbsp;<button type="button" onClick={toggleMode} disabled={loading} className="text-action-primary hover:text-action-primary-hover">[ sign in ]</button></>
              ) : (
                <>no account?&nbsp;<button type="button" onClick={toggleMode} disabled={loading} className="text-action-primary hover:text-action-primary-hover">[ sign up ]</button></>
              )}
            </div>

            {isSignUp && (
              <p className="text-text-disabled text-[12px]">
                by signing up you agree to our{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-action-primary">privacy policy</a>
              </p>
            )}
          </form>
        </AsciiBox>
      </DialogContent>
    </Dialog>
  );
}

function TerminalField({
  label,
  id,
  type,
  placeholder,
  value,
  onChange,
  disabled,
  autoComplete,
  hint,
}: {
  label: string;
  id: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-[0.25lh]">
      <span className="text-text-tertiary">{label}:</span>
      <div className="flex items-center gap-[1ch] border border-border-default focus-within:border-action-primary px-[1ch] py-[0.25lh] bg-base">
        <span className="text-action-primary flex-shrink-0">›</span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-text-primary placeholder:text-text-disabled font-mono text-[14px]"
        />
      </div>
      {hint ? <span className="text-text-disabled text-[12px]">{hint}</span> : null}
    </label>
  );
}
