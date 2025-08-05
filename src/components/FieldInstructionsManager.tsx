import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle, HelpCircle } from 'lucide-react';

interface FieldInstruction {
  id: string;
  fieldName: string;
  validationRule: string;
  helpText: string;
}

interface FieldInstructionsManagerProps {
  placeholders: string[];
  fieldInstructions: FieldInstruction[];
  onInstructionsChange: (instructions: FieldInstruction[]) => void;
}

export const FieldInstructionsManager: React.FC<FieldInstructionsManagerProps> = ({
  placeholders,
  fieldInstructions,
  onInstructionsChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const addInstruction = () => {
    const newInstruction: FieldInstruction = {
      id: `instruction-${Date.now()}`,
      fieldName: '',
      validationRule: '',
      helpText: ''
    };
    onInstructionsChange([...fieldInstructions, newInstruction]);
    setIsExpanded(true);
  };

  const updateInstruction = (instructionId: string, updates: Partial<FieldInstruction>) => {
    const updatedInstructions = fieldInstructions.map(instruction =>
      instruction.id === instructionId ? { ...instruction, ...updates } : instruction
    );
    onInstructionsChange(updatedInstructions);
  };

  const deleteInstruction = (instructionId: string) => {
    const updatedInstructions = fieldInstructions.filter(instruction => instruction.id !== instructionId);
    onInstructionsChange(updatedInstructions);
  };

  const getAvailablePlaceholders = () => {
    const usedFields = fieldInstructions.map(inst => inst.fieldName);
    return placeholders.filter(p => !usedFields.includes(p));
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Instrucciones Específicas por Campo</h3>
            <p className="text-sm text-muted-foreground">
              Opcional: Añade reglas de validación y textos de ayuda para campos específicos
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm"
          >
            {isExpanded ? 'Contraer' : 'Expandir'} ({fieldInstructions.length})
          </Button>
        </div>

        {(isExpanded || fieldInstructions.length > 0) && (
          <div className="space-y-4">
            {fieldInstructions.map((instruction, index) => (
              <Card key={instruction.id} className="p-4 border-l-4 border-l-blue-500">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Instrucción {index + 1}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteInstruction(instruction.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`field-${instruction.id}`}>
                        <HelpCircle className="h-4 w-4 inline mr-1" />
                        Campo
                      </Label>
                      <Select
                        value={instruction.fieldName}
                        onValueChange={(value) => updateInstruction(instruction.id, { fieldName: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {instruction.fieldName && (
                            <SelectItem value={instruction.fieldName}>
                              {instruction.fieldName} (actual)
                            </SelectItem>
                          )}
                          {getAvailablePlaceholders().map(placeholder => (
                            <SelectItem key={placeholder} value={placeholder}>
                              {placeholder}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`validation-${instruction.id}`}>
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Regla de Validación
                      </Label>
                      <Input
                        id={`validation-${instruction.id}`}
                        value={instruction.validationRule}
                        onChange={(e) => updateInstruction(instruction.id, { validationRule: e.target.value })}
                        placeholder="Ej: La fecha no puede ser en el pasado"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`help-${instruction.id}`}>
                        <HelpCircle className="h-4 w-4 inline mr-1" />
                        Texto de Ayuda
                      </Label>
                      <Input
                        id={`help-${instruction.id}`}
                        value={instruction.helpText}
                        onChange={(e) => updateInstruction(instruction.id, { helpText: e.target.value })}
                        placeholder="Ej: Indica la fecha exacta..."
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Button onClick={addInstruction} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Instrucción de Campo
            </Button>
          </div>
        )}

        {fieldInstructions.length === 0 && !isExpanded && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No has definido instrucciones específicas para ningún campo.
            </p>
            <Button onClick={addInstruction} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Primera Instrucción
            </Button>
          </div>
        )}

        {fieldInstructions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Estas instrucciones harán que Lexi sea más inteligente:</strong>
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
              <li>• <strong>Validaciones:</strong> Lexi verificará que los datos cumplan las reglas</li>
              <li>• <strong>Ayuda:</strong> Lexi usará estos textos cuando el usuario tenga dudas</li>
              <li>• <strong>Precisión:</strong> Reduce errores y mejora la calidad de los datos</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};