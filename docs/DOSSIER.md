# Dossier de producto: Debt & BNPL Truth FREE BETA

## Que hace

Convierte los terminos ingresados por el usuario en una simulacion educativa reproducible: costo financiero modelado, mes estimado libre de deuda, comparacion current/avalanche/snowball, carga BNPL por calendario y refinanciacion hipotetica.

## Entornos

- Produccion: https://brianpajares.github.io/debt-bnpl-truth/
- Repositorio: https://github.com/brianpajares/debt-bnpl-truth
- Drive source of truth: https://drive.google.com/drive/folders/1yr3qFBocowQGqWe4BxbZSL086G1CD3F9

## Flujo de prueba

1. Abrir la app.
2. Revisar el portafolio seed: tarjeta, prestamo personal y BNPL.
3. Cambiar el pago extra mensual con el slider.
4. Comparar Current, Avalanche y Snowball.
5. Abrir BNPL calendar y revisar peak month/overlap.
6. Cambiar tasa/plazo/fee de refinance what-if.
7. Editar una deuda: tasa, tipo de tasa, minimo, fees o early payment.

## Como interpretar resultados

- `Current` paga solo los minimos/cuotas ingresados.
- `Avalanche` usa presupuesto constante y dirige excedentes a la tasa mensual modelada mas alta.
- `Snowball` usa presupuesto constante y dirige excedentes al saldo mas pequeno.
- `Savings vs current` compara intereses + fees modelados contra el camino actual.
- `NO_PAYOFF_WITHIN_HORIZON` significa que no se liquido dentro de 600 meses.

## Privacidad

El beta local no pide nombres de acreedores, numeros de cuenta, tarjetas, DNI, contratos ni estados de cuenta. No envia datos financieros a IA. Analytics futuro debe recibir solo eventos no sensibles.

## Datos maestros

La carpeta `data/` contiene los seeds que deben vivir en Google Drive como source of truth:

- manifest y versionado del modelo
- diccionario de inputs
- reglas de conversion APR/EAR/TEA/TCEA/ZERO
- taxonomia de deudas
- estrategias
- benchmarks por mercado
- reglas consumidor/BNPL
- validacion/regresion
- disclosures y configuracion FREE BETA

## Pruebas incluidas

`npm test` valida conversiones de tasas, calendario BNPL, avalanche vs baseline, amortizacion negativa y refinance what-if.

## Limites declarados

El motor usa acumulacion mensual antes del pago. No replica daily interest, average daily balance, grace periods, promociones ni reglas especificas de cada issuer.

## Listo para usuarios

El usuario puede probar el flujo completo sin login. Para produccion con cuentas guardadas, activar Supabase Auth/RLS usando `docs/supabase_schema.sql`, conectar Drive loader a la carpeta del modelo y mantener `raw_financial_data_to_ai=false`.
