
# Plan: Integración de Entidades B2B en el CRM

## Contexto del Problema

Actualmente el CRM trata a todos los clientes de la misma manera: una persona = un cliente. Sin embargo, muchos abogados trabajan con **entidades corporativas** que tienen:
- Múltiples contactos (gerente legal, CFO, asistente, CEO)
- Jerarquías organizacionales
- Diferentes interlocutores para diferentes casos
- Contratos marco con la organización, no con individuos

**Ejemplo real**: Un abogado que asesora a Bancolombia necesita registrar:
- La entidad "Bancolombia S.A." con su NIT, sector, tamaño
- María García (Gerente Legal) - contacto principal
- Juan Pérez (Director Financiero) - para temas tributarios  
- Ana Ruiz (Asistente Legal) - para seguimiento operativo

---

## Arquitectura Propuesta

```text
MODELO ACTUAL                      MODELO PROPUESTO
==============                     ================

crm_clients                        crm_entities (NUEVA)
  - individual                       - id, name, nit, sector
  - company (limitado)               - entity_type (corporation, govt, ngo)
      |                              - billing_info, address
      v                              - health_score, lifetime_value
crm_cases                                |
                                         v
                                   crm_contacts (NUEVA)
                                     - id, entity_id (nullable)
                                     - name, email, phone
                                     - role, department
                                     - is_primary_contact
                                         |
                                         v
                                   crm_cases
                                     - entity_id (nullable)
                                     - contact_id (nullable)
                                     - client_id (backward compatible)
```

---

## Componentes a Implementar

### 1. Nueva Tabla: `crm_entities`
Almacena información de organizaciones/empresas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| lawyer_id | UUID | Abogado propietario |
| name | TEXT | Nombre de la entidad |
| legal_name | TEXT | Razón social |
| tax_id | TEXT | NIT/RUT |
| entity_type | TEXT | corporation, government, ngo, association |
| industry | TEXT | Sector (financiero, salud, tecnología) |
| size | TEXT | micro, small, medium, large, enterprise |
| website | TEXT | Sitio web |
| address | TEXT | Dirección principal |
| phone | TEXT | Teléfono principal |
| email | TEXT | Email corporativo |
| billing_address | TEXT | Dirección de facturación |
| notes | TEXT | Notas generales |
| status | TEXT | active, inactive, prospect |
| health_score | INTEGER | Salud de la relación (0-100) |
| lifetime_value | NUMERIC | Valor total facturado |
| contract_type | TEXT | retainer, hourly, fixed, hybrid |
| contract_value | NUMERIC | Valor del contrato marco |
| contract_start | DATE | Inicio del contrato |
| contract_end | DATE | Fin del contrato |

### 2. Nueva Tabla: `crm_contacts`
Personas de contacto dentro de las entidades.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| lawyer_id | UUID | Abogado propietario |
| entity_id | UUID | Entidad a la que pertenece (nullable) |
| name | TEXT | Nombre completo |
| email | TEXT | Email de contacto |
| phone | TEXT | Teléfono directo |
| role | TEXT | Cargo (Gerente Legal, CFO, etc.) |
| department | TEXT | Departamento (Legal, Finanzas, etc.) |
| is_primary | BOOLEAN | Es contacto principal de la entidad |
| is_billing_contact | BOOLEAN | Recibe facturas |
| is_decision_maker | BOOLEAN | Toma decisiones |
| notes | TEXT | Notas sobre el contacto |
| last_contact_date | TIMESTAMP | Última comunicación |
| communication_preference | TEXT | email, phone, whatsapp |
| status | TEXT | active, inactive |

### 3. Modificación: `crm_cases`
Agregar soporte para entidades manteniendo compatibilidad.

```sql
ALTER TABLE crm_cases 
ADD COLUMN entity_id UUID REFERENCES crm_entities(id),
ADD COLUMN primary_contact_id UUID REFERENCES crm_contacts(id);
```

### 4. Modificación: `crm_communications`
Vincular comunicaciones a contactos específicos.

```sql
ALTER TABLE crm_communications 
ADD COLUMN contact_id UUID REFERENCES crm_contacts(id);
```

---

## Nuevos Componentes de UI

### 4.1 `CRMEntitiesView.tsx`
Vista principal de gestión de entidades.

**Características**:
- Lista de entidades con filtros (sector, tamaño, estado)
- Tarjetas con información clave: nombre, contactos, casos activos, valor
- Indicador de salud de la relación
- Acceso rápido a contactos y casos
- Creación/edición con formulario completo

### 4.2 `EntityDetailPage.tsx`
Vista detallada de una entidad.

**Secciones**:
- **Información General**: Datos corporativos, NIT, sector
- **Contactos**: Lista de personas con roles y acciones rápidas
- **Casos**: Historial de casos con la entidad
- **Contrato**: Términos del contrato marco
- **Documentos**: Archivos compartidos con la entidad
- **Comunicaciones**: Historial de interacciones
- **Facturación**: Historial de pagos y pendientes

### 4.3 `ContactsListView.tsx`
Lista de contactos dentro de una entidad.

**Características**:
- Jerarquía visual de contactos
- Badges para roles (Principal, Facturación, Decisor)
- Última comunicación y preferencia de contacto
- Acciones: llamar, email, crear caso

### 4.4 `EntitySelector.tsx`
Componente reutilizable para seleccionar entidad + contacto.

**Uso en**:
- Formulario de nuevo caso
- Formulario de nueva comunicación
- Formulario de nueva cita

---

## Flujos de Usuario

