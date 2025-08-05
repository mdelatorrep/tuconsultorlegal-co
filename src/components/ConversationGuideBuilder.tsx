import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, ArrowDown, ArrowUp } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface ConversationBlock {
  id: string;
  name: string;
  introduction: string;
  placeholders: string[];
}

interface ConversationGuideBuilderProps {
  placeholders: string[];
  conversationBlocks: ConversationBlock[];
  onBlocksChange: (blocks: ConversationBlock[]) => void;
}

export const ConversationGuideBuilder: React.FC<ConversationGuideBuilderProps> = ({
  placeholders,
  conversationBlocks,
  onBlocksChange
}) => {
  const [availablePlaceholders, setAvailablePlaceholders] = useState(() => {
    const usedPlaceholders = conversationBlocks.flatMap(block => block.placeholders);
    return placeholders.filter(p => !usedPlaceholders.includes(p));
  });

  const addBlock = () => {
    const newBlock: ConversationBlock = {
      id: `block-${Date.now()}`,
      name: '',
      introduction: '',
      placeholders: []
    };
    onBlocksChange([...conversationBlocks, newBlock]);
  };

  const updateBlock = (blockId: string, updates: Partial<ConversationBlock>) => {
    const updatedBlocks = conversationBlocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    onBlocksChange(updatedBlocks);
    updateAvailablePlaceholders(updatedBlocks);
  };

  const deleteBlock = (blockId: string) => {
    const updatedBlocks = conversationBlocks.filter(block => block.id !== blockId);
    onBlocksChange(updatedBlocks);
    updateAvailablePlaceholders(updatedBlocks);
  };

  const updateAvailablePlaceholders = (blocks: ConversationBlock[]) => {
    const usedPlaceholders = blocks.flatMap(block => block.placeholders);
    setAvailablePlaceholders(placeholders.filter(p => !usedPlaceholders.includes(p)));
  };

  const addPlaceholderToBlock = (blockId: string, placeholder: string) => {
    const block = conversationBlocks.find(b => b.id === blockId);
    if (block && !block.placeholders.includes(placeholder)) {
      updateBlock(blockId, {
        placeholders: [...block.placeholders, placeholder]
      });
    }
  };

  const removePlaceholderFromBlock = (blockId: string, placeholder: string) => {
    const block = conversationBlocks.find(b => b.id === blockId);
    if (block) {
      updateBlock(blockId, {
        placeholders: block.placeholders.filter(p => p !== placeholder)
      });
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(conversationBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onBlocksChange(items);
  };

  if (placeholders.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Primero necesitas crear una plantilla con placeholders en el paso anterior.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">📋 Placeholders Disponibles</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Estos son los campos que se extrajeron de tu plantilla. Organízalos en bloques de conversación.
            </p>
            <div className="flex flex-wrap gap-2">
              {placeholders.map(placeholder => (
                <Badge 
                  key={placeholder} 
                  variant={availablePlaceholders.includes(placeholder) ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {placeholder}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="conversation-blocks">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {conversationBlocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(provided) => (
                    <Card 
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="p-6"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            </div>
                            <h3 className="text-lg font-semibold">
                              Bloque {index + 1}
                            </h3>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBlock(block.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`block-name-${block.id}`}>
                              Nombre del Bloque
                            </Label>
                            <Input
                              id={`block-name-${block.id}`}
                              value={block.name}
                              onChange={(e) => updateBlock(block.id, { name: e.target.value })}
                              placeholder="Ej: Datos del Arrendador"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`block-intro-${block.id}`}>
                              Frase de Introducción
                            </Label>
                            <Input
                              id={`block-intro-${block.id}`}
                              value={block.introduction}
                              onChange={(e) => updateBlock(block.id, { introduction: e.target.value })}
                              placeholder="Ej: Perfecto, empecemos con los datos del propietario del local."
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Placeholders en este Bloque</Label>
                          <div className="mt-2 space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {block.placeholders.map(placeholder => (
                                <Badge 
                                  key={placeholder}
                                  variant="default"
                                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => removePlaceholderFromBlock(block.id, placeholder)}
                                >
                                  {placeholder} ✕
                                </Badge>
                              ))}
                            </div>
                            
                            {availablePlaceholders.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Haz clic en un placeholder para agregarlo a este bloque:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {availablePlaceholders.map(placeholder => (
                                    <Badge 
                                      key={placeholder}
                                      variant="outline"
                                      className="cursor-pointer hover:bg-secondary"
                                      onClick={() => addPlaceholderToBlock(block.id, placeholder)}
                                    >
                                      + {placeholder}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex justify-center">
        <Button onClick={addBlock} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Añadir Bloque de Conversación
        </Button>
      </div>

      {conversationBlocks.length > 0 && (
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>✅ Perfecto!</strong> Has organizado {conversationBlocks.length} bloques de conversación. 
            Lexi seguirá este orden para recopilar la información del cliente.
          </p>
        </Card>
      )}
    </div>
  );
};