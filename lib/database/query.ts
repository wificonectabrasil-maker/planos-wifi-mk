import type { Client, InStatement, InValue } from "@libsql/client";
import { TABLES, type TableName, type ColumnKind } from "./schema";

// The CMS keeps its fluent query contracts. This compiler executes only bound
// SQLite statements; table/column/relation identifiers come from the Core schema.
type Row = Record<string, any>;
type Result<T = Row[]> = {
  data: T | null;
  error: { code: string; message: string; details?: string } | null;
  count: number | null;
};
type Scope = "admin" | "public";
type Fragment = { sql: string; args: InValue[] };
type Projection = {
  column?: string;
  alias?: string;
  table?: TableName;
  fk?: string;
  children?: Projection[];
};

const relations: Record<string, TableName> = {
  silo_id: "silos",
  post_id: "posts",
  source_post_id: "posts",
  target_post_id: "posts",
  parent_post_id: "posts",
  batch_id: "silo_batches",
  occurrence_id: "post_link_occurrences",
};
const columns = (table: TableName) =>
  TABLES[table] as Record<string, ColumnKind>;
function quote(value: string) {
  return `"${value}"`;
}
function column(table: TableName, name: string) {
  if (!Object.hasOwn(columns(table), name))
    throw new Error(`column ${table}.${name} does not exist`);
  return quote(name);
}
function encode(table: TableName, key: string, value: unknown): InValue {
  column(table, key);
  if (value === null || value === undefined) return null;
  if (columns(table)[key] === "json") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  throw new Error(`Unsupported value for ${table}.${key}`);
}
function splitTopLevel(value: string) {
  let depth = 0,
    start = 0;
  const parts: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (depth < 0) throw new Error("Invalid query expression");
    if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (depth !== 0) throw new Error("Invalid query expression");
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}
function parseProjection(table: TableName, value: string): Projection[] {
  return splitTopLevel(value).map((part) => {
    const relation = /^(?:(\w+)\s*:\s*)?(\w+)(?:![\w]+)?\s*\(([\s\S]*)\)$/.exec(
      part,
    );
    if (!relation) {
      if (part !== "*") column(table, part);
      return { column: part };
    }
    const fk = relation[2];
    column(table, fk);
    const relatedTable = relations[fk];
    if (!relatedTable) throw new Error("Unknown Core relation");
    return {
      alias: relation[1] ?? relatedTable,
      fk,
      table: relatedTable,
      children: parseProjection(relatedTable, relation[3]),
    };
  });
}
function publicFilter(table: TableName, alias: string): string {
  const prefix = `${alias}.`;
  if (table === "posts")
    return `${prefix}published = 1 AND ${prefix}deleted_at IS NULL AND EXISTS (SELECT 1 FROM silos visible_silo WHERE visible_silo.id = ${prefix}silo_id AND visible_silo.is_active = 1 AND visible_silo.deleted_at IS NULL)`;
  if (table === "silos")
    return `${prefix}is_active = 1 AND ${prefix}deleted_at IS NULL`;
  if (table === "silo_groups")
    return `EXISTS (SELECT 1 FROM silos visible_silo WHERE visible_silo.id = ${prefix}silo_id AND visible_silo.is_active = 1 AND visible_silo.deleted_at IS NULL)`;
  if (table === "url_redirects") return "1";
  throw new Error("Public access to this table is denied");
}
function projectionSql(
  table: TableName,
  projections: Projection[],
  alias: string,
  scope: Scope,
  asObject = false,
): string {
  const pairs: string[] = [],
    select: string[] = [];
  for (const item of projections) {
    if (item.column) {
      const keys =
        item.column === "*" ? Object.keys(columns(table)) : [item.column];
      for (const key of keys) {
        const expression = `${alias}.${column(table, key)}`;
        select.push(expression);
        pairs.push(`'${key}', ${expression}`);
      }
    } else {
      const target = item.table!;
      const childAlias = quote(`${alias.replaceAll('"', "")}_${item.alias}`);
      const predicate =
        scope === "public" ? ` AND (${publicFilter(target, childAlias)})` : "";
      const expression = `(SELECT ${projectionSql(target, item.children!, childAlias, scope, true)} FROM ${quote(target)} ${childAlias} WHERE ${childAlias}.id = ${alias}.${column(table, item.fk!)}${predicate} LIMIT 1)`;
      select.push(`${expression} AS ${quote(item.alias!)}`);
      pairs.push(`'${item.alias}', json(${expression})`);
    }
  }
  return asObject ? `json_object(${pairs.join(", ")})` : select.join(", ");
}
function decode(table: TableName, row: Row, projections: Projection[]): Row {
  const result = { ...row };
  for (const [key, value] of Object.entries(result)) {
    if (value === null) continue;
    if (columns(table)[key] === "json")
      result[key] = typeof value === "string" ? JSON.parse(value) : value;
    if (columns(table)[key] === "boolean") result[key] = Boolean(value);
  }
  for (const item of projections.filter((p) => p.alias)) {
    const value = result[item.alias!];
    result[item.alias!] =
      value == null
        ? null
        : decode(
            item.table!,
            typeof value === "string" ? JSON.parse(value) : value,
            item.children!,
          );
  }
  return result;
}
function dbError(error: unknown): Result["error"] {
  const message = error instanceof Error ? error.message : String(error);
  const code = /UNIQUE constraint failed/.test(message)
    ? "UNIQUE_VIOLATION"
    : /FOREIGN KEY constraint failed/.test(message)
      ? "FOREIGN_KEY_VIOLATION"
      : /column .*does not exist|no such column/.test(message)
        ? "COLUMN_NOT_FOUND"
        : /no such table/.test(message)
          ? "TABLE_NOT_FOUND"
          : /URL_LOCKED/.test(message)
            ? "URL_LOCKED"
            : "DATABASE_ERROR";
  return { code, message, details: message };
}

