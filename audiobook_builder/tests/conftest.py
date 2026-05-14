"""Shared pytest fixtures for audiobook_builder tests."""
import sys
import os
import pytest

# Ensure the parent package is importable when running pytest from tests/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def api_base():
    return "http://localhost:8000"
