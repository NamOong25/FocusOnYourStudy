import java.sql.DriverManager;

/** May only inspect/drop the disposable schema made by Test-ProductionProfile.ps1. */
class ProductionQaDatabase {
    public static void main(String[] args) throws Exception {
        String schema = System.getenv("PRODUCTION_QA_SCHEMA");
        if (schema == null || !schema.matches("qa_prod9f1_[a-f0-9]{32}") || args.length != 1)
            throw new IllegalArgumentException("Not an owned production QA schema");
        try (var connection = DriverManager.getConnection(System.getenv("DB_URL"), System.getenv("DB_USER"), System.getenv("DB_PASSWORD"));
             var sql = connection.createStatement()) {
            if (args[0].equals("drop")) {
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
                System.out.println("Removed owned production QA schema.");
            } else if (args[0].equals("verify")) {
                sql.execute("SET search_path TO " + schema);
                try (var rows = sql.executeQuery("SELECT (SELECT count(*) FROM app_users), (SELECT count(*) FROM semesters), (SELECT count(*) FROM flyway_schema_history WHERE success AND version IS NOT NULL)")) {
                    rows.next();
                    if (rows.getInt(1) != 1 || rows.getInt(2) != 1 || rows.getInt(3) != 16)
                        throw new IllegalStateException("Unexpected QA counts for users/semesters/migrations: "
                                + rows.getInt(1) + "/" + rows.getInt(2) + "/" + rows.getInt(3));
                }
                System.out.println("Verified persisted QA data and migrations in PostgreSQL.");
            } else throw new IllegalArgumentException("Unknown QA operation");
        }
    }
}
