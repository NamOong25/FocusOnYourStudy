import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.HashSet;
import java.util.TreeSet;
import java.util.regex.Pattern;

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
                try (var rows = sql.executeQuery("SELECT (SELECT count(*) FROM app_users), (SELECT count(*) FROM semesters)")) {
                    rows.next();
                    if (rows.getInt(1) != 1 || rows.getInt(2) != 1)
                        throw new IllegalStateException("Unexpected QA counts for users/semesters: " + rows.getInt(1) + "/" + rows.getInt(2));
                }
                var migrationName = Pattern.compile("V([0-9]+(?:[._][0-9]+)*)__.+\\.sql");
                var bundled = new HashSet<String>();
                try (var files = Files.list(Path.of("src/main/resources/db/migration"))) {
                    for (var file : files.toList()) {
                        var match = migrationName.matcher(file.getFileName().toString());
                        if (match.matches()) bundled.add(match.group(1).replace('_', '.'));
                    }
                }
                var applied = new HashSet<String>();
                try (var rows = sql.executeQuery("SELECT version FROM flyway_schema_history WHERE success AND version IS NOT NULL")) {
                    while (rows.next()) applied.add(rows.getString("version"));
                }
                if (bundled.isEmpty() || !applied.equals(bundled))
                    throw new IllegalStateException("QA migrations differ from source. Expected: " + new TreeSet<>(bundled)
                            + "; applied: " + new TreeSet<>(applied));
                System.out.println("Verified persisted QA data and all " + applied.size() + " migrations in PostgreSQL.");
            } else throw new IllegalArgumentException("Unknown QA operation");
        }
    }
}
