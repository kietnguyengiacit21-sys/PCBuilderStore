package com.pc_builder_store.catalog.repository;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Turns a free-text storefront query into accent-insensitive search terms.
 *
 * <p>Text is folded to lowercase ASCII (Vietnamese diacritics removed, "đ" to "d") so
 * "chuot" matches "Chuột". Well-known Vietnamese/English product-type phrases such as
 * "card màn hình" or "bàn phím" are recognised as type hints; every other word must
 * appear somewhere in the product's searchable text. Text in double quotes is kept as one
 * exact phrase ({@code "ryzen 7"} does not match "Ryzen 5 7600"). Terms only ever contain
 * {@code [a-z0-9]} and spaces, so they carry no SQL LIKE wildcards.</p>
 */
final class CatalogSearchTerms {

    /** Hint target: either a product type code or an accessory sub-type. */
    record TypeHint(String productType, String accessoryType) {
        static TypeHint type(String code) {
            return new TypeHint(code, null);
        }

        static TypeHint accessory(String subtype) {
            return new TypeHint(null, subtype);
        }
    }

    /** A recognised phrase: matches the hinted types or the phrase text itself. */
    record PhraseTerm(String phrase, Set<TypeHint> hints) {
    }

    record Parsed(List<PhraseTerm> phrases, List<String> words) {
        boolean isEmpty() {
            return phrases.isEmpty() && words.isEmpty();
        }
    }

    static final int MAX_TERMS = 8;

    /** Vietnamese letters with diacritics (both cases), used for SQL TRANSLATE folding. */
    static final String ACCENTED_CHARACTERS;
    static final String FOLDED_CHARACTERS;

    private static final Map<String, List<TypeHint>> PHRASES = Map.ofEntries(
            Map.entry("card man hinh", List.of(TypeHint.type("GPU"))),
            Map.entry("card do hoa", List.of(TypeHint.type("GPU"))),
            Map.entry("vga", List.of(TypeHint.type("GPU"))),
            Map.entry("gpu", List.of(TypeHint.type("GPU"))),
            Map.entry("bo vi xu ly", List.of(TypeHint.type("CPU"))),
            Map.entry("vi xu ly", List.of(TypeHint.type("CPU"))),
            Map.entry("chip", List.of(TypeHint.type("CPU"))),
            Map.entry("cpu", List.of(TypeHint.type("CPU"))),
            Map.entry("bo mach chu", List.of(TypeHint.type("MOTHERBOARD"))),
            Map.entry("mainboard", List.of(TypeHint.type("MOTHERBOARD"))),
            Map.entry("bo nho", List.of(TypeHint.type("RAM"))),
            Map.entry("ram", List.of(TypeHint.type("RAM"))),
            Map.entry("o cung", List.of(TypeHint.type("STORAGE"))),
            Map.entry("luu tru", List.of(TypeHint.type("STORAGE"))),
            Map.entry("ssd", List.of(TypeHint.type("STORAGE"))),
            Map.entry("hdd", List.of(TypeHint.type("STORAGE"))),
            Map.entry("bo nguon", List.of(TypeHint.type("PSU"))),
            Map.entry("nguon", List.of(TypeHint.type("PSU"))),
            Map.entry("psu", List.of(TypeHint.type("PSU"))),
            Map.entry("vo case", List.of(TypeHint.type("CASE"))),
            Map.entry("vo may", List.of(TypeHint.type("CASE"))),
            Map.entry("thung may", List.of(TypeHint.type("CASE"))),
            Map.entry("case", List.of(TypeHint.type("CASE"))),
            Map.entry("tan nhiet", List.of(TypeHint.type("COOLER"))),
            Map.entry("tan nuoc", List.of(TypeHint.type("COOLER"))),
            Map.entry("quat", List.of(TypeHint.type("COOLER"))),
            Map.entry("may tinh bo", List.of(TypeHint.type("PC"))),
            Map.entry("may bo", List.of(TypeHint.type("PC"))),
            Map.entry("pc", List.of(TypeHint.type("PC"))),
            Map.entry("man hinh", List.of(TypeHint.accessory("monitor"))),
            Map.entry("monitor", List.of(TypeHint.accessory("monitor"))),
            Map.entry("ban phim", List.of(TypeHint.accessory("keyboard"))),
            Map.entry("keyboard", List.of(TypeHint.accessory("keyboard"))),
            Map.entry("chuot", List.of(TypeHint.accessory("mouse"))),
            Map.entry("mouse", List.of(TypeHint.accessory("mouse"))),
            Map.entry("tai nghe", List.of(TypeHint.accessory("headset"))),
            Map.entry("headset", List.of(TypeHint.accessory("headset"))),
            Map.entry("phu kien", List.of(TypeHint.type("ACCESSORY"))));

