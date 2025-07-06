-- Insert test documents with different statuses
INSERT INTO public.document_tokens (token, document_type, document_content, status, price, user_email, user_name) VALUES
('DOC001', 'Contrato de Arrendamiento', 'CONTRATO DE ARRENDAMIENTO

Entre [ARRENDADOR], mayor de edad, domiciliado en [DIRECCIÓN], identificado con [DOCUMENTO], quien en adelante se denominará EL ARRENDADOR, y [ARRENDATARIO], mayor de edad, domiciliado en [DIRECCIÓN], identificado con [DOCUMENTO], quien en adelante se denominará EL ARRENDATARIO, se celebra el presente contrato de arrendamiento.

CLAUSULAS:
PRIMERA: Objeto del contrato
SEGUNDA: Valor del canon de arrendamiento
TERCERA: Duración del contrato', 'solicitado', 250000, 'cliente1@email.com', 'María González'),

('DOC002', 'Poder General', 'PODER GENERAL

Yo, [PODERDANTE], mayor de edad, identificado con [DOCUMENTO], domiciliado en [CIUDAD], por medio del presente documento otorgo poder amplio y suficiente a [APODERADO], mayor de edad, identificado con [DOCUMENTO], para que a mi nombre y representándome pueda:

1. Comprar, vender, permutar toda clase de bienes
2. Celebrar contratos de cualquier naturaleza
3. Representarme ante toda clase de autoridades', 'solicitado', 180000, 'cliente2@email.com', 'Carlos Rodríguez'),

('DOC003', 'Demanda Ejecutiva', 'DEMANDA EJECUTIVA

Señor Juez Civil del Circuito:

[DEMANDANTE], mayor de edad, identificado con [DOCUMENTO], domiciliado en [CIUDAD], por intermedio de apoderado que acredita su personería, me permito presentar DEMANDA EJECUTIVA contra [DEMANDADO].

HECHOS:
1. El día [FECHA] el demandado suscribió pagaré
2. La obligación se encuentra vencida
3. Se han realizado cobros prejurídicos', 'en_revision_abogado', 450000, 'cliente3@email.com', 'Ana Martínez'),

('DOC004', 'Testamento', 'TESTAMENTO

Yo, [TESTADOR], mayor de edad, identificado con [DOCUMENTO], domiciliado en [CIUDAD], en pleno uso de mis facultades mentales, por el presente acto dispongo de mis bienes para después de mi muerte de la siguiente manera:

CLAUSULAS:
PRIMERA: Revoco cualquier testamento anterior
SEGUNDA: Instituyo como herederos universales
TERCERA: Nombro como albacea', 'solicitado', 320000, 'cliente4@email.com', 'Roberto Silva'),

('DOC005', 'Compraventa Vehículo', 'CONTRATO DE COMPRAVENTA DE VEHÍCULO

Entre [VENDEDOR] y [COMPRADOR] se celebra el presente contrato de compraventa de vehículo:

DATOS DEL VEHÍCULO:
Marca: [MARCA]
Modelo: [MODELO]
Año: [AÑO]
Placa: [PLACA]
Motor: [MOTOR]

CLAUSULAS:
PRIMERA: Precio de venta
SEGUNDA: Forma de pago
TERCERA: Entrega del vehículo', 'en_revision_abogado', 150000, 'cliente5@email.com', 'Luis Pérez');