import { SellerType } from "@prisma/client";
import "next-auth";
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      sellerType?: SellerType | null;
      isAdmin?: boolean;
      aircraftListingsBalance?: number;
      sparePartsListingsBalance?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    sellerType?: SellerType | null;
    isAdmin?: boolean;
    aircraftListingsBalance?: number;
    sparePartsListingsBalance?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    sellerType?: SellerType | null;
    isAdmin?: boolean;
    aircraftListingsBalance?: number;
    sparePartsListingsBalance?: number;
  }
}