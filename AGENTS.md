# AGENTS.md

## Producto

Debt & BNPL Truth es una herramienta educativa. No recomienda prestamistas, no predice aprobacion, no calcula score crediticio y no promete resultados.

## Reglas no negociables

1. El calculo debe ser deterministico.
2. Los terminos ingresados por el usuario son la fuente autoritativa.
3. APR, EAR/TEA, TCEA y ZERO se tratan como tipos distintos.
4. Nunca inferir formulas de pago minimo de emisores.
5. Nunca agregar fees si el usuario o el modelo versionado no los provee.
6. Avalanche/snowball usan presupuesto mensual constante y rollover.
7. BNPL usa calendario por fecha.
8. Refinance siempre es hipotetico.
9. Raw financial data to AI = false en FREE BETA.
10. Antes de tocar calculos, actualizar pruebas de regresion.

## Privacidad

No pedir ni almacenar numeros de cuenta, tarjeta, documento, contrato completo ni nombres de acreedores. Usar etiquetas genericas.
