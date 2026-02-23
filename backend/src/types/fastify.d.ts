import { FastifyInstance, FastifyRequest } from "fastify";
import { Queue } from "bullmq";
import { DataRepository } from "../repositories/repository";
import { UserRole } from "./domain";

declare module "fastify" {
  interface FastifyInstance {
    repository: DataRepository;
    provisionQueue: Queue;
  }

  interface FastifyRequest {
    authUser?: {
      id: number;
      role: UserRole;
    };
  }
}

declare module "jsonwebtoken" {
  interface JwtPayload {
    sub?: string;
    role?: UserRole;
    sid?: string;
    type?: "access" | "refresh";
  }
}
