// PGlite → postgres.Sql adapter
// Wraps PGlite's query interface to provide the tagged template literal API
// that the ai-pipeline's retriever expects (postgres.Sql compatible).

import type { PGlite } from "@electric-sql/pglite";

/**
 * A compiled SQL fragment with parameter values.
 * Fragments can be nested inside other fragments via template interpolation.
 */
class SqlFragment {
  readonly strings: readonly string[];
  readonly values: readonly unknown[];

  constructor(strings: readonly string[], values: readonly unknown[]) {
    this.strings = strings;
    this.values = values;
  }
}

/**
 * Compile a SqlFragment tree into a flat parameterized query.
 * Nested fragments are inlined and their parameters are renumbered.
 */
function compile(
  fragment: SqlFragment,
  startParam: number = 1,
): { text: string; params: unknown[]; nextParam: number } {
  const params: unknown[] = [];
  let text = "";
  let paramIndex = startParam;

  for (let i = 0; i < fragment.strings.length; i++) {
    text += fragment.strings[i];

    if (i < fragment.values.length) {
      const value = fragment.values[i];

      if (value instanceof SqlFragment) {
        const nested = compile(value, paramIndex);
        text += nested.text;
        params.push(...nested.params);
        paramIndex = nested.nextParam;
      } else {
        params.push(value);
        text += `$${paramIndex}`;
        paramIndex++;
      }
    }
  }

  return { text, params, nextParam: paramIndex };
}

/**
 * A SqlFragment that can be awaited to execute against PGlite.
 * Implements the thenable protocol so `await sql\`...\`` resolves to rows.
 */
class ExecutableSqlFragment extends SqlFragment {
  private readonly client: PGlite;

  constructor(
    client: PGlite,
    strings: readonly string[],
    values: readonly unknown[],
  ) {
    super(strings, values);
    this.client = client;
  }

  then<TResult1 = unknown[], TResult2 = never>(
    onfulfilled?:
      | ((value: unknown[]) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    const { text, params } = compile(this);
    return this.client
      .query(text, params)
      .then((result) => result.rows as unknown[])
      .then(onfulfilled, onrejected);
  }
}

/**
 * Create a tagged template function that wraps a PGlite client to behave like
 * postgres.Sql from the `postgres` package.
 *
 * Supports:
 * - Parameterized queries: `sql\`SELECT * FROM t WHERE id = ${id}\``
 * - Nested fragments:      `sql\`SELECT * ${cond ? sql\`WHERE x = ${v}\` : sql\`\`}\``
 * - Empty fragments:       `sql\`\`` (produces no SQL, no params)
 * - Awaitable results:     `const rows = await sql\`...\`` returns row array
 */
export function createPgliteSqlAdapter(client: PGlite): unknown {
  function sql(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): ExecutableSqlFragment {
    return new ExecutableSqlFragment(client, Array.from(strings), values);
  }

  return sql;
}
