package com.pc_builder_store.catalog.importer;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CatalogImportSafety {

    public static final String EXPECTED_DATABASE = "pc_builder_store_dev";
    public static final String REQUIRED_OPT_IN = "LOCAL_DEV_ONLY";
    private static final Pattern IPV4_ADDRESS = Pattern.compile(
            "^(?:0|[1-9][0-9]{0,2})(?:\\.(?:0|[1-9][0-9]{0,2})){3}$");
    private static final Pattern IPV6_ADDRESS = Pattern.compile("^[0-9A-Fa-f:.]+$");
    private static final Pattern LOCAL_DATABASE_URL = Pattern.compile(
            "^jdbc:postgresql://(localhost|127\\.0\\.0\\.1):([0-9]{1,5})/pc_builder_store_dev$");

    private CatalogImportSafety() {
    }

    public static void validateOptIn(String optIn) {
        if (!REQUIRED_OPT_IN.equals(optIn)) {
            throw new IllegalStateException(
                    "Catalog import requires --catalog.import.opt-in=" + REQUIRED_OPT_IN + ".");
        }
    }

    public static void validateJdbcUrl(String jdbcUrl) {
        Matcher matcher = jdbcUrl == null ? null : LOCAL_DATABASE_URL.matcher(jdbcUrl);
        if (matcher == null || !matcher.matches()) {
            throw new IllegalStateException(
                    "Catalog import only accepts a direct localhost connection to "
                            + EXPECTED_DATABASE + " with no extra URL parameters.");
        }
        int port = Integer.parseInt(matcher.group(2));
        if (port < 1 || port > 65535) {
            throw new IllegalStateException("Catalog import JDBC URL has an invalid port.");
        }
    }

    public static void validateConnectedDatabase(String databaseName, String serverAddress) {
        if (!EXPECTED_DATABASE.equals(databaseName)) {
            throw new IllegalStateException(
                    "Catalog import connected to " + databaseName + " instead of " + EXPECTED_DATABASE + ".");
        }
        if (serverAddress == null || serverAddress.isBlank()) {
            throw new IllegalStateException("Could not verify that the PostgreSQL server is local.");
        }

        String[] addressParts = serverAddress.split("/", -1);
        if (addressParts.length > 2 || addressParts[0].isBlank()) {
            throw invalidServerAddress(serverAddress);
        }

        InetAddress address = parseNumericAddress(addressParts[0], serverAddress);
        if (addressParts.length == 2) {
            if (!addressParts[1].matches("[0-9]+")) {
                throw invalidServerAddress(serverAddress);
            }
            int prefix;
            try {
                prefix = Integer.parseInt(addressParts[1]);
            } catch (NumberFormatException exception) {
                throw invalidServerAddress(serverAddress);
            }
            if (prefix != address.getAddress().length * Byte.SIZE) {
                throw new IllegalStateException(
                        "Catalog import rejected non-host PostgreSQL server address " + serverAddress + ".");
            }
        }

        if (!address.isLoopbackAddress()) {
            throw new IllegalStateException(
                    "Catalog import rejected non-local PostgreSQL server address " + serverAddress + ".");
        }
    }

    private static InetAddress parseNumericAddress(String address, String serverAddress) {
        if (IPV4_ADDRESS.matcher(address).matches()) {
            String[] octets = address.split("\\.");
            byte[] bytes = new byte[octets.length];
            for (int index = 0; index < octets.length; index++) {
                int octet = Integer.parseInt(octets[index]);
                if (octet > 255) {
                    throw invalidServerAddress(serverAddress);
                }
                bytes[index] = (byte) octet;
            }
            try {
                return InetAddress.getByAddress(bytes);
            } catch (UnknownHostException exception) {
                throw new IllegalStateException("Could not verify the PostgreSQL server address.", exception);
            }
        }

        if (address.indexOf(':') >= 0 && IPV6_ADDRESS.matcher(address).matches()) {
            try {
                InetAddress parsedAddress = InetAddress.getByName(address);
                if (parsedAddress instanceof Inet6Address) {
                    return parsedAddress;
                }
            } catch (UnknownHostException exception) {
                throw new IllegalStateException("Could not verify the PostgreSQL server address.", exception);
            }
        }
        throw invalidServerAddress(serverAddress);
    }

    private static IllegalStateException invalidServerAddress(String serverAddress) {
        return new IllegalStateException(
                "Could not verify the PostgreSQL server address " + serverAddress + ".");
    }
}
