-- VA-182: miembros fundadores (vuelve el booleano que quitó VA-158, más la fecha) y el límite configurable.
ALTER TABLE "User" ADD COLUMN     "foundingMemberAt" TIMESTAMP(3),
ADD COLUMN     "isFoundingMember" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "QuotaSettings" ADD COLUMN     "foundingMembersLimit" INTEGER NOT NULL DEFAULT 15;