export class Query<T = Row[]> implements PromiseLike<Result<T>> {
  private operation: "select" | "insert" | "upsert" | "update" | "delete" =
    "select";
  private projection = "*";
  private returning = false;
  private payload: Row[] = [];
  private conflicts: string[] = [];
  private ignoreDuplicates = false;
  private filters: Fragment[] = [];
  private sorting: string[] = [];
  private take?: number;
  private offset = 0;
  private cardinality: "many" | "single" | "maybe" = "many";
  private countRequested = false;
  private head = false;
  private promise?: Promise<Result<T>>;
  constructor(
    private client: Client,
    private table: TableName,
    private scope: Scope,
  ) {}
  select(value = "*", options?: { count?: string; head?: boolean }) {
    this.projection = value;
    this.returning = true;
    this.countRequested = Boolean(options?.count);
    this.head = Boolean(options?.head);
    return this;
  }
  insert(values: Row | Row[]) {
    this.operation = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(
    values: Row | Row[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    this.insert(values);
    this.operation = "upsert";
    this.conflicts = (options?.onConflict ?? "id")
      .split(",")
      .map((v) => v.trim());
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates);
    return this;
  }
  update(values: Row) {
    this.operation = "update";
    this.payload = [values];
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  private compare(key: string, operator: string, value: unknown) {
    this.filters.push({
      sql: `${column(this.table, key)} ${operator} ?`,
      args: [encode(this.table, key, value)],
    });
    return this;
  }
  eq(key: string, value: unknown) {
    return value === null ? this.is(key, null) : this.compare(key, "=", value);
  }
  neq(key: string, value: unknown) {
    return this.compare(key, "!=", value);
  }
  gte(key: string, value: unknown) {
    return this.compare(key, ">=", value);
  }
  lte(key: string, value: unknown) {
    return this.compare(key, "<=", value);
  }
  gt(key: string, value: unknown) {
    return this.compare(key, ">", value);
  }
  lt(key: string, value: unknown) {
    return this.compare(key, "<", value);
  }
  ilike(key: string, value: string) {
    this.filters.push({
      sql: `${column(this.table, key)} LIKE ? COLLATE NOCASE`,
      args: [value],
    });
    return this;
  }
  is(key: string, value: null | boolean) {
    this.filters.push({
      sql: `${column(this.table, key)} IS ${value === null ? "NULL" : value ? "1" : "0"}`,
      args: [],
    });
    return this;
  }
  not(key: string, operator: string, value: null) {
    if (operator !== "is" || value !== null)
      throw new Error("Unsupported negation");
    this.filters.push({
      sql: `${column(this.table, key)} IS NOT NULL`,
      args: [],
    });
    return this;
  }
  in(key: string, values: unknown[]) {
    this.filters.push({
      sql: values.length
        ? `${column(this.table, key)} IN (${values.map(() => "?").join(",")})`
        : "0",
      args: values.map((v) => encode(this.table, key, v)),
    });
    return this;
  }
  search(keys: string[], term: string) {
    this.filters.push({
      sql: `(${keys.map((k) => `${column(this.table, k)} LIKE ? COLLATE NOCASE`).join(" OR ")})`,
      args: keys.map(() => `%${term}%`),
    });
    return this;
  }
  or(expression: string) {
    const fragments = splitTopLevel(expression).map((part) => {
      const match = /^(\w+)\.(eq|ilike|in)\.([\s\S]+)$/.exec(part);
      if (!match) throw new Error("Unsupported OR expression");
      const [, key, operator, value] = match;
      if (operator === "in") {
        if (!/^\(.*\)$/.test(value)) throw new Error("Invalid IN expression");
        const values = value.slice(1, -1).split(",");
        return {
          sql: `${column(this.table, key)} IN (${values.map(() => "?").join(",")})`,
          args: values,
        };
      }
      return {
        sql: `${column(this.table, key)} ${operator === "ilike" ? "LIKE" : "="} ?`,
        args: [value],
      };
    });
    this.filters.push({
      sql: `(${fragments.map((f) => f.sql).join(" OR ")})`,
      args: fragments.flatMap((f) => f.args),
    });
    return this;
  }
  order(key: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.sorting.push(
      `${column(this.table, key)} ${options?.ascending === false ? "DESC" : "ASC"}${options?.nullsFirst === undefined ? "" : options.nullsFirst ? " NULLS FIRST" : " NULLS LAST"}`,
    );
    return this;
  }
  limit(value: number) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Invalid limit");
    this.take = value;
    return this;
  }
  range(start: number, end: number) {
    if (!Number.isSafeInteger(start) || start < 0)
      throw new Error("Invalid offset");
    this.offset = start;
    return this.limit(Math.max(0, end - start + 1));
  }
  single() {
    this.cardinality = "single";
    return this as unknown as Query<Row>;
  }
  maybeSingle() {
    this.cardinality = "maybe";
    return this as unknown as Query<Row>;
  }
  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    this.promise ??= this.execute() as Promise<Result<T>>;
    return this.promise.then(onfulfilled, onrejected);
  }
  private async execute(): Promise<Result<Row[] | Row>> {
    try {
      if (this.scope === "public" && this.operation !== "select")
        throw new Error("Public writes are denied");
      const projections = parseProjection(this.table, this.projection);
      const filters = [...this.filters];
      if (this.scope === "public")
        filters.push({
          sql: publicFilter(this.table, quote(this.table)),
          args: [],
        });
      const where = filters.length
        ? ` WHERE ${filters.map((f) => `(${f.sql})`).join(" AND ")}`
        : "";
      const args = filters.flatMap((f) => f.args);
      let rows: Row[] = [],
        count: number | null = null;
      if (this.operation === "select") {
        if (this.countRequested)
          count = Number(
            (
              await this.client.execute({
                sql: `SELECT count(*) AS count FROM ${quote(this.table)}${where}`,
                args,
              })
            ).rows[0].count,
          );
        if (!this.head) {
          const sorting = this.sorting.length
            ? ` ORDER BY ${this.sorting.join(",")}`
            : "";
          const paging =
            this.take !== undefined
              ? ` LIMIT ${this.take} OFFSET ${this.offset}`
              : this.offset
                ? ` LIMIT -1 OFFSET ${this.offset}`
                : "";
          rows = (
            await this.client.execute({
              sql: `SELECT ${projectionSql(this.table, projections, quote(this.table), this.scope)} FROM ${quote(this.table)}${where}${sorting}${paging}`,
              args,
            })
          ).rows.map((r) => decode(this.table, r, projections));
        }
      } else {
        const statements: InStatement[] = [];
        if (this.operation === "insert" || this.operation === "upsert") {
          for (const row of this.payload) {
            const keys = Object.keys(row).filter((k) => row[k] !== undefined);
            const conflict =
              this.operation === "upsert"
                ? ` ON CONFLICT (${this.conflicts.map((k) => column(this.table, k)).join(",")}) ${
                    this.ignoreDuplicates
                      ? "DO NOTHING"
                      : keys.filter((k) => !this.conflicts.includes(k)).length
                        ? `DO UPDATE SET ${keys
                            .filter((k) => !this.conflicts.includes(k))
                            .map(
                              (k) =>
                                `${column(this.table, k)} = excluded.${column(this.table, k)}`,
                            )
                            .join(",")}`
                        : "DO NOTHING"
                  }`
                : "";
            statements.push({
              sql: `INSERT INTO ${quote(this.table)} (${keys.map((k) => column(this.table, k)).join(",")}) VALUES (${keys.map(() => "?").join(",")})${conflict} RETURNING *`,
              args: keys.map((k) => encode(this.table, k, row[k])),
            });
          }
        } else if (this.operation === "update") {
          const row = this.payload[0],
            keys = Object.keys(row).filter((k) => row[k] !== undefined);
          if (keys.length)
            statements.push({
              sql: `UPDATE ${quote(this.table)} SET ${keys.map((k) => `${column(this.table, k)} = ?`).join(",")}${where} RETURNING *`,
              args: [
                ...keys.map((k) => encode(this.table, k, row[k])),
                ...args,
              ],
            });
        } else
          statements.push({
            sql: `DELETE FROM ${quote(this.table)}${where} RETURNING *`,
            args,
          });
        const changes = statements.length
          ? await this.client.batch(statements, "write")
          : [];
        rows = changes
          .flatMap((r) => r.rows)
          .map((r) => decode(this.table, r, []));
        if (this.returning && rows.length) {
          // Re-read after triggers and hydrate requested relations inside the same
          // application contract. UUID and numeric id tables use this path.
          if (
            this.operation !== "delete" &&
            Object.hasOwn(columns(this.table), "id")
          ) {
            const ids = rows.map((r) => r.id);
            rows = (
              await this.client.execute({
                sql: `SELECT ${projectionSql(this.table, projections, quote(this.table), "admin")} FROM ${quote(this.table)} WHERE id IN (${ids.map(() => "?").join(",")})`,
                args: ids,
              })
            ).rows.map((r) => decode(this.table, r, projections));
          }
        }
        if (!this.returning) return { data: null, error: null, count: null };
      }
      if (this.cardinality !== "many") {
        if (
          rows.length > 1 ||
          (this.cardinality === "single" && rows.length !== 1)
        )
          throw new Error("Query expected a single row");
        return { data: rows[0] ?? null, error: null, count };
      }
      return { data: this.head ? null : rows, error: null, count };
    } catch (error) {
      return { data: null, error: dbError(error), count: null };
    }
  }
}

export function createDatabase(client: Client, scope: Scope = "admin") {
  return {
    from(table: string) {
      if (!Object.hasOwn(TABLES, table)) throw new Error("Unknown Core table");
      return new Query(client, table as TableName, scope);
    },
  };
}
