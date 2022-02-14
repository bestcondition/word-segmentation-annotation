from pathlib import Path

root = Path(__file__).parent


def get_abs_path(rel_path):
    return root / rel_path
