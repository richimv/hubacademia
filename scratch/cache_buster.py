import os
import re
import uuid

# Base directory for public HTML files
d = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src', 'presentation', 'public')
version = uuid.uuid4().hex[:8]

print(f"Busting cache with version: {version}")
print(f"Target directory: {d}")

for f in os.listdir(d):
    if f.endswith('.html'):
        p = os.path.join(d, f)
        try:
            with open(p, 'r', encoding='utf-8') as file:
                c = file.read()
            
            # 1. Replace CSS references
            css_regex = re.compile(r'(href="(?:\/)?css\/[^"]+\.css)(?:\?v=[^"]+)?(?=")')
            c = css_regex.sub(rf'\1?v={version}', c)
            
            # 2. Replace JS references
            js_regex = re.compile(r'(src="(?:\/)?js\/[^"]+\.js)(?:\?v=[^"]+)?(?=")')
            c = js_regex.sub(rf'\1?v={version}', c)
            
            with open(p, 'w', encoding='utf-8') as file:
                file.write(c)
            print(f"✅ Updated {f} successfully.")
        except Exception as e:
            print(f"❌ Error updating {f}: {e}")
