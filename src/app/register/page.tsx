
'use client';

import React, { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, Combine } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um endereço de e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signUp, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });
  
  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    await signUp(data.email, data.password);
  };

  useEffect(() => {
    if (user) {
      router.push('/'); 
    }
  }, [user, router]);
  
  if (authLoading && !user) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !authLoading) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-8 text-foreground">
        <Combine className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">SkyAnalytics</span>
      </div>
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-card-foreground">
            <UserPlus className="h-6 w-6 text-primary" />
            Crie Sua Conta
          </CardTitle>
          <CardDescription>Junte-se ao SkyAnalytics para desbloquear insights de dados poderosos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Endereço de E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="voce@exemplo.com"
                className={errors.email ? 'border-destructive focus:border-destructive' : 'focus:border-primary'}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="Crie uma senha (mín. 6 caracteres)"
                className={errors.password ? 'border-destructive focus:border-destructive' : 'focus:border-primary'}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                placeholder="Repita sua senha"
                className={errors.confirmPassword ? 'border-destructive focus:border-destructive' : 'focus:border-primary'}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting || authLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting || authLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Registrar
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Faça login aqui
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
