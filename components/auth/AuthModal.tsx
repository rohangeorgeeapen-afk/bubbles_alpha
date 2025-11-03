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
  const { signUp, signIn } = useAuth();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Only validate password length for sign-up
    if (isSignUp && !validatePassword(password)) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Account created! Please check your email to verify your account.');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          // Close modal after 2 seconds if email confirmation is disabled
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError('Invalid email or password');
        } else {
          // Close modal immediately on successful sign in
          resetForm();
          onOpenChange(false);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2f2f2f] border border-[#4d4d4d] rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#ececec] font-semibold text-2xl">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-[#b4b4b4]">
            {isSignUp
              ? 'Sign up to save your conversations and access them anywhere'
              : 'Sign in to access your saved conversations'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
          {error && (
            <Alert className="bg-red-500/5 border border-red-400/30 text-red-400 rounded-lg">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-blue-500/5 border border-blue-400/30 text-blue-400 rounded-lg">
              <AlertDescription className="text-sm">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#ececec]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="bg-[#212121] border border-[#4d4d4d] text-[#ececec] placeholder:text-[#8e8e8e] hover:border-[#565656] hover:bg-[#2a2a2a] focus:border-blue-400 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#ececec]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="bg-[#212121] border border-[#4d4d4d] text-[#ececec] placeholder:text-[#8e8e8e] hover:border-[#565656] hover:bg-[#2a2a2a] focus:border-blue-400 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg transition-all duration-200"
            />
            {isSignUp && (
              <p className="text-xs text-[#b4b4b4]">Must be at least 8 characters</p>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#ececec]">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="bg-[#212121] border border-[#4d4d4d] text-[#ececec] placeholder:text-[#8e8e8e] hover:border-[#565656] hover:bg-[#2a2a2a] focus:border-blue-400 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg transition-all duration-200"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ececec] hover:bg-[#d4d4d4] text-[#0d0d0d] rounded-lg font-medium h-11"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>{isSignUp ? 'Create Account' : 'Sign In'}</>
            )}
          </Button>

          <div className="text-center text-sm text-[#b4b4b4]">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="text-[#b4b4b4] hover:text-[#ececec] transition-colors underline-offset-2 hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="text-[#b4b4b4] hover:text-[#ececec] transition-colors underline-offset-2 hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
