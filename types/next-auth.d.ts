import { SellerType } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      sellerType?: SellerType | null;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth" {
  interface User {
    sellerType?: SellerType | null;
    isAdmin?: boolean;
  }
}