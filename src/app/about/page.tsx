
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Info className="h-7 w-7 text-primary" />
            O que é o SkyAnalytics?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/90 leading-relaxed">
          <p>
            O SkyAnalytics é uma inovadora ferramenta online desenvolvida para a captura e análise de objetos voadores não identificados (UFOs/UAPs) utilizando inteligência artificial de ponta. Combinando tecnologia de visão computacional com a IA Gemini da Google, o SkyAnalytics permite que qualquer usuário, de forma simples e acessível, transforme sua câmera USB — seja no computador ou no celular — em uma estação de monitoramento aéreo em tempo real.
          </p>
          <p>
            Sem a necessidade de equipamentos complexos, basta acessar a plataforma e permitir o uso da câmera para começar a monitorar o céu. O sistema é capaz de detectar, rastrear e analisar objetos anômalos com base em padrões visuais, movimento, brilho, trajetória e características incomuns que escapam às explicações convencionais.
          </p>
          <p>
            Além disso, os dados capturados são processados por inteligência artificial, que oferece análises automáticas e insights científicos para ajudar a diferenciar fenômenos comuns (aviões, satélites, drones) de possíveis UAPs genuínos.
          </p>
          <p>
            O SkyAnalytics é mais do que uma ferramenta: é uma plataforma de colaboração e ciência cidadã, onde entusiastas, pesquisadores e curiosos podem contribuir com observações, compartilhar capturas e construir uma base de dados global sobre o fenômeno UAP.
          </p>
          <p className="font-semibold text-primary">
            Transforme sua câmera em um observatório inteligente com o SkyAnalytics. O céu não é mais o limite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
