-- Poblar la tabla blog_posts con el contenido existente del sitio web
-- Necesitamos obtener el ID de un admin para asignar como autor

-- Insertar los artículos de blog existentes
INSERT INTO public.blog_posts (
  title, 
  slug, 
  content, 
  excerpt, 
  featured_image, 
  status, 
  author_id, 
  published_at, 
  meta_title, 
  meta_description, 
  tags
) VALUES 
(
  '¿Vas a arrendar? 5 Cláusulas que NO pueden faltar en tu contrato',
  'clausulas-esenciales-contrato-arriendo',
  '# ¿Vas a arrendar? 5 Cláusulas que NO pueden faltar en tu contrato

Arrendar una vivienda es un paso importante que requiere mucha atención en los detalles. Ya seas arrendador o arrendatario, tener un contrato claro y completo es fundamental para evitar problemas futuros.

## ¿Por qué es importante un buen contrato de arriendo?

Un contrato de arriendo bien estructurado protege tanto al propietario como al inquilino, estableciendo reglas claras sobre:
- Los derechos y obligaciones de cada parte
- Las condiciones de pago
- El mantenimiento del inmueble
- Las causales de terminación

## Las 5 cláusulas indispensables

### 1. Identificación completa de las partes y el inmueble

Debe incluir:
- Datos completos del arrendador (nombre, cédula, dirección)
- Datos completos del arrendatario (nombre, cédula, dirección)
- Descripción detallada del inmueble (dirección exacta, área, características)

### 2. Valor del canon de arrendamiento y forma de pago

- Monto exacto del arriendo mensual
- Fecha límite de pago cada mes
- Método de pago aceptado
- Incrementos anuales permitidos por ley

### 3. Duración del contrato

- Fecha de inicio y terminación
- Condiciones para la renovación
- Período de preaviso para terminación

### 4. Depósito de garantía y administración

- Monto del depósito (máximo 2 meses de arriendo)
- Condiciones para su devolución
- Gastos de administración si aplican

### 5. Obligaciones y prohibiciones

Para el arrendatario:
- Pagar puntualmente
- Cuidar el inmueble
- No hacer modificaciones sin autorización

Para el arrendador:
- Entregar el inmueble en buen estado
- Realizar reparaciones necesarias
- Respetar la privacidad del inquilino

## Consejos adicionales

- Siempre revisa el inmueble antes de firmar
- Toma fotos del estado inicial
- Lee todo el contrato antes de firmar
- Guarda copias de todos los documentos

¿Necesitas ayuda con tu contrato de arriendo? Nuestro asistente legal puede ayudarte a crear un documento completo y seguro.',
  'Arrendar una vivienda es un paso importante. Para que tu experiencia sea tranquila y segura, es fundamental tener un contrato claro. Te contamos 5 puntos clave que deben estar sí o sí para protegerte, seas arrendador o arrendatario.',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&auto=format',
  'published',
  (SELECT id FROM public.admin_accounts LIMIT 1),
  now(),
  '5 Cláusulas Esenciales en tu Contrato de Arriendo - Tu Consultor Legal',
  'Descubre las 5 cláusulas que no pueden faltar en tu contrato de arriendo para protegerte como arrendador o arrendatario en Colombia.',
  ARRAY['arriendo', 'vivienda', 'contrato', 'legal', 'inmobiliario']
),
(
  '¿Te despidieron sin justa causa? Conoce tus derechos y cómo calcular tu indemnización',
  'despido-sin-justa-causa-derechos-indemnizacion',
  '# ¿Te despidieron sin justa causa? Conoce tus derechos y cómo calcular tu indemnización

Perder el trabajo es una situación difícil, pero es importante que conozcas tus derechos laborales para asegurar que recibas lo que te corresponde por ley.

## ¿Qué es un despido sin justa causa?

Un despido sin justa causa ocurre cuando el empleador termina el contrato laboral sin que el trabajador haya incurrido en alguna de las faltas graves establecidas en el Código Sustantivo del Trabajo.

## Derechos del trabajador despedido sin justa causa

### Indemnización por despido injusto

La indemnización varía según el tipo de contrato:

**Para contratos a término indefinido:**
- Si el salario es inferior a 10 SMLMV: 30 días de salario por el primer año y 20 días por cada año adicional
- Si el salario es igual o superior a 10 SMLMV: 20 días de salario por cada año de servicio

**Para contratos a término fijo:**
- El valor de los salarios correspondientes al tiempo que falta para cumplir el plazo estipulado del contrato

### Otros pagos que te corresponden

1. **Cesantías**: Un mes de salario por cada año trabajado
2. **Intereses sobre cesantías**: 12% anual sobre las cesantías
3. **Prima de servicios**: Proporcional al tiempo trabajado
4. **Vacaciones**: Proporcionales al tiempo trabajado
5. **Salarios pendientes**: Si hay salarios no pagados

## ¿Cómo calcular tu indemnización?

### Ejemplo práctico

Supongamos que:
- Salario mensual: $2,000,000
- Tiempo trabajado: 3 años y 6 meses
- Salario inferior a 10 SMLMV

**Cálculo:**
- Primer año: 30 días = $2,000,000
- Segundo año: 20 días = $1,333,333
- Tercer año: 20 días = $1,333,333
- 6 meses adicionales: 10 días = $666,667

**Total indemnización: $5,333,333**

## ¿Qué hacer si te despiden?

1. **Solicita por escrito** la liquidación completa
2. **Revisa detalladamente** todos los conceptos
3. **No firmes la liquidación** si no estás de acuerdo
4. **Busca asesoría legal** si tienes dudas

## Plazos importantes

- Tienes **3 años** para reclamar la indemnización
- La liquidación debe entregarse máximo en **30 días**

¿Necesitas ayuda para calcular tu liquidación o tienes dudas sobre tu caso específico? Nuestro asistente legal puede orientarte.',
  'Que te despidan es difícil, pero es clave que conozcas tus derechos. Te explicamos de forma simple qué es un despido sin justa causa y cómo se calcula la indemnización que te corresponde.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop&auto=format',
  'published',
  (SELECT id FROM public.admin_accounts LIMIT 1),
  now(),
  'Despido sin Justa Causa: Derechos e Indemnización en Colombia',
  'Guía completa sobre tus derechos laborales en caso de despido sin justa causa y cómo calcular la indemnización que te corresponde.',
  ARRAY['despido', 'laboral', 'indemnización', 'derechos', 'trabajo']
),
(
  'Guía para comprar o vender un carro usado en Colombia (y no tener dolores de cabeza)',
  'guia-compraventa-vehiculo-usado-colombia',
  '# Guía para comprar o vender un carro usado en Colombia (y no tener dolores de cabeza)

La compraventa de vehículos usados puede ser un proceso complejo, pero con la documentación adecuada puedes evitar problemas futuros y proteger tus intereses.

## Documentos necesarios para la compraventa

### Para el vendedor:
- **Tarjeta de propiedad** del vehículo
- **Cédula de ciudadanía** 
- **SOAT vigente**
- **Revisión técnico-mecánica vigente**
- **Paz y salvo** de infracciones y comparendos

### Para el comprador:
- **Cédula de ciudadanía**
- **Dinero** para el pago acordado
- **Comprobante** del traspaso ante tránsito

## El contrato de compraventa: Tu mejor protección

### Datos que debe incluir el contrato:

#### Información del vehículo:
- Marca, modelo y año
- Placa y número de motor
- Cilindraje y color
- Número de chasis

#### Información de las partes:
- Datos completos del vendedor
- Datos completos del comprador
- Firmas de ambas partes

#### Condiciones de la venta:
- Precio de venta en números y letras
- Forma de pago (contado, financiado)
- Estado del vehículo
- Fecha de entrega

## Proceso paso a paso

### 1. Antes de la compra
- **Verifica** que el vendedor sea el propietario real
- **Revisa** que no tenga reportes por robo
- **Confirma** que esté al día con multas e impuestos
- **Inspecciona** el estado mecánico del vehículo

### 2. Durante la venta
- **Firma** el contrato de compraventa
- **Realiza** el pago según lo acordado
- **Recibe** todos los documentos originales

### 3. Después de la compra
- **Traspasa** el vehículo ante tránsito (máximo 10 días)
- **Actualiza** el SOAT y seguro
- **Realiza** el cambio de propietario en el sistema

## Errores comunes que debes evitar

### Como vendedor:
- No verificar la identidad del comprador
- Entregar el vehículo sin recibir el pago completo
- No informar sobre daños o fallas conocidas

### Como comprador:
- No revisar la documentación completa
- Pagar sin firmar un contrato
- No realizar el traspaso inmediatamente

## Costos aproximados del traspaso

- **Formulario de traspaso**: $50,000 - $80,000
- **Avalúo comercial**: $30,000 - $50,000
- **Impuesto de registro**: 1.5% - 3.5% del avalúo
- **Gastos notariales**: $20,000 - $40,000

## ¿Qué hacer en caso de problemas?

Si después de la compra descubres:
- **Multas ocultas**: El vendedor debe responder
- **Problemas mecánicos** no informados: Busca asesoría legal
- **Documentos falsos**: Denuncia ante las autoridades

¿Necesitas ayuda con tu contrato de compraventa de vehículo? Nuestro asistente puede ayudarte a crear un documento completo y seguro.',
  'Hacer un buen contrato es el secreto para una compraventa de vehículo sin problemas. Te damos una guía paso a paso de lo que debe incluir para proteger tanto al comprador como al vendedor.',
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop&auto=format',
  'published',
  (SELECT id FROM public.admin_accounts LIMIT 1),
  now(),
  'Compraventa de Vehículos Usados: Guía Completa Colombia',
  'Todo lo que necesitas saber para comprar o vender un carro usado en Colombia de forma segura y legal. Documentos, proceso y consejos.',
  ARRAY['vehiculo', 'compraventa', 'usado', 'contrato', 'transito']
),
(
  'El Pagaré: ¿Qué es y por qué es tu mejor amigo para prestar dinero de forma segura?',
  'pagare-prestar-dinero-seguro',
  '# El Pagaré: ¿Qué es y por qué es tu mejor amigo para prestar dinero de forma segura?

Prestar dinero puede ser un acto de solidaridad, pero también un riesgo. El pagaré es un documento simple pero poderoso que te protege cuando decides ayudar económicamente a alguien.

## ¿Qué es un pagaré?

Un pagaré es un título valor mediante el cual una persona (el deudor) se compromete a pagar una suma específica de dinero a otra persona (el acreedor) en una fecha determinada o a la vista.

## Elementos esenciales de un pagaré

### 1. La palabra "pagaré"
Debe aparecer claramente en el documento para identificarlo como tal.

### 2. Promesa de pago
La frase: "Pagaré incondicionalmente a [nombre del acreedor]"

### 3. Cantidad exacta
El monto en números y en letras, ejemplo:
- "$2.000.000 (DOS MILLONES DE PESOS)"

### 4. Fecha de vencimiento
Puede ser:
- **A la vista**: Se paga cuando se presente
- **A fecha fija**: Se paga en una fecha específica
- **A plazo**: Se paga después de cierto tiempo

### 5. Lugar de pago
Donde se debe hacer efectivo el pago

### 6. Fecha y lugar de creación
Cuándo y dónde se firmó el documento

### 7. Firma del deudor
Indispensable para que tenga validez legal

## Ventajas del pagaré

### Para el acreedor (quien presta):
- **Fuerza ejecutiva**: Puede cobrarse judicialmente
- **Transferible**: Se puede endosar a terceros
- **Rápido**: Proceso judicial más ágil
- **Intereses**: Puede incluir intereses de mora

### Para el deudor:
- **Claridad**: Establece términos específicos
- **Plazo definido**: Sabe cuándo debe pagar
- **Evita malentendidos**: Todo queda por escrito

## Tipos de pagaré

### 1. Pagaré simple
Solo incluye los elementos básicos requeridos por ley.

### 2. Pagaré con intereses
Especifica una tasa de interés sobre el capital prestado.

### 3. Pagaré en cuotas
El pago se divide en varias cuotas con fechas específicas.

## Ejemplo de pagaré básico

```
PAGARÉ No. 001

Por este PAGARÉ pagaré incondicionalmente a 
JUAN PÉREZ, identificado con C.C. 12.345.678

La suma de $2.000.000 (DOS MILLONES DE PESOS COLOMBIANOS)

Valor recibido a mi entera satisfacción.

Este pagaré se pagará el día 15 de diciembre de 2024
en la ciudad de Bogotá D.C.

En caso de mora, se causarán intereses del 1.5% mensual.

Bogotá D.C., 15 de octubre de 2024

_________________________
MARÍA GONZÁLEZ
C.C. 87.654.321
```

## ¿Qué pasa si no pagan?

Si el deudor no cumple, puedes:

1. **Proceso ejecutivo**: Más rápido que un proceso ordinario
2. **Embargo de bienes**: Para garantizar el pago
3. **Remate público**: Venta de bienes embargados
4. **Intereses de mora**: Si están estipulados

## Consejos importantes

### Antes de prestar:
- Evalúa la capacidad de pago del deudor
- Define claramente todas las condiciones
- Considera pedir garantías adicionales

### Al crear el pagaré:
- Usa letra clara y legible
- Evita enmendaduras o tachones
- Firma en presencia de testigos si es posible
- Guarda copias del documento

### Durante el plazo:
- Lleva un registro de los pagos
- Comunícate si hay cambios en las condiciones
- Mantén una relación cordial pero firme

## Errores comunes que debes evitar

- **No incluir todos los elementos**: El pagaré puede perder validez
- **Fechas incorrectas**: Pueden generar confusión legal
- **Montos poco claros**: Siempre en números y letras
- **No guardar copias**: Fundamental para cualquier reclamo

¿Necesitas ayuda para crear un pagaré que te proteja? Nuestro asistente legal puede guiarte en el proceso.',
  'Prestar dinero a un amigo o familiar se basa en la confianza, pero un pagaré lo hace seguro. Te explicamos qué es y cómo te protege este documento tan simple y poderoso.',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop&auto=format',
  'draft',
  (SELECT id FROM public.admin_accounts LIMIT 1),
  null,
  'El Pagaré: Guía Completa para Prestar Dinero Seguro',
  'Aprende todo sobre el pagaré como herramienta legal para prestar dinero de forma segura. Elementos, ventajas y ejemplos prácticos.',
  ARRAY['pagare', 'prestamo', 'dinero', 'titulo-valor', 'finanzas']
);