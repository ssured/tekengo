import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { JSONObject } from "../utils/hash";

export class Db {
  #db: BetterSqlite3.Database;
  constructor(file = "data.db") {
    this.#db = new Database(file, {});

    setupSQLCommands.map((s) => this.#db.prepare(s).run());
  }

  persist(sha: string, json: JSONObject) {
    this.#db
      .prepare<[string, string]>(
        "INSERT OR IGNORE INTO nodes (sha, json) VALUES (?,?);"
      )
      .run(sha, JSON.stringify(json));
  }

  allNodes() {
    return this.#db.prepare<[]>("SELECT * FROM nodes;").all();
  }

  read(sha: string) {
    const result = this.#db
      .prepare<[string]>("SELECT json FROM nodes WHERE sha = ?;")
      .get(sha);
    return result && JSON.parse(result.json);
  }

  inverseProps(sha: string): string[] {
    return this.#db
      .prepare<[string]>("SELECT DISTINCT p FROM edges WHERE t = ?;")
      .all(sha)
      .map(({ p }) => p);
  }

  inverseProp(sha: string, prop: string): string[] {
    return this.#db
      .prepare<[string, string]>("SELECT s FROM edges WHERE t = ? AND p = ?;")
      .all(sha, prop)
      .map(({ s }) => s);
  }

  //   read(subj: string): { p: string; o: string; t: number }[];
  //   read(subj: string, prop: string): { o: string; t: number } | undefined;
  //   read(subj: string, prop?: string) {
  //     return prop == null
  //       ? this.db.prepare(`SELECT p, o, t FROM state WHERE s = ?`).get(subj)
  //       : this.db
  //           .prepare(`SELECT o, t FROM state WHERE s = ? AND p = ?`)
  //           .get(subj, prop);
  //   }

  //   write(
  //     state: number,
  //     delta: { [key in string]: { [key in string]: string } }
  //   ) {
  //     const insertIntoSource = this.db.prepare(
  //       "INSERT INTO source (t, delta) VALUES (?,?);"
  //     );

  //     insertIntoSource.run(state, JSON.stringify(delta));

  /**
   * https://stackoverflow.com/questions/19337029/insert-if-not-exists-statement-in-sqlite
   * INSERT OR IGNORE INTO nodes(sha, json) VALUES("123", "{}")
   */

  //   }
}

const setupSQLCommands = [
  `
  -- DROP TABLE IF EXISTS nodes;
  -- DROP TABLE IF EXISTS edges;
  
  CREATE TABLE IF NOT EXISTS nodes (
      sha TEXT NOT NULL,
      json TEXT NOT NULL,
      PRIMARY KEY (sha),
      UNIQUE(sha, json)
  );`,

  `CREATE TABLE IF NOT EXISTS edges (
    s TEXT NOT NULL, 
    p TEXT NOT NULL,
    t TEXT NOT NULL, 
    PRIMARY KEY (s, p, t)
  );`,

  //   `CREATE INDEX IF NOT EXISTS nodes_idx_sha ON nodes(sha);`,
  //   `CREATE INDEX IF NOT EXISTS edges_idx_source ON edges(source);`,
  //   `CREATE INDEX IF NOT EXISTS edges_idx_target ON edges(target);`,

  /**
   * Het is mogelijk om een index op een expressie te maken
   * create index test_extract_vx_idx on test(json_extract(data, '$.vx'))
   * https://www.delphitools.info/2021/06/17/sqlite-as-a-no-sql-database/
   */

  `CREATE TRIGGER IF NOT EXISTS update_edges_on_insert
    AFTER INSERT ON nodes
  BEGIN
    INSERT INTO edges(s, p, t)
      SELECT
        new.sha s,
        entry.key p,
        json_extract(entry.value, '$[0]') t
      FROM
        json_each(new.json) as entry
      WHERE
        entry.type = 'array' AND json_type(entry.value, '$[0]') = 'text';
  END;
  `,
];
