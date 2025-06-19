
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
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-background to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            Unlock <span className="hero-gradient-text">Actionable Insights</span>.
            <br />
            Transform Your Data.
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
            SkyAnalytics empowers your business with cutting-edge analytics. Simplify complexity, discover hidden patterns, and drive growth with our intuitive and powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button size="lg" asChild className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary/5 shadow-md hover:shadow-lg transition-all duration-300">
              <Link href="#features">
                Explore Features
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Platform Preview Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Visualize Your Success
            </h2>
            <p className="text-md md:text-lg text-muted-foreground mt-3 max-w-xl mx-auto">
              Experience the clarity and power of SkyAnalytics with a platform designed for results.
            </p>
          </div>
          <div className="relative aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border-4 border-primary/20">
            <Image
              src="https://placehold.co/1200x675.png/E0E7FF/1E3A8A?text=SkyAnalytics+Platform+UI" // Placeholder for platform screenshot
              alt="SkyAnalytics Platform Interface"
              layout="fill"
              objectFit="cover"
              data-ai-hint="dashboard analytics platform"
              className="transition-transform duration-500 hover:scale-105"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
             <div className="absolute bottom-6 left-6 p-4 bg-black/50 rounded-lg backdrop-blur-sm">
                <h3 className="text-white text-xl font-semibold">Intuitive Dashboards</h3>
                <p className="text-slate-300 text-sm">Real-time data at your fingertips.</p>
             </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold uppercase text-primary tracking-wider">Why SkyAnalytics?</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
              Everything You Need to Analyze, Decide, and Grow
            </h2>
            <p className="text-md md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Our platform is packed with features to help you make sense of your data and turn it into a competitive advantage.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={BarChart2}
              title="Advanced Analytics"
              description="Go beyond basic reporting. Utilize predictive modeling, machine learning insights, and complex data visualizations."
            />
            <FeatureCard
              icon={Zap}
              title="Real-time Data Processing"
              description="Access and analyze your data as it happens. Make informed decisions faster with up-to-the-second insights."
            />
            <FeatureCard
              icon={Eye}
              title="Intuitive Visualizations"
              description="Transform raw data into beautiful, easy-to-understand charts and dashboards. Communicate your findings effectively."
            />
            <FeatureCard
              icon={Puzzle}
              title="Seamless Integrations"
              description="Connect SkyAnalytics with your existing tools and data sources effortlessly. A unified view of your entire data ecosystem."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Enterprise-Grade Security"
              description="Your data's security is our top priority. Benefit from robust security measures and compliance standards."
            />
            <FeatureCard
              icon={Users}
              title="Collaborative Workspace"
              description="Share insights, collaborate on reports, and work together with your team in a secure, shared environment."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section (Simplified) */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Get Started in 3 Simple Steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Data</h3>
              <p className="text-muted-foreground text-sm">Easily link your databases, cloud services, or upload files.</p>
            </div>
            <div className="flex flex-col items-center">
               <div className="p-4 bg-primary/10 rounded-full mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Analyze & Visualize</h3>
              <p className="text-muted-foreground text-sm">Use our powerful tools to explore data and create insightful reports.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Drive Decisions</h3>
              <p className="text-muted-foreground text-sm">Share insights, collaborate, and make data-driven choices with confidence.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonial Placeholder Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center">
            <Image 
              src="https://placehold.co/100x100/E0E7FF/1E3A8A.png?text=Logo" 
              alt="Client Logo" 
              width={80} 
              height={80} 
              className="mx-auto rounded-full mb-6"
              data-ai-hint="company logo" 
            />
            <blockquote className="max-w-3xl mx-auto text-xl md:text-2xl font-medium text-foreground italic">
              “SkyAnalytics has revolutionized how we approach data. The insights are invaluable, and the platform is incredibly user-friendly.”
            </blockquote>
            <p className="mt-6 text-md font-semibold text-primary">- Jane Doe, CTO at InnovateCorp</p>
            <p className="text-sm text-muted-foreground">Trusted by leading businesses worldwide.</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Elevate Your Data Strategy?
          </h2>
          <p className="max-w-xl mx-auto text-lg md:text-xl text-primary-foreground/90 mb-10">
            Join thousands of professionals who trust SkyAnalytics to turn data into their most valuable asset.
          </p>
          <Button size="lg" variant="outline" asChild className="text-lg px-10 py-6 bg-white text-primary hover:bg-slate-100 border-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <Link href="/register">
              Sign Up For Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
