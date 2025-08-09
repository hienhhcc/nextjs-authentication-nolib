import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoles = ["admin", "user"] as const;
export type UserRole = (typeof userRoles)[number];
export const userRoleEnum = pgEnum("user_roles", userRoles);

export const UserTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text(),
  salt: text(),
  role: userRoleEnum().notNull().default("user"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const SessionTable = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

export const oAuthProviders = ["discord", "github"] as const;
export type OAuthProvider = (typeof oAuthProviders)[number];
export const oAuthProviderEnum = pgEnum("oauth_providers", oAuthProviders);

export const UserOAuthAccountTable = pgTable(
  "user_oauth_accounts",
  {
    userId: uuid()
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    provider: oAuthProviderEnum().notNull(),
    providerAccountId: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.providerAccountId, table.provider] }),
  ]
);

export const userRelations = relations(UserTable, ({ many }) => ({
  sessions: many(SessionTable),
  oAuthAccounts: many(UserOAuthAccountTable),
}));

export const sessionRelations = relations(SessionTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [SessionTable.userId],
    references: [UserTable.id],
  }),
}));

export const userOAuthAccountRelations = relations(
  UserOAuthAccountTable,
  ({ one }) => ({
    user: one(UserTable, {
      fields: [UserOAuthAccountTable.userId],
      references: [UserTable.id],
    }),
  })
);