### Flujo 1: Crear Nueva Entidad
1. Usuario va a CRM > Entidades > Nueva Entidad
2. Llena datos corporativos (nombre, NIT, sector)
3. Agrega contacto principal
4. Opcionalmente define contrato marco
5. Entidad creada con contacto vinculado

### Flujo 2: Agregar Contacto a Entidad Existente
1. Usuario abre detalle de entidad
2. En sección Contactos, clic en "Agregar Contacto"
3. Llena datos: nombre, cargo, email, teléfono
4. Marca si es principal/facturación/decisor
5. Contacto vinculado a la entidad

### Flujo 3: Crear Caso para Entidad
1. Usuario crea nuevo caso
2. Selector muestra: "Individual" o "Entidad"
3. Si elige Entidad, selecciona de lista
4. Luego selecciona contacto principal para el caso
5. Caso vinculado a entidad y contacto

### Flujo 4: Convertir Cliente Empresa a Entidad
1. En lista de clientes, cliente tipo "company"
2. Botón "Convertir a Entidad"
3. Wizard migra datos y crea estructura
4. Cliente original se marca como migrado

---

## Navegación Actualizada del CRM

```text
CRM
├── Pipeline (casos visuales)
├── Leads IA
├── Salud (clientes)
├── ─────────────────
├── Entidades (NUEVO)     <- Empresas/Organizaciones
│   ├── Vista lista
│   └── Detalle entidad
│       ├── Contactos
│       ├── Casos
│       └── Contratos
├── Clientes              <- Personas individuales
├── Casos
├── Comunicaciones
├── Documentos
├── Tareas
├── ─────────────────
├── Automatización
└── Analytics
```

---

## Inteligencia y Automatización

### Scoring de Entidades
Factor de puntuación para entidades:
- **Volumen de casos**: +5pts por caso activo
- **Valor de contrato**: +10pts si > $10M/año
- **Antigüedad**: +2pts por año de relación
- **Frecuencia de comunicación**: +5pts si contacto < 7 días
- **Estado de pagos**: -20pts si mora > 30 días

### Alertas Automáticas
- "Contrato de [Entidad] vence en 30 días"
- "Sin comunicación con [Entidad] en 45 días"
- "[Contacto principal] cambió de cargo - actualizar"
- "Nuevo caso potencial detectado para [Entidad]"

---

## Migración de Datos

### Estrategia de Compatibilidad
1. Mantener `crm_clients` funcionando (no breaking change)
2. Clientes tipo "company" pueden migrarse a entidades
3. Nuevos campos `entity_id` y `contact_id` en casos son opcionales
4. Si `entity_id` está presente, usar nueva lógica; si no, usar `client_id`

### Script de Migración
```sql
-- Crear entidades desde clientes tipo company
INSERT INTO crm_entities (lawyer_id, name, email, phone, status)
SELECT lawyer_id, company, email, phone, status
FROM crm_clients
WHERE client_type = 'company' AND company IS NOT NULL;

-- Crear contactos desde clientes tipo company
INSERT INTO crm_contacts (lawyer_id, entity_id, name, email, phone, is_primary)
SELECT c.lawyer_id, e.id, c.name, c.email, c.phone, true
FROM crm_clients c
JOIN crm_entities e ON e.email = c.email AND e.lawyer_id = c.lawyer_id
WHERE c.client_type = 'company';
```

---

## Archivos a Crear

### Nuevos Componentes
- `src/components/lawyer-modules/crm/CRMEntitiesView.tsx`
- `src/components/lawyer-modules/crm/EntityDetailPage.tsx`
- `src/components/lawyer-modules/crm/EntityContactsList.tsx`
- `src/components/lawyer-modules/crm/EntityCasesList.tsx`
- `src/components/lawyer-modules/crm/EntityContractCard.tsx`
- `src/components/lawyer-modules/crm/EntitySelector.tsx`
- `src/components/lawyer-modules/crm/ContactForm.tsx`
- `src/components/lawyer-modules/crm/EntityForm.tsx`

### Modificaciones
- `src/components/lawyer-modules/CRMModule.tsx` - agregar tab Entidades
- `src/components/lawyer-modules/crm/CRMCasesView.tsx` - soporte entity_id
- `src/components/lawyer-modules/crm/CRMClientsView.tsx` - botón migrar
- `src/components/lawyer-modules/crm/CRMCommunicationsView.tsx` - contacto

### Migraciones
- Nueva migración SQL para tablas `crm_entities` y `crm_contacts`
- Alteración de `crm_cases` y `crm_communications`

### Edge Functions
- `supabase/functions/crm-entity-health/index.ts` - scoring de entidades

---

## Fases de Implementación

### Fase 1: Fundamentos (Esta sesión)
1. Crear tablas `crm_entities` y `crm_contacts`
2. Alterar `crm_cases` para soporte dual
3. Componente básico `CRMEntitiesView.tsx`

### Fase 2: UI Completa
1. `EntityDetailPage.tsx` con todas las secciones
2. `EntitySelector.tsx` reutilizable
3. Integración en formularios de casos

### Fase 3: Inteligencia
1. Edge function para scoring de entidades
2. Alertas automáticas de contratos
3. Recomendaciones IA para entidades

---

## Beneficios para el Abogado

| Métrica | Sin Entidades | Con Entidades |
|---------|---------------|---------------|
| Tiempo registro cliente corporativo | 5 min por contacto | 2 min total |
| Visibilidad de relación | Fragmentada | Unificada |
| Seguimiento de contratos | Manual | Automatizado |
| Facturación consolidada | Imposible | Nativa |
| Historial por organización | No existe | Completo |
