-- Crear un documento de ejemplo para pruebas
INSERT INTO public.document_tokens (
  token, 
  document_type, 
  document_content, 
  price, 
  status, 
  user_email, 
  user_name
) VALUES (
  'EJEMPLO123',
  'Contrato de Arrendamiento Residencial',
  'CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA

Entre los suscritos, [NOMBRE_ARRENDADOR], mayor de edad, identificado con cédula de ciudadanía No. [CEDULA_ARRENDADOR], en calidad de ARRENDADOR, y [NOMBRE_ARRENDATARIO], mayor de edad, identificado con cédula de ciudadanía No. [CEDULA_ARRENDATARIO], en calidad de ARRENDATARIO, hemos convenido celebrar el presente contrato de arrendamiento de vivienda urbana, que se regirá por las siguientes cláusulas:

PRIMERA. OBJETO DEL CONTRATO: El ARRENDADOR entrega en arrendamiento al ARRENDATARIO el inmueble ubicado en [DIRECCION_INMUEBLE], de la ciudad de [CIUDAD], con las siguientes características: [CARACTERISTICAS_INMUEBLE].

SEGUNDA. DESTINACIÓN: El inmueble objeto del presente contrato se destinará única y exclusivamente para vivienda familiar del ARRENDATARIO.

TERCERA. PRECIO Y FORMA DE PAGO: El canon mensual de arrendamiento es de [VALOR_CANON] pesos ($[VALOR_CANON]), el cual será pagado por el ARRENDATARIO al ARRENDADOR dentro de los primeros cinco (5) días de cada mes.

CUARTA. DURACIÓN: El presente contrato tendrá una duración de [DURACION_CONTRATO], contados a partir del [FECHA_INICIO] y vencerá el [FECHA_VENCIMIENTO].

QUINTA. DEPÓSITO EN GARANTÍA: El ARRENDATARIO entrega al ARRENDADOR la suma de [VALOR_DEPOSITO] pesos ($[VALOR_DEPOSITO]) como depósito en garantía del cumplimiento de las obligaciones derivadas del presente contrato.

Para constancia se firma en [CIUDAD], a los [DIA] días del mes de [MES] de [AÑO].

_________________________                    _________________________
ARRENDADOR                                   ARRENDATARIO
[NOMBRE_ARRENDADOR]                          [NOMBRE_ARRENDATARIO]
C.C. [CEDULA_ARRENDADOR]                     C.C. [CEDULA_ARRENDATARIO]',
  85000,
  'solicitado',
  'ejemplo@usuario.com',
  'Usuario de Ejemplo'
);