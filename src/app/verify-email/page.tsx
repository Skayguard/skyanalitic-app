
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 

export default function VerifyEmailPage() {
  const { user, sendVerificationEmail, isLoading } = useAuth();

  const handleResendEmail = async () => {
    if (user && !user.emailVerified) {
      await sendVerificationEmail(user);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg text-center shadow-xl border-border">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription className="text-muted-foreground">
            We've sent a verification link to your email address. Please click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm">
            If you haven't received the email, please check your spam or junk folder.
          </p>
          {user && !user.emailVerified && (
            <Button 
              onClick={handleResendEmail} 
              variant="outline"
              disabled={isLoading}
              className="border-primary text-primary hover:bg-primary/10"
            >
              Resend Verification Email
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Once your email is verified, you can log in.
          </p>
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
