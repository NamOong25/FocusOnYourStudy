import java.sql.*;

/** Restricted to the disposable schema made by Test-StudyPlanFlow.ps1. */
class StudyPlanQaDatabase {
    public static void main(String[] args) throws Exception {
        String schema = System.getenv("STUDY_PLAN_QA_SCHEMA");
        if (schema == null || !schema.matches("qa_planflow8a3c_[a-f0-9]{32}") || args.length != 1)
            throw new IllegalArgumentException("Not an isolated plan QA schema");
        try (var c = DriverManager.getConnection(System.getenv("DB_URL"), System.getenv("DB_USER"), System.getenv("DB_PASSWORD"));
             var s = c.createStatement()) {
            if (args[0].equals("drop")) {
                s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
                System.out.println("Disposable plan QA schema removed.");
            } else if (args[0].equals("verify")) {
                s.execute("SET search_path TO " + schema);
                try (var r = s.executeQuery("SELECT (SELECT count(*) FROM study_sessions), (SELECT count(*) FROM study_plan_applications), (SELECT count(*) FROM app_users)")) {
                    r.next();
                    if (r.getLong(1) < 1 || r.getLong(2) < 1 || r.getLong(3) < 2)
                        throw new IllegalStateException("Expected persisted QA data");
                    System.out.printf("PostgreSQL verified: %d study rows, %d receipts, %d synthetic accounts.%n", r.getLong(1), r.getLong(2), r.getLong(3));
                }
            } else throw new IllegalArgumentException("Unknown operation");
        }
    }
}
