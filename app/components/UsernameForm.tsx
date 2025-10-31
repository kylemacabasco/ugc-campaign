"use client";

import React, { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserProfile } from '@/app/hooks/useUserProfile';

interface UsernameFormProps {
  isFirstTime?: boolean;
  onComplete?: () => void;
}

export default function UsernameForm({ isFirstTime = false, onComplete }: UsernameFormProps) {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const { user } = useAuth();
  const { updateUsername, checkUsernameAvailable, error: profileError, isUpdating } = useUserProfile();

  // Validate username format
  const validateUsername = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) {
      return 'Username is required';
    }

    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters long';
    }

    if (trimmed.length > 20) {
      return 'Username must be less than 20 characters long';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return 'Username can only contain letters, numbers, and underscores';
    }

    return '';
  };

  // Check username availability with debouncing
  const checkAvailability = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed || validateUsername(trimmed)) {
      setIsAvailable(null);
      return;
    }

    // Check if this is already their current username
    if (user?.username && user.username.toLowerCase() === trimmed.toLowerCase()) {
      setIsAvailable(false); // Set to false to prevent green checkmark
      setValidationError('This is already your current username');
      return;
    }

    setIsChecking(true);
    try {
      const available = await checkUsernameAvailable(trimmed);
      setIsAvailable(available);
    } catch (err) {
      console.error('Error checking username availability:', err);
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  // Handle username input change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);

    // Only set validation error for format issues, not "already your username"
    const formatError = validateUsername(value);
    setValidationError(formatError);

    // Reset availability check
    setIsAvailable(null);

    // Debounce availability check
    const timeoutId = setTimeout(() => {
      checkAvailability(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = username.trim();
    const validation = validateUsername(trimmed);

    if (validation) {
      setValidationError(validation);
      return;
    }

    if (isAvailable === false) {
      setValidationError('Username is not available');
      return;
    }

    if (isAvailable === null) {
      // Check availability one more time before submitting
      await checkAvailability(trimmed);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUsername(trimmed);
      onComplete?.();
    } catch (err) {
      // Error is handled by the useUserProfile hook
    }
  };

  // Handle skip (only for first-time users)
  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-card rounded-xl shadow-soft border-2 border-border">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-charcoal tracking-tight">
          {isFirstTime ? 'Welcome!' : 'Update Username'}
        </h2>
        <p className="text-charcoal-light mt-3 leading-relaxed">
          {isFirstTime 
            ? 'Choose a username for your account' 
            : 'Change your username'
          }
        </p>
        {user?.wallet_address && (
          <p className="text-sm text-charcoal-light mt-2 font-mono">
            {user.wallet_address.slice(0, 8)}…{user.wallet_address.slice(-8)}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-charcoal mb-2">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter your username"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all bg-parchment text-charcoal placeholder-charcoal-light/50 ${
                validationError || (isAvailable === false)
                  ? 'border-red-300'
                  : isAvailable === true
                  ? 'border-sage'
                  : 'border-border focus:border-sage'
              }`}
              disabled={isSubmitting}
            />
            {isChecking && (
              <div className="absolute right-3 top-3.5">
                <div className="animate-spin h-5 w-5 border-2 border-sage border-t-transparent rounded-full"></div>
              </div>
            )}
            {!isChecking && isAvailable === true && (
              <div className="absolute right-3 top-3.5 text-sage">
                ✅
              </div>
            )}
            {!isChecking && isAvailable === false && (
              <div className="absolute right-3 top-3.5 text-red-600">
                ❌
              </div>
            )}
          </div>

          {validationError && (
            <p className="text-red-700 text-sm mt-2">{validationError}</p>
          )}

          {!validationError && isAvailable === false && (
            <p className="text-red-700 text-sm mt-2">Username is already taken</p>
          )}

          {!validationError && isAvailable === true && (
            <p className="text-sage-dark text-sm mt-2">Username is available!</p>
          )}
          
          {profileError && (
            <p className="text-red-700 text-sm mt-2">{profileError}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isUpdating || !!validationError || isAvailable !== true}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              isSubmitting || !!validationError || isAvailable !== true
                ? 'bg-charcoal-light/30 text-charcoal-light cursor-not-allowed'
                : 'bg-sage text-white hover:bg-sage-dark shadow-soft hover:shadow-soft-lg'
            }`}
          >
          
            {isUpdating ? 'Verifying & Saving…' : isFirstTime ? 'Create Username' : 'Sign & Update Username'}
          </button>

          {isFirstTime && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={isUpdating}
              className="px-5 py-3 text-charcoal-light hover:text-charcoal font-medium transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </form>

      {!isFirstTime && (
        <div className="mt-6 p-4 bg-earth/5 border-2 border-earth/20 rounded-lg">
          <p className="text-sm text-charcoal-light leading-relaxed">
            <strong className="text-charcoal">Note:</strong> In the future, you&apos;ll need to sign a transaction to verify wallet ownership before changing your username.
          </p>
        </div>
      )}
    </div>
  );
}