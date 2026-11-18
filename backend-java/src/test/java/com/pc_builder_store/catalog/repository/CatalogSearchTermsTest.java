package com.pc_builder_store.catalog.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CatalogSearchTermsTest {

    @Test
    void foldsVietnameseDiacriticsAndCase() {
        assertEquals("chuot", CatalogSearchTerms.normalize("Chuột"));
        assertEquals("o cung ssd 1tb", CatalogSearchTerms.normalize("Ổ CỨNG / SSD 1TB"));
        assertEquals("nguon may tinh", CatalogSearchTerms.normalize("Nguồn máy tính"));
        assertEquals("dual rtx 4060", CatalogSearchTerms.normalize("  Dual  RTX-4060 "));
    }

    @Test
    void translateTablesAreAlignedOneToOne() {
        assertEquals(CatalogSearchTerms.ACCENTED_CHARACTERS.length(),
                CatalogSearchTerms.FOLDED_CHARACTERS.length());
        assertTrue(CatalogSearchTerms.FOLDED_CHARACTERS.matches("[a-z]+"));
        int index = CatalogSearchTerms.ACCENTED_CHARACTERS.indexOf('Đ');
        assertEquals('d', CatalogSearchTerms.FOLDED_CHARACTERS.charAt(index));
    }

    @Test
    void recognisesVietnameseTypePhrasesWithOrWithoutAccents() {
        CatalogSearchTerms.Parsed accented = CatalogSearchTerms.parse("chuột");
        CatalogSearchTerms.Parsed plain = CatalogSearchTerms.parse("chuot");
        assertEquals(accented, plain);
        assertEquals(Set.of(CatalogSearchTerms.TypeHint.accessory("mouse")),
                plain.phrases().get(0).hints());
        assertTrue(plain.words().isEmpty());
    }

    @Test
    void prefersLongestPhraseAndKeepsRemainingWords() {
        CatalogSearchTerms.Parsed parsed = CatalogSearchTerms.parse("Card màn hình RTX 4060");
        assertEquals(1, parsed.phrases().size());
        assertEquals("card man hinh", parsed.phrases().get(0).phrase());
        assertEquals(Set.of(CatalogSearchTerms.TypeHint.type("GPU")), parsed.phrases().get(0).hints());
        assertEquals(List.of("rtx", "4060"), parsed.words());
    }

    @Test
    void treatsTrailingPartialWordsAsPhrasePrefixWhileTyping() {
        CatalogSearchTerms.Parsed keyboard = CatalogSearchTerms.parse("bàn p");
        assertEquals("ban p", keyboard.phrases().get(0).phrase());
        assertEquals(Set.of(CatalogSearchTerms.TypeHint.accessory("keyboard")),
                keyboard.phrases().get(0).hints());

        CatalogSearchTerms.Parsed partialBrandWord = CatalogSearchTerms.parse("samsung");
        assertTrue(partialBrandWord.phrases().isEmpty());
        assertEquals(List.of("samsung"), partialBrandWord.words());
    }

    @Test
    void keepsQuotedTextAsOneExactPhrase() {
        CatalogSearchTerms.Parsed parsed = CatalogSearchTerms.parse("\"Ryzen 7\" gaming");
        assertEquals(List.of("ryzen 7", "gaming"), parsed.words());
        assertTrue(parsed.phrases().isEmpty());

        CatalogSearchTerms.Parsed onlyQuoted = CatalogSearchTerms.parse("\"Core i5\"");
        assertEquals(List.of("core i5"), onlyQuoted.words());
        assertTrue(CatalogSearchTerms.parse("\"%%\"").isEmpty());
    }

    @Test
    void producesNoLikeWildcardsAndCapsTermCount() {
        CatalogSearchTerms.Parsed parsed = CatalogSearchTerms.parse("100%_off ' OR 1=1 -- a b c d e f g h");
        assertTrue(parsed.words().stream().allMatch(word -> word.matches("[a-z0-9 ]+")));
        assertTrue(parsed.words().size() + parsed.phrases().size() <= CatalogSearchTerms.MAX_TERMS);
        assertTrue(CatalogSearchTerms.parse("%%% ___").isEmpty());
    }
}
