

# Plan: Eliminar confusión CRM vs Portal Clientes

## Problema
El sidebar tiene dos entradas separadas bajo "Clientes": **Gestión CRM** y **Portal Clientes**. Ambas muestran clientes, casos y documentos, causando que el abogado no sepa dónde gestionar sus casos. El "Portal Clientes" en modo abogado es esencialmente una vista de administración de accesos al portal, pero se presenta como otra herramienta de gestión.

## Solución
Absorber la funcionalidad del Portal Clientes dentro del CRM y simplificar la navegación.

### Cambios en el Sidebar (`UnifiedSidebar.tsx`)
- Eliminar "Portal Clientes" como ítem separado del menú
- Renombrar sección de "Clientes" a solo tener: **CRM** y **Calendario Legal**

### Integrar Portal en CRM (`CRMModule.tsx`)
- En el tab **Clientes**, agregar un botón "Gestionar Accesos Portal" que abra un Dialog con la funcionalidad de `InviteClientDialog` y la lista de accesos activos
- En el `ClientDetailPanel.tsx`, agregar un botón/acción "Compartir Portal" que permita generar/copiar el enlace del portal para ese cliente específico

### Nuevo componente: `PortalAccessManager.tsx`
- Dialog que extrae la lógica de administración de accesos de `ClientPortalPage.tsx` (modo abogado): lista de clientes con acceso, invitar cliente, revocar acceso
- Se abre desde el tab Clientes del CRM

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/UnifiedSidebar.tsx` | Eliminar item "Portal Clientes" del menú |
| `src/components/LawyerDashboardPage.tsx` | Eliminar case 'client-portal' (redirigir a CRM si llega) |
| `src/components/lawyer-modules/CRMModule.tsx` | Agregar botón "Gestionar Accesos Portal" en tab Clientes |
| `src/components/lawyer-modules/crm/PortalAccessManager.tsx` | **Nuevo** -- Dialog con gestión de accesos al portal (invitar, revocar, ver enlaces) |
| `src/components/lawyer-modules/crm/ClientDetailPanel.tsx` | Agregar botón "Compartir Portal" con enlace directo al portal del cliente |

### Flujo resultante
El abogado entra al CRM → todo está ahí: procesos, clientes, tareas, novedades. Desde Clientes puede gestionar accesos al portal y compartir enlaces. No hay segunda vista que confunda.

