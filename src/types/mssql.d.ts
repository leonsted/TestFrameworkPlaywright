declare module 'mssql' {
  interface MssqlModule {
    ConnectionPool: new (config: Record<string, unknown>) => {
      connected: boolean;
      request(): {
        input(name: string, type: unknown, value: string): unknown;
        query<T>(command: string): Promise<{ recordset?: T[] }>;
      };
      close(): Promise<void>;
    };
    NVarChar: unknown;
  }

  const mssql: MssqlModule;
  export default mssql;
}
