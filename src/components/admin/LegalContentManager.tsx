import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Save, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LegalContent {
  id: string;
  page_key: string;
  title: string;
  content: string;
  last_updated: string;
}

export function LegalContentManager() {
  const [contents, setContents] = useState<LegalContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('terms-and-conditions');
  const [editingContent, setEditingContent] = useState<LegalContent | null>(null);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_content')
        .select('*')
        .order('page_key');

      if (error) throw error;

      if (!data || data.length === 0) {
        // Initialize content if empty
        await initializeContent();
        return;
      }

      setContents(data);
      const current = data.find(c => c.page_key === selectedPage);
      if (current) {
        setEditingContent(current);
      }
    } catch (error) {
      console.error('Error loading legal content:', error);
      toast.error('Error al cargar el contenido legal');
    } finally {
      setLoading(false);
    }
  };

  const initializeContent = async () => {
    try {
      const { error } = await supabase.functions.invoke('init-legal-content');
      if (error) throw error;
      
      toast.success('Contenido legal inicializado');
      await loadContents();
    } catch (error) {
      console.error('Error initializing content:', error);
      toast.error('Error al inicializar el contenido');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingContent) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('legal_content')
        .update({
          title: editingContent.title,
          content: editingContent.content,
          last_updated: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', editingContent.id);

      if (error) throw error;

      toast.success('Contenido guardado exitosamente');
      await loadContents();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Error al guardar el contenido');
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (pageKey: string) => {
    setSelectedPage(pageKey);
    const content = contents.find(c => c.page_key === pageKey);
    if (content) {
      setEditingContent(content);
    }
  };

  const pageLabels: Record<string, string> = {
    'terms-and-conditions': 'Términos y Condiciones',
    'privacy-policy': 'Política de Privacidad',
    'intellectual-property': 'Propiedad Intelectual'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Cargando contenido legal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gestión de Contenido Legal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPage} onValueChange={handlePageChange}>
            <TabsList className="grid w-full grid-cols-3">
              {Object.entries(pageLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(pageLabels).map((pageKey) => (
              <TabsContent key={pageKey} value={pageKey} className="space-y-4 mt-4">
                {editingContent && editingContent.page_key === pageKey && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="title">Título de la Página</Label>
                      <Input
                        id="title"
                        value={editingContent.title}
                        onChange={(e) =>
                          setEditingContent({ ...editingContent, title: e.target.value })
                        }
                        placeholder="Título de la página"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Contenido (HTML)</Label>
                      <Textarea
                        id="content"
                        value={editingContent.content}
                        onChange={(e) =>
                          setEditingContent({ ...editingContent, content: e.target.value })
                        }
                        placeholder="Contenido en formato HTML..."
                        className="min-h-[400px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Puedes usar HTML para dar formato al contenido. Etiquetas soportadas: h1, h2,
                        h3, p, ul, li, strong, em, a, br
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Vista Previa:</h4>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: editingContent.content }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Última actualización:{' '}
                        {new Date(editingContent.last_updated).toLocaleString('es-CO')}
                      </p>
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
