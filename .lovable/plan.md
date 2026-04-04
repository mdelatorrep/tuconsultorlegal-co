
Objetivo: convertir el módulo de Redacción en un “workspace” realmente usable, donde el editor pueda crecer, el Copilot permanezca cerca sin estorbar, y el usuario pueda redimensionar de forma evidente y estable.

1. Diagnóstico confirmado
- El problema principal no es funcional sino de layout.
- El editor está limitado por dos restricciones acumuladas:
  - `DraftModule.tsx` usa una altura fija `calc(100vh - 180px)`.
  - `src/index.css` fuerza `.ql-editor { max-height: 500px; }`, lo que impide que el editor aproveche el alto disponible.
- El divisor de paneles es demasiado delgado (`w-px`), por eso “no se puede agrandar” en la práctica aunque técnicamente exista resize.
- El Copilot ocupa demasiado espacio vertical con chips + acciones rápidas + input, reduciendo el área real del chat.
- No hay adaptación móvil/tablet: el split horizontal se mantiene incluso cuando ya no cabe bien.

2. Cambios a implementar
- Hacer que el estudio de redacción use layout flexible real:
  - Reemplazar alturas fijas por una estructura con `flex`, `min-h-0`, `h-full`.
  - Permitir que el editor y el chat llenen el alto disponible del contenedor padre.
- Liberar ReactQuill para que crezca:
  - Quitar el `max-height: 500px` global o sobrescribirlo específicamente en el módulo de redacción.
  - Hacer que `.ql-container` y `.ql-editor` ocupen el alto del panel.
- Mejorar el resize:
  - Engrosar visualmente y funcionalmente el `ResizableHandle`.
  - Hacerlo más visible al hover y con zona de agarre más amplia.
  - Ajustar límites para que el abogado pueda dar mucho más espacio al editor cuando lo necesite.
- Reorganizar el workspace:
  - Header compacto arriba.
  - Editor dominante a la izquierda.
  - Copilot a la derecha, pero colapsable.
  - En pantallas medianas/pequeñas, pasar a modo apilado o drawer en vez de split forzado.
- Simplificar visualmente el Copilot:
  - Reducir peso vertical de chips y acciones rápidas.
  - Mantener el input siempre visible abajo.
  - Dar más altura al área de mensajes.
- Hacer persistente la preferencia de tamaño/visibilidad:
  - Recordar ancho del Copilot y si quedó abierto/cerrado.

3. Diseño propuesto
```text
[ Header compacto: tipo | título | guardar | PDF | Copilot ]

[ Editor principal ==================== | Copilot ===== ]
[ toolbar quill                                      ]
[ documento                                          ]
[ documento                                          ]
[ documento                                          ]
[ documento                                          ]
```

Responsive:
```text
Desktop:
[ Editor | Copilot resizable ]

Tablet:
[ Editor grande ]
[ Copilot colapsable / apilado ]

Mobile:
[ Editor ]
[ Botón "Abrir asistente" -> panel inferior o modal ]
```

4. Archivos a tocar
- `src/components/lawyer-modules/DraftModule.tsx`
  - Rehacer el layout del estudio.
  - Ajustar paneles, tamaños mínimos/máximos y comportamiento responsive.
  - Persistir tamaño del Copilot.
- `src/components/lawyer-modules/draft/DraftCopilotPanel.tsx`
  - Reducir densidad visual.
  - Dar prioridad al chat y al input.
  - Mejorar distribución vertical interna.
- `src/components/ui/resizable.tsx`
  - Agrandar el handle y hacerlo más visible/usables.
- `src/index.css`
  - Eliminar o sobrescribir la restricción global de altura de Quill para este módulo.

5. Detalles técnicos
- Usar `useIsMobile()` para cambiar entre split horizontal y layout apilado.
- En el editor, asegurar:
  - contenedor padre con `min-h-0`
  - `.quill`, `.ql-container`, `.ql-editor` con `h-full`
- En vez de depender de `100vh`, dejar que el módulo herede el alto del shell del dashboard.
- Revisar que el split use `autoSaveId` o estado persistido para recordar ancho del Copilot.
- Mantener el Copilot oculto antes de generar, pero cuando aparezca debe abrirse en un layout útil desde el primer momento.

6. Resultado esperado
- El editor podrá ocupar casi toda la pantalla cuando el abogado lo necesite.
- El Copilot seguirá cerca, pero sin bloquear la redacción.
- El divisor será fácil de usar.
- El chat se sentirá como chat real, no como una tarjeta comprimida.
- La experiencia será usable en desktop, tablet y mobile.

7. Validación al implementar
- Verificar que el editor pueda crecer más allá de 500px.
- Verificar que el divisor se pueda arrastrar fácilmente.
- Verificar que el Copilot no robe demasiado alto al área de mensajes.
- Verificar el flujo completo: generar borrador → editar → pedir ajuste al Copilot → insertar texto.
- Verificar en desktop y mobile/tablet que no haya recortes ni áreas muertas.
