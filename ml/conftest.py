"""
Shared pytest setup. Puts ml/ itself on sys.path so `scripts.*` imports
resolve regardless of the directory pytest is invoked from - mirrors the
sys.path handling test_setup.py already does for the same reason.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
