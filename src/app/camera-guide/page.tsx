
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink, Camera as CameraIcon, ListChecks, Zap } from 'lucide-react';

export default function CameraGuidePage() {
  const aliexpressUrl = "https://pt.aliexpress.com/item/1005007211573450.html?spm=a2g0o.home.pcJustForYou.8.71991c915x0lm3&gps-id=pcJustForYou&scm=1007.13562.416251.0&scm_id=1007.13562.416251.0&scm-url=1007.13562.416251.0&pvid=530f2ea9-c038-4527-8dad-ba2a664029f2&_t=gps-id:pcJustForYou,scm-url:1007.13562.416251.0,pvid:530f2ea9-c038-4527-8dad-ba2a664029f2,tpp_buckets:668%232846%238115%232000&pdp_ext_f=%7B%22order%22%3A%2287%22%2C%22eval%22%3A%221%22%2C%22sceneId%22%3A%223562%22%7D&pdp_npi=4%40dis%21BRL%21103.15%2194.99%21%21%2117.88%2116.46%21%402101c71a17503455516427397ee15f%2112000039823777188%21rec%21BR%211883207220%21X&utparam-url=scene%3ApcJustForYou%7Cquery_from%3A";

  const communityLinks = [
    { name: "cloudynights.com", count: 2, url: "https://www.cloudynights.com/" },
    { name: "amazon.com", count: 2, url: "https://www.amazon.com/" },
    { name: "ufostop.com", count: 2, url: "http://www.ufostop.com/" },
    { name: "reddit.com", count: 1, url: "https://www.reddit.com/r/UFOs/" },
    { name: "space.com", count: 1, url: "https://www.space.com/" },
  ];

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CameraIcon className="h-7 w-7 text-primary" />
            Que câmera USB usar?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-foreground/90 leading-relaxed">
          
          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">Por que usar uma câmera USB no SkyAnalytics?</h2>
            <ul className="space-y-3 list-disc list-inside">
              <li>
                <span className="font-semibold">Plug-and-play & Compatibilidade:</span> Todas usam padrão UVC, funcionando direto no navegador sem necessidade de drivers.
              </li>
              <li>
                <span className="font-semibold">Resolução e sensibilidade:</span> A opção com night‑vision captura bem em ambientes escuros — essencial para monitorar o céu à noite.
              </li>
              <li>
                <span className="font-semibold">Custo acessível:</span> Permite montar várias estações de monitoramento sem gastar muito.
              </li>
              <li>
                <span className="font-semibold">Consenso da comunidade:</span> Projetos DIY de detecção de UFOs já utilizam webcams USB com sucesso — é uma abordagem comprovada.
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground italic mr-1">Fontes da comunidade:</span>
                  {communityLinks.map(link => (
                    <Link key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-muted/50 px-2 py-0.5 rounded-md hover:bg-muted text-primary hover:underline">
                      {link.name} <span className="text-muted-foreground">({link.count > 1 ? `+${link.count}` : `+${link.count}`})</span> <ExternalLink className="inline h-3 w-3 ml-0.5"/>
                    </Link>
                  ))}
                </div>
              </li>
            </ul>
          </section>

          <div className="my-6 p-4 border border-dashed border-border rounded-lg bg-muted/20 flex flex-col items-center gap-6 text-center">
            <div>
                <p className="text-lg font-semibold text-foreground mb-2">Câmera HD com Visão Noturna (Exemplo)</p>
                <p className="text-sm text-muted-foreground mb-3">
                    Uma câmera como esta, com lente varifocal e boa sensibilidade, é ideal para o SkyAnalytics.
                    Procure por modelos com especificações semelhantes.
                </p>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href={aliexpressUrl} target="_blank" rel="noopener noreferrer">
                        Ver Exemplo no AliExpress <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
          </div>
          
          <section>
            <h2 className="text-xl font-semibold text-primary mb-3 flex items-center">
              <ListChecks className="h-6 w-6 mr-2" />
              Como integrar ao SkyAnalytics:
            </h2>
            <ol className="space-y-3 list-decimal list-inside">
              <li>
                Plugue a câmera USB (no PC ou adaptador OTG no celular), abra o SkyAnalytics no navegador.
              </li>
              <li>
                Permita o acesso à câmera; ela será utilizada pela IA Gemini para capturar e analisar objetos voadores em tempo real.
              </li>
              <li>
                Monitore o céu 24/7: com a função night‑vision, você garante imagens claras também em ambientes escuros.
              </li>
              <li>
                Salve e analise: o software grava vídeos dos eventos suspeitos e permite revisões posteriores.
              </li>
            </ol>
          </section>
          
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-xl font-semibold text-primary mb-3 flex items-center">
                <Zap className="h-6 w-6 mr-2"/>
                Conclusão
            </h2>
            <p className="mb-2">
              Essas câmeras USB representam o equilíbrio ideal entre qualidade, preço e praticidade para quem quer começar a observar o céu com SkyAnalytics.
            </p>
            <p>
              A versão <span className="font-semibold text-accent">night‑vision</span> oferece excelente desempenho noturno — mas mesmo modelos Full HD são mais do que suficientes para a maioria dos usuários.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
