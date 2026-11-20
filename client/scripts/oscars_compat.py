"""Run oscars.py / oscars_stats.py analysis functions on a CSV without their module-level code.

Usage: oscars_compat.py <csv> <oscars_dir>
Only import nodes and the two named function definitions are executed (via ast).
"""
import ast
import sys
from pathlib import Path

WANTED = {"print_top3_from_nominations", "calculate_stats"}


def load(path, namespace):
    tree = ast.parse(Path(path).read_text(encoding="utf-8"), filename=str(path))
    keep = [n for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom)) or (isinstance(n, ast.FunctionDef) and n.name in WANTED)]
    exec(compile(ast.Module(body=keep, type_ignores=[]), str(path), "exec"), namespace)


def main():
    csv_path, oscars_dir = sys.argv[1], Path(sys.argv[2])
    ns = {}
    load(oscars_dir / "oscars.py", ns)
    load(oscars_dir / "oscars_stats.py", ns)
    ns["print_top3_from_nominations"](csv_path)
    ns["calculate_stats"](csv_path)


main()
