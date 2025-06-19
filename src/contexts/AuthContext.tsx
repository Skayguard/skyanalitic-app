
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendEmailVerification,
  type AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthError = (error: AuthError, defaultMessage: string) => {
    console.error(defaultMessage, error);
    let message = defaultMessage;
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este e-mail já está em uso. Tente fazer login.';
        break;
      case 'auth/invalid-email':
        message = 'O formato do e-mail é inválido.';
        break;
      case 'auth/weak-password':
        message = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        message = 'E-mail ou senha incorretos.';
        break;
      case 'auth/user-disabled':
        message = 'Esta conta de usuário foi desabilitada.';
        break;
      default:
        message = `Erro: ${error.message}`;
    }
    toast({
      title: 'Erro de Autenticação',
      description: message,
      variant: 'destructive',
    });
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await sendVerificationEmail(userCredential.user);
        toast({
          title: 'Registro bem-sucedido!',
          description: 'Enviamos um e-mail de verificação. Por favor, verifique sua caixa de entrada.',
        });
        router.push('/verify-email');
      }
    } catch (error) {
      handleAuthError(error as AuthError, 'Falha ao registrar.');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O redirecionamento é tratado pelo useEffect no AppLayout
    } catch (error) {
      handleAuthError(error as AuthError, 'Falha ao fazer login.');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Falha ao fazer logout', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer logout.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendVerificationEmail = async (userToSend: User) => {
    try {
      await sendEmailVerification(userToSend);
      toast({
        title: 'E-mail Enviado',
        description: 'Um novo e-mail de verificação foi enviado.',
      });
    } catch (error) {
      console.error('Falha ao enviar e-mail de verificação', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail de verificação.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signUp, signIn, signOut, sendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
