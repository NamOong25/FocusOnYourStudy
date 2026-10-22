import java.sql.DriverManager;

// Source-file launcher; credentials stay in environment variables, not argv.
class CreateLocalDatabase {
    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(args[0]);
        if (port < 1024 || port > 65535) throw new IllegalArgumentException("Invalid local port");
        String user = System.getenv("DB_USER"), password = System.getenv("DB_PASSWORD");
        try (var connection = DriverManager.getConnection("jdbc:postgresql://127.0.0.1:" + port
                + "/postgres?connectTimeout=3&socketTimeout=3", user, password);
             var statement = connection.createStatement()) {
            boolean present;
            try (var result = statement.executeQuery("SELECT 1 FROM pg_database WHERE datname='focus_study'")) {
                present = result.next();
            }
            if (!present) statement.execute("CREATE DATABASE focus_study ENCODING 'UTF8'");
        }
    }
}
