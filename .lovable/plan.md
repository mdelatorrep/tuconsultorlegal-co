

# Plan: Correcciones CRM - 9 Hallazgos

## Diagnóstico

### 1. "Lead" no es claro para el abogado
- En `CRMModule.tsx` linea 129: `label: 'Leads'` y en `LeadPipeline.tsx` usa terminología de marketing (nurture, score, pipeline)
- **Solución**: Renombrar "Leads" a "Contactos Potenciales" en toda la UI. Cambiar etapas del pipeline a lenguaje jurídico: "Nuevo Contacto", "Contactado", "En Evaluación", "Reunión Agendada", "Propuesta Enviada", "En Negociación"

### 2. Nuevas tareas falla (pantalla blanca)
- **Causa raíz encontrada**: En `CRMTasksView.tsx` lineas 374 y 394, hay `<SelectItem value="">` (valor vacío). Radix UI Select no soporta strings vacíos como value, lo que causa un crash en el render.
- **Solución**: Cambiar `value=""` por `value="none"` y manejar la conversión a `null` al guardar.

### 3. Eliminar campos de tarifas
- En `CRMClientsView.tsx` el formulario de clientes no tiene tarifas visible, pero en `EntityForm.tsx` lineas 289-340 hay campos de "Contrato Marco" con `contract_value`, `contract_type`, `contract_start`, `contract_end`.
- **Solución**: Eliminar la sección completa de "Contrato Marco" del `EntityForm.tsx` y los campos de tarifa de `EntityDetailPage.tsx`.

### 4. Documentos falla (pantalla blanca)
- **Misma causa raíz**: `CRMDocumentsView.tsx` linea 322 tiene `<SelectItem value="">`.
- **Solución**: Igual que punto 2, cambiar a `value="none"`.

### 5. OneDrive de la Rama Judicial
- La Rama Judicial usa Microsoft 365 (OneDrive/SharePoint) para compartir expedientes digitales. Los juzgados comparten carpetas vía enlaces OneDrive con usuarios externos.
- **Hallazgo**: No hay API pública de la Rama Judicial. Los juzgados comparten vía links de OneDrive/SharePoint con cuentas institucionales `@cendoj.ramajudicial.gov.co`.
- **Solución factible**: Agregar un campo en el formulario de Casos para "Enlace Expediente Digital" donde el abogado pegue el link de OneDrive compartido por el juzgado. No es viable una integración directa con OneDrive de la Rama (no exponen API, es acceso por invitación). Podemos agregar un botón "Abrir Expediente" que abre el link en nueva pestaña.

### 6. Eliminar "B2B" de Empresas
- En `CRMModule.tsx` linea 133: `label: 'Entidades B2B'`
- **Solución**: Cambiar a "Empresas y Entidades"

### 7. Tipos de contrato no claros en Empresas
- En `EntityForm.tsx` lineas 300-305: "Retainer (Iguala)", "Por Hora", "Precio Fijo", "Híbrido"
- **Solución**: Reemplazar con tipos de contrato comunes en Colombia/LATAM: "Contrato de Prestación de Servicios", "Mandato o Poder", "Contrato de Asesoría", "Iguala Mensual", "Honorarios por Caso", "Contrato Llave en Mano". Ya que el punto 3 elimina tarifas, esta sección se elimina junto con el contrato marco.

### 8. El abogado no sabía del portal público
- Existe `LawyerPublicProfileEditor.tsx` y `LawyerPublicProfilePage.tsx` donde el abogado puede crear su perfil y recibir contactos.
- **Solución**: Agregar una tarjeta prominente de onboarding en el CRM cuando no hay clientes ni leads, explicando: "Activa tu Perfil Público para que clientes potenciales te encuentren y te contacten directamente". Link directo al editor de perfil público.

### 9. No hay journey de primera vez del CRM
- **Solución**: Crear un componente `CRMOnboarding` que se muestre cuando el abogado tiene 0 clientes, 0 casos y 0 leads. Incluirá pasos guiados:
  1. "Activa tu Perfil Público" - para recibir contactos
  2. "Agrega tu primer cliente" - botón directo
  3. "Crea tu primer caso" - asociado al cliente
  4. "Gestiona tareas" - seguimiento

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `CRMModule.tsx` | Renombrar "Leads" a "Contactos Potenciales", "Entidades B2B" a "Empresas y Entidades". Mostrar onboarding cuando stats=0 |
| `CRMTasksView.tsx` | Corregir `SelectItem value=""` → `value="none"` (2 instancias) |
| `CRMDocumentsView.tsx` | Corregir `SelectItem value=""` → `value="none"` (1 instancia) |
| `LeadPipeline.tsx` | Renombrar labels de "Lead" a "Contacto Potencial", etapas a lenguaje jurídico |
| `EntityForm.tsx` | Eliminar sección "Contrato Marco" completa. Actualizar tipos de contrato a LATAM |
| `EntityDetailPage.tsx` | Eliminar referencias a tarifas y contratos |
| `CRMEntitiesView.tsx` | Eliminar "B2B" de labels |
| `CRMCasesView.tsx` | Agregar campo "Enlace Expediente Digital" en formulario de casos |
| Nuevo: `CRMOnboarding.tsx` | Componente de onboarding con journey guiado y link a perfil público |

## Alcance estimado
- 9 archivos modificados, 1 nuevo
- No requiere migraciones de base de datos (los campos de contrato se ocultan del UI pero se mantienen en DB)
- Sin dependencias nuevas

