# Debt & BNPL Truth

Aplicativo FREE BETA para estimar el costo total de deudas y BNPL, comparar current/minimum, avalanche, snowball, pagos extra y una refinanciacion hipotetica.

## Estado

- Produccion GitHub Pages: https://brianpajares.github.io/debt-bnpl-truth/
- Repositorio: https://github.com/brianpajares/debt-bnpl-truth
- Source of truth en Drive: https://drive.google.com/drive/folders/1yr3qFBocowQGqWe4BxbZSL086G1CD3F9
- Motor deterministico en JavaScript puro.
- No requiere login ni conexion bancaria para probar.
- No envia datos financieros a IA ni a terceros.
- Datos seed versionados en `data/`.
- Dossier de pruebas y operacion en `docs/DOSSIER.md`.

## Comandos

```bash
npm test
npm run build
npm run dev
```

## Principios del PRD implementados

- APR, EAR/TEA, TCEA y 0% se convierten por reglas distintas.
- El minimo/cuota siempre lo ingresa el usuario; no se infiere.
- No se inventan cargos.
- Avalanche y snowball conservan presupuesto mensual y ruedan pagos liberados.
- BNPL usa calendario por fechas.
- Refinance es un what-if, no recomendacion de prestamista.
- Horizonte maximo de 600 meses y deteccion de amortizacion negativa.
