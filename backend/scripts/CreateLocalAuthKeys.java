import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.KeyPairGenerator;
import java.util.Base64;

class CreateLocalAuthKeys {
    public static void main(String[] args) throws Exception {
        Path folder = Path.of(args[0]); Files.createDirectories(folder);
        Path privateFile = folder.resolve("private.pem"), publicFile = folder.resolve("public.pem");
        if (Files.exists(privateFile) && Files.exists(publicFile)) return;
        if (Files.exists(privateFile) || Files.exists(publicFile)) throw new IllegalStateException("Incomplete local JWT key pair; refusing to replace an existing key");
        var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
        var keys = generator.generateKeyPair();
        Files.writeString(privateFile, pem("PRIVATE KEY", keys.getPrivate().getEncoded()), StandardCharsets.US_ASCII, StandardOpenOption.CREATE_NEW);
        Files.writeString(publicFile, pem("PUBLIC KEY", keys.getPublic().getEncoded()), StandardCharsets.US_ASCII, StandardOpenOption.CREATE_NEW);
    }
    private static String pem(String label, byte[] data) {
        return "-----BEGIN " + label + "-----\n" + Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(data)
                + "\n-----END " + label + "-----\n";
    }
}
