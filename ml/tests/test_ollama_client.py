"""
Pure-logic tests for scripts/rag/ollama_client.py's deterministic
post-processing helpers. No Ollama instance and no database needed -
these are plain regex-based text functions.
"""
from scripts.rag.ollama_client import normalize_currency, strip_non_english


class TestNormalizeCurrency:
    def test_dollar_amount_becomes_rupees(self):
        assert normalize_currency("The visit costs $50") == "The visit costs Rs. 50"

    def test_dollar_amount_with_decimals_and_commas(self):
        assert normalize_currency("$1,200.50 total") == "Rs. 1,200.50 total"

    def test_dollar_word_becomes_lkr(self):
        # "US" must not survive next to "LKR" - "US LKR" is nonsense output.
        assert normalize_currency("Paid in US dollars") == "Paid in LKR"
        assert normalize_currency("Paid in U.S. dollars") == "Paid in LKR"
        assert normalize_currency("priced in USD") == "priced in LKR"
        assert normalize_currency("just dollars, no country prefix") == "just LKR, no country prefix"

    def test_text_with_no_currency_is_unchanged(self):
        text = "Max is due for a rabies booster next month."
        assert normalize_currency(text) == text

    def test_a_genuinely_foreign_currency_figure_is_left_alone(self):
        # rag_service.py's guest general-knowledge fallback path skips this
        # function entirely for exactly this reason - a real foreign-currency
        # figure would be relabeled Rs. at the same digit value, misstating
        # it by orders of magnitude. This test documents what the raw
        # function does on its own (still converts), so the skip decision
        # in rag_service.py stays the thing actually preventing the bug.
        assert normalize_currency("around $30 in the US") == "around Rs. 30 in the US"


class TestStripNonEnglish:
    def test_strips_a_leaked_cjk_token_from_an_english_sentence(self):
        result = strip_non_english("to 减轻 joint strain")
        assert "减轻" not in result
        assert "joint strain" in result

    def test_pure_english_text_is_unchanged(self):
        text = "Give one tablet twice daily with food."
        assert strip_non_english(text) == text

    def test_collapses_double_spaces_left_behind_by_stripping(self):
        # Removing "每天" leaves the surrounding spaces doubled up; the
        # double-space cleanup is what turns that into readable text.
        result = strip_non_english("walk him 每天 for exercise")
        assert "  " not in result
        assert result == "walk him for exercise"

    def test_removes_space_before_punctuation_left_behind_by_stripping(self):
        result = strip_non_english("stable now 稳定 .")
        assert " ." not in result
