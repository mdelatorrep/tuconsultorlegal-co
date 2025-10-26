import DemoResearchMockup from './demo/DemoResearchMockup';
import DemoAnalysisMockup from './demo/DemoAnalysisMockup';
import DemoDraftingMockup from './demo/DemoDraftingMockup';
import DemoStrategyMockup from './demo/DemoStrategyMockup';
import DemoCRMMockup from './demo/DemoCRMMockup';
import DemoAgentsMockup from './demo/DemoAgentsMockup';

export default function DemoScreenshotsPage() {
  const mockups = [
    { id: 'research', name: 'Investigación Legal IA', component: DemoResearchMockup },
    { id: 'analysis', name: 'Análisis Documental', component: DemoAnalysisMockup },
    { id: 'drafting', name: 'Redacción Inteligente', component: DemoDraftingMockup },
    { id: 'strategy', name: 'Estrategia Legal', component: DemoStrategyMockup },
    { id: 'crm', name: 'Gestión de Clientes', component: DemoCRMMockup },
    { id: 'agents', name: 'Agentes IA', component: DemoAgentsMockup },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Portal Demo Screenshots</h1>
        
        {mockups.map(({ id, name, component: Component }) => (
          <div key={id} id={`demo-${id}`} className="mb-16">
            <h2 className="text-2xl font-semibold mb-4">{name}</h2>
            <div className="border-4 border-primary/20 rounded-lg overflow-hidden shadow-2xl">
              <Component />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
