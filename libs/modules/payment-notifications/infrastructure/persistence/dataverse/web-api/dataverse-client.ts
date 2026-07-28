export type DataverseOperation =
  | {
      readonly type: 'create';
      readonly entitySet: string;
      readonly record: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'update';
      readonly entitySet: string;
      readonly id: string;
      readonly record: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'deleteWhere';
      readonly entitySet: string;
      readonly filter: Readonly<Record<string, unknown>>;
    };

export interface DataverseClient {
  create(
    entitySet: string,
    record: Readonly<Record<string, unknown>>,
  ): Promise<void>;

  update(
    entitySet: string,
    id: string,
    record: Readonly<Record<string, unknown>>,
  ): Promise<void>;

  deleteWhere(
    entitySet: string,
    filter: Readonly<Record<string, unknown>>,
  ): Promise<void>;

  findOne(
    entitySet: string,
    id: string,
  ): Promise<Readonly<Record<string, unknown>> | null>;

  query(
    entitySet: string,
    filter: Readonly<Record<string, unknown>>,
  ): Promise<readonly Readonly<Record<string, unknown>>[]>;

  executeAtomic(operations: readonly DataverseOperation[]): Promise<void>;
}
