-- VA-166: el plan gratis pasa a ser un plan más ("Base"). Va solo: Postgres no deja usar un valor nuevo
-- de un enum en la misma transacción en que se crea.
ALTER TYPE "PlanTier" ADD VALUE 'BASE';
