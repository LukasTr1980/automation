import { Pool, PoolClient, QueryResult } from "pg";
import { questDbHost, questDbPort } from "../envSwitcher.js";
import * as vaultClient from "./vaultClient.js";
import logger from "../logger.js";

interface QuestDbCredentials {
  user: string;
  password: string;
  database: string;
}

let pool: Pool | undefined;
let credentials: QuestDbCredentials | undefined;
const tableSchemaFactories = new Map<string, () => string>();
const tableInitializationPromises = new Map<string, Promise<void>>();

function assertIdentifier(identifier: string, label: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid ${label} name: ${identifier}`);
  }
}

async function loadCredentials(): Promise<QuestDbCredentials> {
  if (credentials) return credentials;

  await vaultClient.login();
  const secret = await vaultClient.getSecret("kv/data/automation/questdb");
  const data = secret?.data as Record<string, unknown> | undefined;

  const user = (data?.user || data?.username) as string | undefined;
  const password = (data?.password || data?.pass) as string | undefined;
  const database = (data?.database || data?.db || "qdb") as string | undefined;

  if (!user || !password || !database) {
    throw new Error("QuestDB credentials are incomplete");
  }

  credentials = { user, password, database };
  return credentials;
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const creds = await loadCredentials();
  pool = new Pool({
    host: questDbHost,
    port: questDbPort,
    user: creds.user,
    password: creds.password,
    database: creds.database,
    max: 5,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: false,
  });

  pool.on("error", (err: Error) => {
    logger.error("Unexpected QuestDB pool error", err);
  });

  logger.info(`QuestDB pool initialised for host ${questDbHost}:${questDbPort}`);
  return pool;
}

export async function withQuestDbClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const activePool = await getPool();
  const client = await activePool.connect();

  try {
    return await handler(client);
  } finally {
    client.release();
  }
}

export async function execute(query: string, params: unknown[] = []): Promise<QueryResult> {
  const activePool = await getPool();
  return activePool.query(query, params);
}

function ensureTableRegistration(table: string, ddlFactory: () => string): Promise<void> {
  if (tableInitializationPromises.has(table)) {
    return tableInitializationPromises.get(table)!;
  }

  const initPromise = (async () => {
    const existing = await execute(
      "SELECT table_name FROM information_schema.tables WHERE table_name = $1",
      [table],
    );

    if (existing.rowCount && existing.rows.length > 0) {
      return;
    }

    const ddl = ddlFactory();
    if (typeof ddl !== "string" || !ddl.trim()) {
      throw new Error(`DDL factory for table ${table} returned an invalid statement`);
    }

    await execute(ddl);
    logger.info(`QuestDB table ${table} created`);
  })()
    .catch((error) => {
      tableInitializationPromises.delete(table);
      throw error;
    });

  tableInitializationPromises.set(table, initPromise);
  return initPromise;
}

async function ensureRegisteredTable(table: string): Promise<void> {
  const ddlFactory = tableSchemaFactories.get(table);
  if (!ddlFactory) return;

  await ensureTableRegistration(table, ddlFactory);
}

export function registerQuestDbTableSchema(table: string, ddlFactory: () => string): void {
  assertIdentifier(table, "table");
  tableSchemaFactories.set(table, ddlFactory);
}

export async function insertRow(table: string, record: Record<string, unknown>): Promise<void> {
  const columns = Object.keys(record);
  if (!columns.length) {
    throw new Error("insertRow called without any columns");
  }

  assertIdentifier(table, "table");
  await ensureRegisteredTable(table);
  columns.forEach((column) => assertIdentifier(column, "column"));

  const placeholders = columns.map((_, idx) => `$${idx + 1}`);
  const sql = `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES (${placeholders.join(", ")})`;
  const values = columns.map((column) => record[column]);

  await execute(sql, values);
}

export async function verifyConnection(): Promise<void> {
  const result = await execute("SELECT 1 as connected");
  const row = result.rows[0];

  if (!row || row.connected !== 1) {
    throw new Error("QuestDB connectivity check failed");
  }

  logger.info("QuestDB connectivity check succeeded");
}

export async function closePool(): Promise<void> {
  if (!pool) return;

  await pool.end();
  pool = undefined;
  logger.info("QuestDB pool closed");
}