    /** Longest phrases first so "card man hinh" wins over "man hinh". */
    private static final List<String> PHRASES_BY_LENGTH = PHRASES.keySet().stream()
            .sorted(Comparator.comparingInt((String phrase) -> phrase.split(" ").length)
                    .reversed()
                    .thenComparing(Comparator.comparingInt(String::length).reversed()))
            .toList();

    static {
        String lower = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
        String upper = lower.toUpperCase(Locale.ROOT);
        String all = lower + upper;
        StringBuilder folded = new StringBuilder(all.length());
        for (int index = 0; index < all.length(); index++) {
            folded.append(fold(String.valueOf(all.charAt(index))));
        }
        ACCENTED_CHARACTERS = all;
        FOLDED_CHARACTERS = folded.toString();
    }

    private CatalogSearchTerms() {
    }

    /** Lowercase, strip diacritics, map đ to d, and keep only letters/digits separated by spaces. */
    static String fold(String text) {
        String decomposed = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
        return decomposed;
    }

    static String normalize(String query) {
        return fold(query).replaceAll("[^a-z0-9]+", " ").trim();
    }

    private static final java.util.regex.Pattern QUOTED = java.util.regex.Pattern.compile("\"([^\"]*)\"");

    static Parsed parse(String query) {
        String text = query == null ? "" : query;
        List<String> quoted = new ArrayList<>();
        java.util.regex.Matcher matcher = QUOTED.matcher(text);
        while (matcher.find()) {
            String phrase = normalize(matcher.group(1));
            if (!phrase.isEmpty() && !quoted.contains(phrase)) {
                quoted.add(phrase);
            }
        }
        String normalized = normalize(matcher.replaceAll(" "));
        if (normalized.isEmpty()) {
            List<String> exact = quoted.size() > MAX_TERMS ? quoted.subList(0, MAX_TERMS) : quoted;
            return new Parsed(List.of(), List.copyOf(exact));
        }
        List<String> tokens = new ArrayList<>(Arrays.asList(normalized.split(" ")));
        List<PhraseTerm> phrases = new ArrayList<>();

        // Whole phrases anywhere in the query.
        for (String phrase : PHRASES_BY_LENGTH) {
            List<String> phraseTokens = List.of(phrase.split(" "));
            int at = indexOf(tokens, phraseTokens);
            if (at >= 0) {
                phrases.add(new PhraseTerm(phrase, Set.copyOf(PHRASES.get(phrase))));
                tokens.subList(at, at + phraseTokens.size()).clear();
            }
        }

        // Autocomplete: the trailing words may be the start of a phrase ("ban p", "chu").
        for (int width = Math.min(2, tokens.size()); width >= 1; width--) {
            String tail = String.join(" ", tokens.subList(tokens.size() - width, tokens.size()));
            if (tail.length() < 2) {
                continue;
            }
            Set<TypeHint> hints = new LinkedHashSet<>();
            for (String phrase : PHRASES_BY_LENGTH) {
                if (phrase.startsWith(tail) && !phrase.equals(tail)) {
                    hints.addAll(PHRASES.get(phrase));
                }
            }
            if (!hints.isEmpty()) {
                phrases.add(new PhraseTerm(tail, Set.copyOf(hints)));
                tokens.subList(tokens.size() - width, tokens.size()).clear();
                break;
            }
        }

        List<String> words = new ArrayList<>(quoted);
        words.addAll(new LinkedHashSet<>(tokens));
        int room = Math.max(0, MAX_TERMS - phrases.size());
        if (words.size() > room) {
            words = words.subList(0, room);
        }
        return new Parsed(List.copyOf(phrases), List.copyOf(words));
    }

    private static int indexOf(List<String> tokens, List<String> phraseTokens) {
        outer:
        for (int start = 0; start + phraseTokens.size() <= tokens.size(); start++) {
            for (int offset = 0; offset < phraseTokens.size(); offset++) {
                if (!tokens.get(start + offset).equals(phraseTokens.get(offset))) {
                    continue outer;
                }
            }
            return start;
        }
        return -1;
    }
}
