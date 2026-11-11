import sys
import re

def main():
    try:
        with open(r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\5444aa10-3815-4e24-bbac-d47daabe4786\.system_generated\steps\463\content.md', 'r', encoding='utf-8') as f:
            content = f.read()

        # The content has unicode escapes like \u003c
        content = content.encode('utf-8').decode('unicode_escape')

        matches = re.findall(r'<a href="#[^"]+">(.*?)</a>', content, re.DOTALL)
        
        tips = []
        for text in matches:
            clean_text = re.sub(r'<[^>]+>', '', text).strip()
            clean_text = re.sub(r'\s+', ' ', clean_text)
            if re.match(r'^\d+\.', clean_text):
                tips.append(clean_text)
                
        # Deduplicate while preserving order
        seen = set()
        unique_tips = []
        for t in tips:
            if t not in seen:
                seen.add(t)
                unique_tips.append(t)
                
        out_path = r'f:\ai-study-language\.agents\skills\code-review\references\101-react-tips.md'
        with open(out_path, 'a', encoding='utf-8') as f:
            f.write('\n\n## Danh sách toàn bộ 101 Rules tham chiếu:\n')
            for item in unique_tips:
                f.write(f'- [ ] {item}\n')
                
        print(f"Added {len(unique_tips)} items.")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    main()
