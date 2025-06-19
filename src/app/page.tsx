
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart2, Zap, Eye, Puzzle, ShieldCheck, Users } from 'lucide-react';
import Image from 'next/image';

const FeatureCard = ({ icon, title, description }: { icon: React.ElementType; title: string; description: string }) => {
  const IconComponent = icon;
  return (
    <div className="flex flex-col items-start p-6 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="p-3 mb-4 bg-primary/10 rounded-lg">
        <IconComponent className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
};

export default function LandingPage() {
  return (
    <>
      {/* Seção Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-background to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            Desbloqueie <span className="hero-gradient-text">Insights Acionáveis</span>.
            <br />
            Transforme Seus Dados.
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
            SkyAnalytics capacita seu negócio com análises de ponta. Simplifique a complexidade, descubra padrões ocultos e impulsione o crescimento com nossa plataforma intuitiva e poderosa.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button size="lg" asChild className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              <Link href="/register">
                Comece Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary/5 shadow-md hover:shadow-lg transition-all duration-300">
              <Link href="#features">
                Explore os Recursos
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Seção de Prévia da Plataforma */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Visualize Seu Sucesso
            </h2>
            <p className="text-md md:text-lg text-muted-foreground mt-3 max-w-xl mx-auto">
              Experimente a clareza e o poder do SkyAnalytics com uma plataforma projetada para resultados.
            </p>
          </div>
          <div className="relative aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border-4 border-primary/20">
            <Image
              src="https://placehold.co/1200x675.png/E0E7FF/1E3A8A?text=UI+Plataforma+SkyAnalytics" 
              alt="Interface da Plataforma SkyAnalytics"
              layout="fill"
              objectFit="cover"
              data-ai-hint="dashboard analytics platform"
              className="transition-transform duration-500 hover:scale-105"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
             <div className="absolute bottom-6 left-6 p-4 bg-black/50 rounded-lg backdrop-blur-sm">
                <h3 className="text-white text-xl font-semibold">Painéis Intuitivos</h3>
                <p className="text-slate-300 text-sm">Dados em tempo real ao seu alcance.</p>
             </div>
          </div>
        </div>
      </section>

      {/* Seção de Recursos */}
      <section id="features" className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold uppercase text-primary tracking-wider">Por que SkyAnalytics?</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
              Tudo o que Você Precisa para Analisar, Decidir e Crescer
            </h2>
            <p className="text-md md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Nossa plataforma está repleta de recursos para ajudá-lo a entender seus dados e transformá-los em uma vantagem competitiva.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={BarChart2}
              title="Análises Avançadas"
              description="Vá além dos relatórios básicos. Utilize modelagem preditiva, insights de machine learning e visualizações de dados complexas."
            />
            <FeatureCard
              icon={Zap}
              title="Processamento de Dados em Tempo Real"
              description="Acesse e analise seus dados conforme eles acontecem. Tome decisões informadas mais rapidamente com insights atualizados."
            />
            <FeatureCard
              icon={Eye}
              title="Visualizações Intuitivas"
              description="Transforme dados brutos em gráficos e painéis bonitos e fáceis de entender. Comunique suas descobertas de forma eficaz."
            />
            <FeatureCard
              icon={Puzzle}
              title="Integrações Perfeitas"
              description="Conecte o SkyAnalytics com suas ferramentas e fontes de dados existentes sem esforço. Uma visão unificada de todo o seu ecossistema de dados."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Segurança de Nível Empresarial"
              description="A segurança dos seus dados é nossa principal prioridade. Beneficie-se de medidas de segurança robustas e padrões de conformidade."
            />
            <FeatureCard
              icon={Users}
              title="Espaço de Trabalho Colaborativo"
              description="Compartilhe insights, colabore em relatórios e trabalhe junto com sua equipe em um ambiente seguro e compartilhado."
            />
          </div>
        </div>
      </section>

      {/* Seção Como Funciona (Simplificada) */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Comece em 3 Passos Simples
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Conecte Seus Dados</h3>
              <p className="text-muted-foreground text-sm">Conecte facilmente seus bancos de dados, serviços em nuvem ou envie arquivos.</p>
            </div>
            <div className="flex flex-col items-center">
               <div className="p-4 bg-primary/10 rounded-full mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Analise e Visualize</h3>
              <p className="text-muted-foreground text-sm">Use nossas ferramentas poderosas para explorar dados e criar relatórios perspicazes.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Impulsione Decisões</h3>
              <p className="text-muted-foreground text-sm">Compartilhe insights, colabore e tome decisões baseadas em dados com confiança.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Seção de Depoimento (Placeholder) */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center">
            <Image 
              src="https://placehold.co/100x100/E0E7FF/1E3A8A.png?text=Logo" 
              alt="Logo do Cliente" 
              width={80} 
              height={80} 
              className="mx-auto rounded-full mb-6"
              data-ai-hint="company logo"
            />
            <blockquote className="max-w-3xl mx-auto text-xl md:text-2xl font-medium text-foreground italic">
              “O SkyAnalytics revolucionou a forma como abordamos os dados. Os insights são inestimáveis e a plataforma é incrivelmente fácil de usar.”
            </blockquote>
            <p className="mt-6 text-md font-semibold text-primary">- Joana Silva, CTO da InovaCorp</p>
            <p className="text-sm text-muted-foreground">Confiado por empresas líderes em todo o mundo.</p>
          </div>
        </div>
      </section>

      {/* Seção Final de CTA */}
      <section className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para Elevar Sua Estratégia de Dados?
          </h2>
          <p className="max-w-xl mx-auto text-lg md:text-xl text-primary-foreground/90 mb-10">
            Junte-se a milhares de profissionais que confiam no SkyAnalytics para transformar dados em seu ativo mais valioso.
          </p>
          <Button size="lg" variant="outline" asChild className="text-lg px-10 py-6 bg-white text-primary hover:bg-slate-100 border-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <Link href="/register">
              Inscreva-se Gratuitamente Hoje
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
