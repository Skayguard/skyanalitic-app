
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
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verifique seu E-mail</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enviamos um link de verificação para o seu endereço de e-mail. Por favor, clique no link para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm">
            Se você não recebeu o e-mail, verifique sua pasta de spam ou lixo eletrônico.
          </p>
          {user && !user.emailVerified && (
            <Button 
              onClick={handleResendEmail} 
              variant="outline"
              disabled={isLoading}
            >
              Reenviar E-mail de Verificação
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Após verificar seu e-mail, você poderá fazer login.
          </p>
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
