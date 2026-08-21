"""
Pure-logic tests for scripts/rag/rag_service.py's imperial-unit stripping.
Importing rag_service pulls in retrieval.py/structured_query.py, which import
config.db_connection - but only as function references, never called at
import time, so this needs no live database (verified before writing these).
"""
from scripts.rag.rag_service import _strip_imperial_units


class TestStripImperialUnits:
    def test_strips_a_weight_conversion_aside(self):
        text = "A healthy adult Labrador weighs 29-36 kilograms (65-80 lbs)."
        result = _strip_imperial_units(text)
        assert "lbs" not in result
        assert "29-36 kilograms" in result

    def test_strips_a_fahrenheit_aside(self):
        text = "Normal temperature is 38.3-39.2°C (101-102.5°F)."
        result = _strip_imperial_units(text)
        assert "°F" not in result
        assert result == "Normal temperature is 38.3-39.2°C."

    def test_strips_an_inches_aside(self):
        text = "The incision is about 5 centimeters (2 inches) long."
        result = _strip_imperial_units(text)
        assert "inches" not in result
        assert "5 centimeters" in result

    def test_leaves_metric_only_text_unchanged(self):
        text = "Dosage is 5 mg per kilogram of body weight."
        assert _strip_imperial_units(text) == text

    def test_leaves_an_unrelated_parenthetical_untouched(self):
        # The regex requires a digit AND an imperial unit word inside the
        # parens - a plain-language explanation with neither must survive.
        text = "Prescribe amoxicillin (a broad-spectrum antibiotic) twice daily."
        assert _strip_imperial_units(text) == text

    def test_is_a_no_op_when_the_model_already_got_it_right(self):
        text = "The pup weighs about 3.5 kilograms at 8 weeks old."
        assert _strip_imperial_units(text) == text
