"""Estimate function size from Linux wheels and app assets, without extracting them."""
import argparse
from pathlib import Path
from zipfile import ZipFile

MIB = 1024 * 1024
ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wheel_dir", type=Path, help="A clean folder of resolved Linux Python 3.12 wheels")
    parser.add_argument("--limit-mib", type=float, default=225)
    parser.add_argument("--runtime-reserve-mib", type=float, default=40,
                        help="Allowance for Vercel's runtime and packaging overhead (default: 40)")
    args = parser.parse_args()
    packages = []
    wheels = sorted(args.wheel_dir.glob("*.whl"))
    if not wheels:
        parser.error("No wheels found; download the complete runtime dependency set first.")
    for wheel in wheels:
        if "macosx" in wheel.name or "win_" in wheel.name:
            parser.error(f"Use Linux wheels for the deployment audit: {wheel.name}")
        with ZipFile(wheel) as archive:
            size = sum(entry.file_size for entry in archive.infolist())
        packages.append((size, wheel.name))
    dependency_bytes = sum(size for size, _ in packages)
    app_files = []
    for directory in (ROOT / "api", ROOT / "backend/app", ROOT / "backend/models"):
        app_files.extend(path for path in directory.rglob("*")
                         if path.is_file() and "__pycache__" not in path.parts)
    app_bytes = sum(path.stat().st_size for path in app_files)
    reserved_bytes = args.runtime_reserve_mib * MIB
    estimated_bytes = dependency_bytes + app_bytes + reserved_bytes
    print(f"Linux dependency wheels: {dependency_bytes / MIB:.2f} MiB ({len(wheels)} packages)")
    print(f"Backend source and model assets: {app_bytes / MIB:.2f} MiB")
    print(f"Runtime/packaging allowance: {args.runtime_reserve_mib:.2f} MiB")
    print(f"Estimated size with allowance: {estimated_bytes / MIB:.2f} / {args.limit_mib:.2f} MiB")
    for size, name in sorted(packages, reverse=True)[:6]:
        print(f"  {size / MIB:6.2f} MiB  {name}")
    print("This is a conservative local audit; Vercel's deployment build is authoritative.")
    return 0 if estimated_bytes <= args.limit_mib * MIB else 1


if __name__ == "__main__":
    raise SystemExit(main())
