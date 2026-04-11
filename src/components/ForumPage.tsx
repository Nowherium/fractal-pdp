import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

function ForumPage() {
  // URL temporaire à remplacer par votre vrai domaine NodeBB
  const forumUrl = "https://forum-Escale.duckdns.org/"; 

  return (
    <Panel>
      <h2>Espace Roleplay & Forum</h2>
      <InfoText>
        Bienvenue dans le centre de communication de Fractal. C'est ici que se déroulent 
        les scènes RP, les discussions HRP et l'évolution narrative de vos personnages.
      </InfoText>
      
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-border-soft bg-soft-bg p-8 text-center">
        <span className="mb-4 text-5xl">🌌</span>
        <h3 className="mb-2 text-xl font-bold text-[#f1f1f1]">Rejoindre le Forum NodeBB</h3>
        <p className="mb-6 max-w-md text-gray-400">
          Notre espace d'écriture est hébergé sur une plateforme dédiée pour vous offrir 
          la meilleure expérience de lecture, des notifications en temps réel et un confort optimal.
        </p>
        <Button 
          variant="primary" 
          className="px-8 py-3 text-lg mt-0"
          onClick={() => window.open(forumUrl, '_blank', 'noopener,noreferrer')}
        >
          Ouvrir le Forum ↗
        </Button>
      </div>
    </Panel>
  );
}

export default ForumPage;
