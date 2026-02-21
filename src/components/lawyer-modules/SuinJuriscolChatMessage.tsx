import { useState } from "react";
import { 
  ExternalLink, 
  Scale, 
  FileText, 
  BookOpen, 
  Gavel, 
  ChevronDown, 
  ChevronRight,
  Quote,
  AlertTriangle,
  CheckCircle2,
  Info,
  Link2,
  Calendar,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SuinJuriscolChatMessageProps {
  content: string;
  timestamp: string;
}

// Enhanced markdown renderer for legal content
function LegalMarkdownRenderer({ content }: { content: string }) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2])); // First 3 sections expanded by default

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  // Detect section type and return appropriate icon
  const getSectionIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('ley') || lowerTitle.includes('norma') || lowerTitle.includes('decreto')) {
      return <FileText className="h-4 w-4 text-primary" />;
    }
    if (lowerTitle.includes('sentencia') || lowerTitle.includes('jurisprudencia') || lowerTitle.includes('corte')) {
      return <Gavel className="h-4 w-4 text-amber-600" />;
    }
    if (lowerTitle.includes('concepto') || lowerTitle.includes('doctrina')) {
      return <BookOpen className="h-4 w-4 text-primary" />;
    }
    if (lowerTitle.includes('fuente') || lowerTitle.includes('referencia') || lowerTitle.includes('enlace')) {
      return <Link2 className="h-4 w-4 text-primary" />;
    }
    if (lowerTitle.includes('conclus') || lowerTitle.includes('resumen')) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (lowerTitle.includes('advertencia') || lowerTitle.includes('importante') || lowerTitle.includes('nota')) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    return <Scale className="h-4 w-4 text-primary" />;
  };

  // Parse and detect legal citations
  const parseLegalCitations = (text: string): React.ReactNode => {
    // Pattern for Colombian legal references
    const patterns = [
      // Leyes: Ley 100 de 1993
      /\b(Ley\s+\d+\s+de\s+\d{4})/gi,
      // Decretos: Decreto 1072 de 2015
      /\b(Decreto\s+\d+\s+de\s+\d{4})/gi,
      // Sentencias: Sentencia C-123 de 2020, T-123/20
      /\b(Sentencia\s+[A-Z]-?\d+(?:\/\d{2}|\s+de\s+\d{4}))/gi,
      // Artículos: Art. 123, Artículo 45
      /\b(Art(?:ículo)?\.?\s*\d+)/gi,
      // Resoluciones
      /\b(Resolución\s+\d+\s+de\s+\d{4})/gi,
    ];

    let result = text;
    
    // Highlight legal citations with badges
    patterns.forEach(pattern => {
      result = result.replace(pattern, '**[$1]**');
    });

    return result;
  };

  // Render inline text with formatting
  const renderInline = (text: string): React.ReactNode => {
    // First process legal citations
    const processedText = parseLegalCitations(text);
    
    // Handle bold with legal citation styling
    const parts = String(processedText).split(/(\*\*\[[^\]]+\]\*\*|\*\*[^*]+\*\*)/g);
    
    return parts.map((part, i) => {
      // Legal citation in brackets
      if (part.startsWith('**[') && part.endsWith(']**')) {
        const citation = part.slice(3, -3);
        return (
          <Badge 
            key={i} 
            variant="outline" 
            className="mx-0.5 bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/30 font-medium"
          >
            {citation}
          </Badge>
        );
      }
      // Regular bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      
      // Handle links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      const linkParts: React.ReactNode[] = [];
      let match;
      
      while ((match = linkRegex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          linkParts.push(part.slice(lastIndex, match.index));
        }
        
        // Detect if it's an official source
        const isOfficialSource = match[2].includes('gov.co') || 
                                  match[2].includes('corteconstitucional') ||
                                  match[2].includes('suin-juriscol') ||
                                  match[2].includes('secretariasenado');
        
        linkParts.push(
          <a 
            key={`link-${i}-${match.index}`}
            href={match[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              isOfficialSource 
                ? 'text-primary bg-primary/10 hover:bg-primary/20 dark:text-primary dark:bg-primary/20 dark:hover:bg-primary/30'
                : 'text-primary hover:text-primary/80 hover:underline'
            }`}
          >
            {isOfficialSource && <Building2 className="h-3 w-3" />}
            {match[1]}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
        lastIndex = match.index + match[0].length;
      }
      
      if (linkParts.length > 0) {
        if (lastIndex < part.length) {
          linkParts.push(part.slice(lastIndex));
        }
        return <span key={i}>{linkParts}</span>;
      }
      
      return part;
    });
  };

  // Parse content into sections
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const sections: { title: string; content: React.ReactNode[]; level: number }[] = [];
    let currentSection: { title: string; content: React.ReactNode[]; level: number } | null = null;
    let listItems: string[] = [];
    let inList = false;

    const flushList = () => {
      if (listItems.length > 0 && currentSection) {
        currentSection.content.push(
          <ul key={`list-${currentSection.content.length}`} className="space-y-2 my-3">
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="leading-relaxed">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const addParagraph = (line: string, key: number) => {
      if (currentSection) {
        currentSection.content.push(
          <p key={key} className="text-sm text-foreground/80 mb-3 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Handle H2 headers as main sections
      if (trimmedLine.startsWith('## ')) {
        flushList();
        if (currentSection) sections.push(currentSection);
        currentSection = {
          title: trimmedLine.slice(3),
          content: [],
          level: 2
        };
        return;
      }

      // Handle H3 headers as sub-sections
      if (trimmedLine.startsWith('### ')) {
        flushList();
        if (currentSection) {
          currentSection.content.push(
            <h4 key={index} className="text-sm font-semibold mt-4 mb-2 text-foreground flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {renderInline(trimmedLine.slice(4))}
            </h4>
          );
        } else {
          currentSection = {
            title: trimmedLine.slice(4),
            content: [],
            level: 3
          };
        }
        return;
      }

      // Handle H1 headers
      if (trimmedLine.startsWith('# ')) {
        flushList();
        if (currentSection) sections.push(currentSection);
        currentSection = {
          title: trimmedLine.slice(2),
          content: [],
          level: 1
        };
        return;
      }

      // Start a default section if none exists
      if (!currentSection) {
        currentSection = {
          title: 'Respuesta',
          content: [],
          level: 0
        };
      }

      // Handle blockquotes for important notes
      if (trimmedLine.startsWith('> ')) {
        flushList();
        currentSection.content.push(
          <div key={index} className="my-3 p-3 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-400 rounded-r-lg">
            <div className="flex items-start gap-2">
              <Quote className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200 italic leading-relaxed">
                {renderInline(trimmedLine.slice(2))}
              </p>
            </div>
          </div>
        );
        return;
      }

      // Handle horizontal rules
      if (trimmedLine === '---') {
        flushList();
        currentSection.content.push(
          <hr key={index} className="my-4 border-border" />
        );
        return;
      }

      // Handle numbered list items
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
        return;
      }

      // Handle bullet list items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.replace(/^[-*•]\s/, ''));
        return;
      }

      // Regular paragraph
      flushList();
      addParagraph(trimmedLine, index);
    });

    flushList();
    if (currentSection) sections.push(currentSection);

    return sections;
  };

  const sections = parseContent(content);

  // If no clear sections, render as single block
  if (sections.length === 0) {
    return (
      <div className="prose prose-sm max-w-none">
        <p className="text-sm text-foreground/80 leading-relaxed">{content}</p>
      </div>
    );
  }

  // If only one section with default title, render content directly
  if (sections.length === 1 && sections[0].level === 0) {
    return (
      <div className="prose prose-sm max-w-none space-y-2">
        {sections[0].content}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <Collapsible
          key={index}
          open={expandedSections.has(index)}
          onOpenChange={() => toggleSection(index)}
        >
          <CollapsibleTrigger className="w-full">
            <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-muted/50 ${
              section.level <= 2 ? 'bg-muted/30' : ''
            }`}>
              {getSectionIcon(section.title)}
              <span className={`flex-1 text-left ${
                section.level === 1 ? 'font-bold text-base' :
                section.level === 2 ? 'font-semibold text-sm' :
                'font-medium text-sm'
              }`}>
                {section.title}
              </span>
              {expandedSections.has(index) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-8 pr-2 py-2 border-l-2 border-primary/30 dark:border-primary/40 ml-2 mt-1">
              {section.content}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

export default function SuinJuriscolChatMessage({ content, timestamp }: SuinJuriscolChatMessageProps) {
  return (
    <div className="bg-gradient-to-br from-card to-muted/30 border rounded-2xl shadow-sm">
      <div className="px-4 py-3 border-b bg-muted/20 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-lg">
            <Scale className="h-4 w-4 text-primary dark:text-primary" />
          </div>
          <span className="text-sm font-medium text-primary dark:text-primary">
            Asistente Legal SUIN
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      <div className="p-4">
        <LegalMarkdownRenderer content={content} />
      </div>
    </div>
  );
}
