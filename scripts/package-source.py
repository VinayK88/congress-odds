from pathlib import Path
import zipfile
root = Path(__file__).resolve().parent.parent
with zipfile.ZipFile(root / 'dist/congress-odds-source.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in [root / 'README.md', root / 'MODEL_CARD.md', root / '.gitignore', *root.glob('scripts/*'), *root.glob('.github/workflows/*'), *root.glob('dist/*'), *root.glob('dist/data/*')]:
        if f.is_file() and f.suffix != '.zip':
            z.write(f, str(f.relative_to(root)))
print('Source download packaged.')
