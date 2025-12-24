import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Check, ChevronsUpDown, Link2, Link2Off, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Case {
  id: string;
  title: string;
  case_number?: string;
  status: string;
  client?: {
    name: string;
  };
}

interface CaseSelectorDropdownProps {
  lawyerId: string;
  selectedCaseId: string | null;
  onCaseSelect: (caseId: string | null, caseData?: Case | null) => void;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const CaseSelectorDropdown: React.FC<CaseSelectorDropdownProps> = ({
  lawyerId,
  selectedCaseId,
  onCaseSelect,
  disabled = false,
  showLabel = true,
  className
}) => {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (lawyerId) {
      fetchCases();
    }
  }, [lawyerId]);

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_cases')
        .select(`
          id,
          title,
          case_number,
          status,
          client:crm_clients(name)
        `)
        .eq('lawyer_id', lawyerId)
        .in('status', ['active', 'on_hold'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'on_hold': return 'En Espera';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  const handleSelect = (caseId: string | null) => {
    const caseData = caseId ? cases.find(c => c.id === caseId) || null : null;
    onCaseSelect(caseId, caseData);
    setOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {showLabel && (
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Vincular a caso (opcional)
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              "justify-between w-full",
              selectedCaseId && "border-primary/50 bg-primary/5"
            )}
          >
            {isLoading ? (
              <span className="text-muted-foreground">Cargando casos...</span>
            ) : selectedCase ? (
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">{selectedCase.title}</span>
                {selectedCase.client?.name && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {selectedCase.client.name}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Sin vincular a caso</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar caso..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Cargando...' : 'No se encontraron casos.'}
              </CommandEmpty>
              
              {/* Option to unlink */}
              <CommandGroup heading="Opciones">
                <CommandItem
                  onSelect={() => handleSelect(null)}
                  className="flex items-center gap-2"
                >
                  <Link2Off className="h-4 w-4" />
                  <span>Sin vincular a caso</span>
                  {!selectedCaseId && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {/* Cases list */}
              {cases.length > 0 && (
                <CommandGroup heading="Casos activos">
                  {cases.map((caseItem) => (
                    <CommandItem
                      key={caseItem.id}
                      value={`${caseItem.title} ${caseItem.case_number || ''} ${caseItem.client?.name || ''}`}
                      onSelect={() => handleSelect(caseItem.id)}
                      className="flex items-center gap-2"
                    >
                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate font-medium">{caseItem.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {caseItem.case_number && <span>{caseItem.case_number}</span>}
                          {caseItem.client?.name && (
                            <>
                              <span>•</span>
                              <span className="truncate">{caseItem.client.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={caseItem.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs flex-shrink-0"
                      >
                        {getStatusLabel(caseItem.status)}
                      </Badge>
                      {selectedCaseId === caseItem.id && (
                        <Check className="ml-1 h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedCase && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Check className="h-3 w-3 text-green-600" />
          <span>El resultado se vinculará al caso seleccionado</span>
        </div>
      )}
    </div>
  );
};

export default CaseSelectorDropdown;
