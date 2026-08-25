import sys, tarfile
from pathlib import Path

archive = Path(sys.argv[1])
destination = Path(sys.argv[2])
destination.mkdir(parents=True, exist_ok=True)
needed = {'vocals.fp16.onnx': 'vocals.onnx', 'accompaniment.fp16.onnx': 'instrumental.onnx'}
found = set()
with tarfile.open(archive, 'r:bz2') as tar:
    for member in tar.getmembers():
        name = Path(member.name).name
        if name in needed and member.isfile():
            source = tar.extractfile(member)
            if source is None:
                continue
            (destination / needed[name]).write_bytes(source.read())
            found.add(name)
missing = set(needed) - found
if missing:
    raise SystemExit('Missing expected files: ' + ', '.join(sorted(missing)))
print('Lite model files extracted successfully.')
