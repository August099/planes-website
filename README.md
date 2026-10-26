This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Base de datos y migraciones

**Regla: prohibido `prisma db push` contra cualquier base compartida (producción o la de otro desarrollador).**
`db push` cambia la base sin dejar migración, y después `migrate deploy` deja las bases nuevas sin esas tablas y
`migrate dev` quiere resetear la base por la deriva (ver VA-10 en `docs/PLAN_FIXES_MVP.md`).

- **Local:** cambiá `prisma/schema.prisma` y corré `npx prisma migrate dev --name <nombre>`. Revisá el SQL generado en
  `prisma/migrations/<timestamp>_<nombre>/migration.sql` antes de commitearlo.
- **Producción:** las migraciones se aplican de forma explícita en el deploy, con `npm run migrate:deploy`
  (`prisma migrate deploy`) apuntando `DATABASE_URL` a producción. El script `build` ya **no** corre migraciones.
- **Estado:** `npx prisma migrate status` tiene que decir "Database schema is up to date".
- La migración `*_baseline_db_push` recupera lo que se había aplicado con `db push`. En las bases que ya tenían esos
  cambios se marcó como aplicada con `npx prisma migrate resolve --applied <nombre>`; nunca se ejecuta sobre ellas.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
