import re
from pathlib import Path

path = Path(r"D:\carser\HerbalClinic\HerbalClinic\p2-uidump.xml")
text = path.read_text(encoding="utf-8")
texts = [item for item in re.findall(r'text="([^"]+)"', text) if item]
descs = [item for item in re.findall(r'content-desc="([^"]+)"', text) if item]
print("TEXTS:")
for item in texts:
    print("-", item)
print("DESCS:")
for item in descs:
    print("-", item)
